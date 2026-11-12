import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageField } from "@/components/admin/ImageField";
import { MarkupEditor } from "@/components/admin/MarkupEditor";
import { tx } from "@/components/admin/adminText";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type AdminOption = string | { value: string; label: string };

export type AdminField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "checkbox" | "url" | "select" | "image" | "markup" | "json";
  hint?: string;
  required?: boolean;
  full?: boolean;
  /** Allowed values for a select field; first option is used as the default. */
  options?: AdminOption[];
  /** Select whose options come from another table of the same organization (value = id). */
  fk?: { table: string; label: string; orderBy?: string };
  /** Show this field only when creating / only when editing. */
  only?: "create" | "edit";
};

function optValue(o: AdminOption) { return typeof o === "string" ? o : o.value; }
function optLabel(o: AdminOption) { return typeof o === "string" ? o.replace(/_/g, " ") : o.label; }

/** Options for a foreign-key select, scoped to the current organization. */
function useFkOptions(fields: AdminField[], organizationId: string) {
  const fks = fields.filter((f) => f.fk);
  return useQuery({
    queryKey: ["admin-fk", organizationId, fks.map((f) => f.fk!.table).join(",")],
    enabled: fks.length > 0,
    queryFn: async () => {
      const out: Record<string, AdminOption[]> = {};
      for (const f of fks) {
        const { data } = await supabase
          .from(f.fk!.table as any)
          .select(`id,${f.fk!.label}`)
          .eq("organization_id", organizationId)
          .order(f.fk!.orderBy ?? f.fk!.label)
          .limit(500);
        out[f.key] = ((data ?? []) as any[]).map((r) => ({ value: r.id, label: String(r[f.fk!.label] ?? r.id) }));
      }
      return out;
    },
  });
}

export type AdminColumn = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

