import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DesignCanvas } from "@/components/studio/DesignCanvas";
import { docMergeData, orgMergeData, type DocRow } from "@/components/studio/merge-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { download, pageCount, toPdfBytes, type DesignDoc } from "@/design-engine";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMessage, kickWorker, looksLikeEmail, normPhone } from "@/lib/comms";
import { organizationQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/letters/$id")({
  component: DocumentComposer,
});

type Template = { id: string; name: string; kind: string; design: DesignDoc };
type Doc = DocRow & { organization_id: string; template_id: string | null; pdf_path: string | null; created_by: string | null };

function DocumentComposer() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const { can, user } = useAuth();
  const qc = useQueryClient();
  const { data: org } = useSuspenseQuery(organizationQuery());
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<Partial<Doc> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const docQ = useQuery({
    queryKey: ["admin", "docs_documents", tenant.organization_id, id],
    queryFn: async () => { const { data, error } = await supabase.from("docs_documents").select("*").eq("id", id).single(); if (error) throw error; return data as unknown as Doc; },
  });
  const templates = useQuery({
    queryKey: ["admin", "docs_templates", tenant.organization_id, "designs"],
    queryFn: async () => { const { data, error } = await supabase.from("docs_templates").select("id,name,kind,design").or(`organization_id.eq.${tenant.organization_id},organization_id.is.null`).eq("status", "active").order("name"); if (error) throw error; return (data ?? []) as unknown as Template[]; },
  });
  const dispatches = useQuery({
    queryKey: ["admin", "docs_dispatches", id],
    queryFn: async () => { const { data } = await supabase.from("docs_dispatches").select("*").eq("document_id", id).order("sent_at", { ascending: false }); return (data ?? []) as { id: string; channel: string; to_name: string | null; to_contact: string | null; sent_at: string; status: string; note: string | null }[]; },
  });

  useEffect(() => { if (docQ.data) setForm(docQ.data); }, [docQ.data]);

  const d = docQ.data;
  const editable = !!d && d.status === "draft" && can("docs.letter.create") && (d.created_by === user?.id || can("docs.letter.approve"));
  const template = templates.data?.find((t) => t.id === (form?.template_id ?? d?.template_id));
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const merge = useMemo(() => (form ? { ...orgMergeData(tenant, org), ...docMergeData({ ...(d as DocRow), ...(form as DocRow) }, siteUrl) } : {}), [form, d, tenant, org, siteUrl]);
  const pages = template ? pageCount(template.design, merge) : 0;
  const fieldDefs = template?.design.fields ?? [];

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const patch = { title: form.title, template_id: form.template_id ?? null, doc_date: form.doc_date, subject: form.subject, recipient: form.recipient, body: form.body, fields: form.fields, signatories: form.signatories };
      const { error } = await supabase.from("docs_documents").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin", "docs_documents"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function rpc(fn: "k1_submit_document" | "k1_decide_document" | "k1_issue_document" | "k1_cancel_document", args: Record<string, unknown>) {
    setBusy(fn);
    try {
      if (fn !== "k1_issue_document" && editable) await save.mutateAsync();
      const { error } = await supabase.rpc(fn, { p_id: id, ...args } as never);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["admin", "docs_documents"] });
      toast.success("Done");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }

  async function makePdf(upload: boolean) {
    if (!template || !d) return;
    setBusy("pdf");
    try {
      const bytes = await toPdfBytes(template.design, merge);
      const name = `${(d.ref_no ?? d.title).replace(/[^\w.-]+/g, "_")}.pdf`;
      if (upload) {
        const path = `${tenant.organization_id}/${d.id}.pdf`;
        const { error } = await supabase.storage.from("documents").upload(path, new Blob([bytes as BlobPart], { type: "application/pdf" }), { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        const { error: e2 } = await supabase.rpc("k1_set_document_pdf", { p_id: d.id, p_path: path });
        if (e2) throw e2;
        await qc.invalidateQueries({ queryKey: ["admin", "docs_documents"] });
        toast.success("PDF stored with the document");
      }
      download(new Blob([bytes as BlobPart], { type: "application/pdf" }), name);
    } catch (e) { toast.error(e instanceof Error ? e.message : "PDF failed"); } finally { setBusy(null); }
  }

  const logDispatch = useMutation({
    mutationFn: async (channel: string) => {
      if (!d) return;
      const { error } = await supabase.from("docs_dispatches").insert({ organization_id: tenant.organization_id, document_id: d.id, channel, to_name: (d.recipient as { name?: string }).name ?? null, to_contact: (d.recipient as { phone?: string; email?: string }).phone ?? (d.recipient as { email?: string }).email ?? null } as never);
      if (error) throw error;
      await supabase.from("docs_register").insert({ organization_id: tenant.organization_id, direction: "outward", entry_date: new Date().toISOString().slice(0, 10), ref_no: d.ref_no, from_to: (d.recipient as { name?: string }).name ?? "—", subject: d.subject ?? d.title, document_id: d.id, note: `via ${channel}` } as never);
    },
    onSuccess: () => { toast.success("Dispatch recorded"); qc.invalidateQueries({ queryKey: ["admin", "docs_dispatches", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Queue the issued PDF to the recipient over WhatsApp or email through the communication engine. */
  async function sendDoc(kind: "whatsapp" | "email") {
    if (!d || !template) return;
    const r = d.recipient as { name?: string; phone?: string; email?: string };
    const raw = kind === "email" ? (r.email ?? (looksLikeEmail(r.phone ?? "") ? r.phone : "")) : (looksLikeEmail(r.phone ?? "") ? "" : r.phone);
    const to = prompt(kind === "email" ? "Send to email" : "Send to WhatsApp number", raw ?? "");
    if (!to) return;
    setBusy("send");
    try {
      let path = d.pdf_path;
      if (!path) {
        const bytes = await toPdfBytes(template.design, merge);
        path = `${tenant.organization_id}/${d.id}.pdf`;
        const { error } = await supabase.storage.from("documents").upload(path, new Blob([bytes as BlobPart], { type: "application/pdf" }), { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        const { error: e2 } = await supabase.rpc("k1_set_document_pdf", { p_id: d.id, p_path: path });
        if (e2) throw e2;
      }
      const orgName = tenant.name;
      const subject = d.subject ?? d.title;
      const body = kind === "email"
        ? `Dear ${r.name ?? "Sir/Madam"},\n\nPlease find attached ${subject}${d.ref_no ? ` (Ref. ${d.ref_no})` : ""} from ${orgName}.${d.verify_code ? `\nVerify online: ${siteUrl}/verify/${d.verify_code}` : ""}\n\nRegards,\n${orgName}`
        : `${orgName}\n${subject}${d.ref_no ? `\nRef. ${d.ref_no}` : ""}${d.verify_code ? `\nVerify: ${siteUrl}/verify/${d.verify_code}` : ""}`;
      await enqueueMessage({ org: tenant.organization_id, kind, to: kind === "email" ? to.trim() : normPhone(to), name: r.name ?? null, subject: kind === "email" ? `${subject}${d.ref_no ? ` · ${d.ref_no}` : ""}` : null, body, media: [{ type: "document", bucket: "documents", path, filename: `${(d.ref_no ?? d.title).replace(/[^\w.-]+/g, "_")}.pdf` }], refTable: "docs_documents", refId: d.id });
      await supabase.from("docs_dispatches").insert({ organization_id: tenant.organization_id, document_id: d.id, channel: kind, to_name: r.name ?? null, to_contact: kind === "email" ? to.trim() : normPhone(to), note: "queued via messaging engine" } as never);
      await supabase.from("docs_register").insert({ organization_id: tenant.organization_id, direction: "outward", entry_date: new Date().toISOString().slice(0, 10), ref_no: d.ref_no, from_to: r.name ?? to, subject, document_id: d.id, note: `via ${kind}` } as never);
      kickWorker();
      toast.success("Queued — it is sent within a minute; see Messaging for the delivery status.");
      qc.invalidateQueries({ queryKey: ["admin", "docs_dispatches", id] });
      qc.invalidateQueries({ queryKey: ["admin", "docs_documents"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not queue"); } finally { setBusy(null); }
  }

  if (!d || !form) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (k: keyof Doc, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const setField = (k: string, v: string) => setForm((f) => ({ ...f, fields: { ...((f?.fields as Record<string, unknown>) ?? {}), [k]: v } }));
  const rec = (form.recipient ?? {}) as Record<string, string>;
  const setRec = (k: string, v: string) => set("recipient", { ...rec, [k]: v });
  const sig = (form.signatories?.[0] ?? {}) as { name?: string; designation?: string };
  const reviewNote = (d.fields as Record<string, unknown>)["_review_note"] as string | undefined;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{d.kind.replace(/_/g, " ")} · {d.status.replace(/_/g, " ")}{d.ref_no ? ` · ${d.ref_no}` : ""}</p>
          <h2 className="font-display text-xl font-semibold">{d.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? <Button size="sm" variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>Save draft</Button> : null}
          {editable && d.status === "draft" ? <Button size="sm" variant="outline" onClick={() => rpc("k1_submit_document", {})} disabled={!!busy}>Submit for approval</Button> : null}
          {d.status === "pending_approval" && can("docs.letter.approve") ? (<>
            <Button size="sm" variant="outline" onClick={() => rpc("k1_decide_document", { p_approve: false, p_note: prompt("What should change?") ?? "" })} disabled={!!busy}>Send back</Button>
            <Button size="sm" onClick={() => rpc("k1_decide_document", { p_approve: true })} disabled={!!busy}>Approve</Button>
          </>) : null}
          {(d.status === "approved" || d.status === "draft" || d.status === "pending_approval") && can("docs.letter.approve") ? (
            <Button size="sm" onClick={() => { if (confirm("Issue this document? It gets a reference number and QR code, and can no longer be edited.")) rpc("k1_issue_document", {}); }} disabled={!!busy}>Issue (assign number)</Button>
          ) : null}
          {d.status === "issued" ? (<>
            <Button size="sm" onClick={() => makePdf(true)} disabled={!!busy || !template}>PDF (store + download)</Button>
            {can("docs.letter.approve") ? <Button size="sm" variant="ghost" onClick={() => { const r = prompt("Reason for cancellation"); if (r) rpc("k1_cancel_document", { p_reason: r }); }}>Cancel document</Button> : null}
          </>) : <Button size="sm" variant="ghost" onClick={() => makePdf(false)} disabled={!!busy || !template}>Preview PDF</Button>}
          <Button asChild size="sm" variant="ghost"><Link to="/admin/letters">Close</Link></Button>
        </div>
      </div>
      {reviewNote ? <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Sent back with note: {reviewNote}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <fieldset disabled={!editable} className="space-y-3 text-sm">
          <L label="Template"><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={form.template_id ?? ""} onChange={(e) => set("template_id", e.target.value || null)}>
            <option value="">— choose —</option>
            {(templates.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
          </select></L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Title (internal / certificate type / receipt title)"><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></L>
            <L label="Date"><Input type="date" value={form.doc_date ?? ""} onChange={(e) => set("doc_date", e.target.value)} /></L>
          </div>
          <L label="Subject"><Input value={form.subject ?? ""} onChange={(e) => set("subject", e.target.value)} /></L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Recipient name"><Input value={rec["name"] ?? ""} onChange={(e) => setRec("name", e.target.value)} /></L>
            <L label="Recipient designation"><Input value={rec["designation"] ?? ""} onChange={(e) => setRec("designation", e.target.value)} /></L>
            <L label="Recipient organization"><Input value={rec["organization"] ?? ""} onChange={(e) => setRec("organization", e.target.value)} /></L>
            <L label="Recipient phone / email"><Input value={rec["phone"] ?? ""} onChange={(e) => setRec("phone", e.target.value)} /></L>
            <L label="Recipient address" ><Input value={rec["address"] ?? ""} onChange={(e) => setRec("address", e.target.value)} /></L>
          </div>
          <L label="Body (supports **bold**; flows onto more pages automatically)"><Textarea rows={10} value={form.body ?? ""} onChange={(e) => set("body", e.target.value)} /></L>
          {fieldDefs.filter((f) => !f.key.startsWith("recipient.") && !f.key.startsWith("signatory.")).length ? (
            <div className="grid grid-cols-2 gap-2">
              {fieldDefs.filter((f) => !f.key.startsWith("recipient.") && !f.key.startsWith("signatory.")).map((f) => (
                <L key={f.key} label={`${f.label}${f.label_hi ? ` · ${f.label_hi}` : ""}`}>
                  <Input value={((form.fields as Record<string, string>)?.[f.key]) ?? ""} placeholder={f.sample ?? ""} onChange={(e) => setField(f.key, e.target.value)} />
                </L>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <L label="Signatory name"><Input value={sig.name ?? ""} onChange={(e) => set("signatories", [{ ...sig, name: e.target.value }])} /></L>
            <L label="Signatory designation"><Input value={sig.designation ?? ""} onChange={(e) => set("signatories", [{ ...sig, designation: e.target.value }])} /></L>
          </div>
        </fieldset>

        <div className="space-y-2">
          {template ? (
            <>
              <div className="overflow-auto rounded-lg bg-secondary/50 p-2">
                <DesignCanvas doc={template.design} page={page} width={520} data={merge} />
              </div>
              {pages > 1 ? (
                <div className="flex gap-1 text-xs">{Array.from({ length: pages }).map((_, i) => <button key={i} type="button" onClick={() => setPage(i)} className={`rounded px-2 py-1 ${page === i ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>Page {i + 1}</button>)}</div>
              ) : null}
            </>
          ) : <p className="text-sm text-muted-foreground">Choose a template to preview.</p>}
        </div>
      </div>

      {d.status === "issued" ? (
        <section className="space-y-2 text-sm">
          <h3 className="font-display font-semibold">Dispatch</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => sendDoc("whatsapp")} disabled={!can("docs.letter.dispatch") || !!busy || !template}>Send by WhatsApp</Button>
            <Button size="sm" onClick={() => sendDoc("email")} disabled={!can("docs.letter.dispatch") || !!busy || !template}>Send by email</Button>
            {["hand", "post", "courier"].map((c) => <Button key={c} size="sm" variant="outline" onClick={() => logDispatch.mutate(c)} disabled={!can("docs.letter.dispatch")}>Record: {c}</Button>)}
            {d.verify_code ? <span className="self-center text-xs text-muted-foreground">Verify link: {siteUrl}/verify/{d.verify_code}</span> : null}
          </div>
          <ul className="text-xs text-muted-foreground">
            {(dispatches.data ?? []).map((x) => <li key={x.id}>{new Date(x.sent_at).toLocaleString("en-IN")} · {x.channel} · {x.to_name ?? ""} {x.to_contact ?? ""} · {x.status}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">WhatsApp/email sends use the channels set up under Messaging; the PDF is stored with the document and attached automatically.</p>
        </section>
      ) : null}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