/** Supabase errors are plain objects, not Error instances — read their message. */
function errText(e: unknown, fallback: string) {
  if (e && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function CrudPage({
  table,
  title,
  description,
  columns,
  fields,
  orderBy = "created_at",
  ascending = false,
  slugFrom,
  defaults = {},
  filter,
  onRowClick,
  extraActions,
  createdBy,
  toolbar,
  rowClass,
}: {
  table: string;
  title: string;
  description?: string;
  columns: AdminColumn[];
  fields: AdminField[];
  orderBy?: string;
  ascending?: boolean;
  slugFrom?: string;
  defaults?: Record<string, unknown>;
  /** Extra equality filter on the list (e.g. { meeting_id }). Also merged into new rows. */
  filter?: Record<string, string>;
  onRowClick?: (row: any) => void;
  extraActions?: (row: any) => React.ReactNode;
  /** Set created_by = current user on insert (tables whose author policies need it). */
  createdBy?: boolean;
  /** Extra content rendered above the table (filters, counters). */
  toolbar?: React.ReactNode;
  rowClass?: (row: any) => string;
}) {
  const qc = useQueryClient();
  const { lang } = useLang();
  const L = lang === "hi";
  const tenant = useTenant();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const fkOptions = useFkOptions(fields, tenant.organization_id);
  const [limit, setLimit] = useState(200);
  const list = useQuery({
    queryKey: ["admin", table, tenant.organization_id, filter ?? null, limit],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      let q = supabase
        .from(table as any)
        .select("*")
        .eq("organization_id", tenant.organization_id);
      for (const [k, v] of Object.entries(filter ?? {})) q = q.eq(k, v);
      const { data, error } = await q.order(orderBy, { ascending }).limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload: Record<string, any> = { ...defaults, ...(editing?.id ? {} : filter ?? {}), ...values, organization_id: tenant.organization_id };
      if (!editing?.id && !payload["created_by"] && createdBy) payload["created_by"] = (await supabase.auth.getUser()).data.user?.id ?? null;
      if (slugFrom && !payload["slug"] && payload[slugFrom]) {
        payload["slug"] = slugify(String(payload[slugFrom]));
      }
      for (const k of Object.keys(payload)) {
        const empty = payload[k] === "" || payload[k] === null;
        // On create, leave blanks out so the database defaults apply
        // (several columns are required and reject an explicit blank).
        if (empty && !editing?.id) delete payload[k];
        else if (payload[k] === "") payload[k] = null;
      }
      if (editing?.id) {
        const { error } = await supabase
          .from(table as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(L ? "सहेज लिया" : "Saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(errText(e, L ? "सहेज नहीं सके" : "Could not save")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(L ? "हटा दिया" : "Deleted");
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(errText(e, L ? "हटा नहीं सके" : "Could not delete")),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Record<string, any> = {};
    for (const f of fields) {
      if (f.only === "create" && editing?.id) continue;
      if (f.only === "edit" && !editing?.id) continue;
      if (f.type === "checkbox") {
        values[f.key] = form.get(f.key) === "on";
      } else if (f.type === "number") {
        const v = form.get(f.key);
        values[f.key] = v === "" || v === null ? null : Number(v);
      } else if (f.type === "datetime") {
        const v = form.get(f.key) as string;
        values[f.key] = v ? new Date(v).toISOString() : null;
      } else if (f.type === "json") {
        const v = (form.get(f.key) as string) ?? "";
        try { values[f.key] = v.trim() ? JSON.parse(v) : null; } catch { toast.error(`${f.label}: JSON सही नहीं है`); return; }
      } else {
        values[f.key] = (form.get(f.key) as string) ?? "";
      }
    }
    save.mutate(values);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{tx(title, L)}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{tx(description, L)}</p> : null}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> {L ? "नया जोड़ें" : "Add new"}
        </Button>
      </div>
      {toolbar ? <div className="mb-4">{toolbar}</div> : null}

      {/* phones: one card per record */}
      <div className="space-y-2 md:hidden">
        {list.isLoading ? <p className="surface-card p-4 text-sm text-muted-foreground">{L ? "लोड हो रहा है…" : "Loading…"}</p> : null}
        {list.isSuccess && !list.data?.length ? <p className="surface-card p-4 text-sm text-muted-foreground">{L ? "अभी यहाँ कुछ नहीं है।" : "Nothing here yet."}</p> : null}
        {(list.data ?? []).map((row: any) => (
          <div key={row.id} className={`surface-card p-3 text-sm ${rowClass?.(row) ?? ""}`}>
            <div className={onRowClick ? "cursor-pointer" : ""} onClick={onRowClick ? () => onRowClick(row) : undefined}>
              <div className="font-medium">{columns[0] ? (columns[0].render ? columns[0].render(row) : String(row[columns[0].key] ?? "—")) : null}</div>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {columns.slice(1).map((c) => (
                  <Fragment key={c.key}>
                    <dt className="text-muted-foreground">{tx(c.label, L)}</dt>
                    <dd className="min-w-0 break-words">{c.render ? c.render(row) : String(row[c.key] ?? "—")}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-border pt-2">
              {extraActions ? extraActions(row) : null}
              <Button size="sm" variant="outline" onClick={() => { setEditing(row); setOpen(true); }}><Pencil className="size-4" /> {L ? "बदलें" : "Edit"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm(L ? "यह रिकॉर्ड हटाएँ?" : "Delete this record?")) remove.mutate(row.id); }} aria-label={L ? "हटाएँ" : "Delete"}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-left">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {tx(c.label, L)}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                  {L ? "लोड हो रहा है…" : "Loading…"}
                </td>
              </tr>
            ) : list.data?.length ? (
              list.data.map((row: any) => (
                <tr key={row.id} className={`border-t border-border ${onRowClick ? "cursor-pointer hover:bg-secondary/40" : ""} ${rowClass?.(row) ?? ""}`}>
                  {columns.map((c) => (
                    <td key={c.key} className="max-w-xs truncate px-4 py-3" onClick={onRowClick ? () => onRowClick(row) : undefined}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {extraActions ? extraActions(row) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                      aria-label={L ? "बदलें" : "Edit"}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(L ? "यह रिकॉर्ड हटाएँ?" : "Delete this record?")) remove.mutate(row.id);
                      }}
                      aria-label={L ? "हटाएँ" : "Delete"}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                  {L ? "अभी यहाँ कुछ नहीं है।" : "Nothing here yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {(list.data?.length ?? 0) >= limit ? <div className="p-3 text-center"><Button type="button" variant="outline" size="sm" onClick={() => setLimit((n) => n + 200)} disabled={list.isFetching}>{L ? "और दिखाएँ" : "Show more"} ({list.data?.length})</Button></div> : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? (L ? "बदलें" : "Edit") : (L ? "नया" : "New")} — {tx(title, L)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              if (f.only === "create" && editing?.id) return null;
              if (f.only === "edit" && !editing?.id) return null;
              const value = editing?.[f.key];
              const options: AdminOption[] = f.fk ? (fkOptions.data?.[f.key] ?? []) : (f.options ?? []);
              if (f.type === "checkbox") {
                return (
                  <label
                    key={f.key}
                    className={`flex items-center gap-3 text-sm ${f.full ? "sm:col-span-2" : ""}`}
                  >
                    <Checkbox name={f.key} defaultChecked={value ?? true} />
                    <span>{tx(f.label, L)}</span>
                  </label>
                );
              }
              return (
                <Field
                  key={f.key}
                  label={tx(f.label, L)}
                  hint={f.hint ? tx(f.hint, L) : f.hint}
                  required={f.required}
                  className={f.full ? "sm:col-span-2" : undefined}
                >
                  {f.type === "json" ? (
                    <Textarea name={f.key} rows={3} className="font-mono text-xs" defaultValue={value == null ? "" : typeof value === "string" ? value : JSON.stringify(value)} required={f.required} />
                  ) : f.type === "textarea" ? (
                    <Textarea name={f.key} rows={5} defaultValue={value ?? ""} required={f.required} />
                  ) : f.type === "image" ? (
                    <HiddenImage name={f.key} initial={value ?? ""} />
                  ) : f.type === "markup" ? (
                    <HiddenMarkup name={f.key} initial={value ?? ""} />
                  ) : f.type === "select" || f.fk ? (
                    <select
                      name={f.key}
                      defaultValue={value ?? (f.required ? optValue(options[0] ?? "") : "")}
                      required={f.required}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {!f.required ? <option value="">—</option> : null}
                      {options.map((o) => (
                        <option key={optValue(o)} value={optValue(o)}>
                          {tx(optLabel(o), L)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      name={f.key}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                      defaultValue={
                        f.type === "date" && value
                          ? String(value).slice(0, 10)
                          : f.type === "datetime" && value
                            ? toLocalInput(String(value))
                            : (value ?? "")
                      }
                      required={f.required}
                    />
                  )}
                </Field>
              );
            })}
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? (L ? "सहेज रहे हैं…" : "Saving…") : (L ? "सहेजें" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Uncontrolled wrappers so the upload / editor fields still submit through the plain <form>. */
function HiddenImage({ name, initial }: { name: string; initial: string }) {
  const [v, setV] = useState(initial);
  return <><input type="hidden" name={name} value={v} /><ImageField label="" value={v} onChange={setV} folder={name} /></>;
}
function HiddenMarkup({ name, initial }: { name: string; initial: string }) {
  const [v, setV] = useState(initial);
  return <><input type="hidden" name={name} value={v} /><MarkupEditor value={v} onChange={setV} rows={12} /></>;
}
