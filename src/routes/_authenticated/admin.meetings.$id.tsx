import { createFileRoute, Link } from "@tanstack/react-router";
import { T, txNow } from "@/components/admin/T";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CrudPage } from "@/components/admin/CrudPage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMessage, kickWorker, normPhone } from "@/lib/comms";

export const Route = createFileRoute("/_authenticated/admin/meetings/$id")({
  component: MeetingDetail,
});

type Meeting = {
  id: string;
  title: string;
  scheduled_at: string;
  venue: string | null;
  status: string;
  minutes: string | null;
  minutes_status: string;
  attendance: { name: string; present: boolean }[];
};

function MeetingDetail() {
  const { id } = Route.useParams();
  const tenant = useTenant();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState("");
  const [attendance, setAttendance] = useState("");
  const [notifying, setNotifying] = useState(false);

  /** Queue a WhatsApp notice for this meeting to every active member who has a number (team members included). */
  async function notify(m: Meeting) {
    const when = new Date(m.scheduled_at).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
    const text = prompt("Notice text (sent to all active members with a WhatsApp number)", `${tenant.name}\nMeeting: ${m.title}\nDate: ${when}${m.venue ? `\nVenue: ${m.venue}` : ""}\nAll members are requested to attend.`);
    if (!text) return;
    setNotifying(true);
    try {
      const { data } = await supabase.from("org_memberships").select("full_name,whatsapp").eq("organization_id", tenant.organization_id).eq("status", "active").not("whatsapp", "is", null).limit(5000);
      const rows = (data ?? []) as { full_name: string; whatsapp: string | null }[];
      const list = rows.map((r) => ({ to: normPhone(r.whatsapp ?? ""), name: r.full_name })).filter((r) => r.to.length >= 12);
      if (!list.length) { toast.error(txNow("No active member has a WhatsApp number")); return; }
      if (!confirm(`Queue the notice to ${list.length} member(s)?`)) return;
      let ok = 0;
      for (const r of list) {
        try { await enqueueMessage({ org: tenant.organization_id, kind: "whatsapp", to: r.to, name: r.name, body: text, refTable: "gov_meetings", refId: m.id }); ok++; } catch (e) { console.warn(e); }
      }
      kickWorker();
      toast.success(`${ok} notice(s) queued — see Messaging for delivery status`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setNotifying(false); }
  }

  const meeting = useQuery({
    queryKey: ["admin", "gov_meetings", tenant.organization_id, id],
    queryFn: async () => {
      const { data, error } = await supabase.from("gov_meetings").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Meeting;
    },
  });

  useEffect(() => {
    if (meeting.data) {
      setMinutes(meeting.data.minutes ?? "");
      setAttendance((meeting.data.attendance ?? []).map((a) => (a.present ? a.name : `${a.name} (absent)`)).join("\n"));
    }
  }, [meeting.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Meeting>) => {
      const { error } = await supabase.from("gov_meetings").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txNow("Saved"));
      qc.invalidateQueries({ queryKey: ["admin", "gov_meetings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function parseAttendance(text: string) {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const absent = /\((absent|अनुपस्थित)\)\s*$/i.test(l);
        return { name: l.replace(/\((absent|अनुपस्थित)\)\s*$/i, "").trim(), present: !absent };
      });
  }

  if (meeting.isLoading) return <p className="text-sm text-muted-foreground"><T>Loading…</T></p>;
  if (!meeting.data) return <p className="text-sm text-destructive"><T>Meeting not found.</T></p>;
  const m = meeting.data;
  const approved = m.minutes_status === "approved";

  return (
    <div className="space-y-8 rounded-lg border border-border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground"><T>Meeting</T></p>
          <h2 className="font-display text-xl font-semibold">{m.title}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(m.scheduled_at).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
            {m.venue ? ` · ${m.venue}` : ""} · {m.status}
          </p>
        </div>
        <div className="flex gap-2">
          {can("gov.meeting.manage") ? <Button size="sm" variant="outline" disabled={notifying} onClick={() => notify(m)}>{notifying ? "Queuing…" : "WhatsApp notice to members"}</Button> : null}
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/meetings"><T>Close</T></Link>
          </Button>
        </div>
      </div>

      <CrudPage
        table="gov_agenda_items"
        title="Agenda"
        orderBy="item_no"
        ascending
        filter={{ meeting_id: id }}
        columns={[
          { key: "item_no", label: "#" },
          { key: "title", label: "Item" },
          { key: "presenter", label: "Presenter" },
          { key: "outcome", label: "Outcome" },
        ]}
        fields={[
          { key: "item_no", label: "No.", type: "number", required: true },
          { key: "title", label: "Agenda item", required: true },
          { key: "presenter", label: "Presenter" },
          { key: "detail", label: "Details", type: "textarea", full: true },
          { key: "outcome", label: "Outcome / decision", type: "textarea", full: true },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-semibold"><T>Attendance</T></h3>
          <p className="mb-2 text-xs text-muted-foreground"><T>{"One name per line. Write \"(absent)\" after a name to mark absence."}</T></p>
          <Textarea rows={10} value={attendance} onChange={(e) => setAttendance(e.target.value)} disabled={approved} />
          <Button className="mt-2" size="sm" disabled={approved || save.isPending} onClick={() => save.mutate({ attendance: parseAttendance(attendance) })}>
            Save attendance
          </Button>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Minutes (कार्यवृत्त)</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Status: <span className="font-medium">{m.minutes_status}</span>
            {approved ? " · locked after approval" : ""}
          </p>
          <Textarea rows={10} value={minutes} onChange={(e) => setMinutes(e.target.value)} disabled={approved} placeholder="Proceedings, discussions and decisions…" />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={approved || save.isPending} onClick={() => save.mutate({ minutes, minutes_status: "draft" })}>
              Save draft
            </Button>
            <Button size="sm" variant="outline" disabled={approved || save.isPending} onClick={() => save.mutate({ minutes, minutes_status: "submitted" })}>
              Submit for approval
            </Button>
            {can("gov.resolution.record") ? (
              <Button size="sm" disabled={approved || save.isPending} onClick={() => save.mutate({ minutes, minutes_status: "approved", status: "held" } as never)}>
                Approve minutes
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <CrudPage
        table="gov_resolutions"
        title="Resolutions (प्रस्ताव)"
        description="Each resolution gets a serial number automatically."
        orderBy="created_at"
        ascending
        filter={{ meeting_id: id }}
        columns={[
          { key: "number", label: "No." },
          { key: "title", label: "Resolution" },
          { key: "proposer", label: "Proposed by" },
          { key: "result", label: "Result" },
        ]}
        fields={[
          { key: "title", label: "Title", required: true, full: true },
          { key: "text", label: "Full text", type: "textarea", required: true, full: true },
          { key: "proposer", label: "Proposed by" },
          { key: "seconder", label: "Seconded by" },
          { key: "result", label: "Result", type: "select", options: ["passed", "unanimous", "rejected", "deferred"] },
          { key: "resolved_on", label: "Date", type: "date", required: true },
          { key: "votes_for", label: "Votes for", type: "number" },
          { key: "votes_against", label: "Votes against", type: "number" },
          { key: "votes_abstain", label: "Abstained", type: "number" },
        ]}
      />

      <CrudPage
        table="gov_tasks"
        title="Tasks from this meeting"
        orderBy="due_date"
        ascending
        filter={{ meeting_id: id }}
        columns={[
          { key: "title", label: "Task" },
          { key: "assignee_name", label: "Assignee" },
          { key: "due_date", label: "Due" },
          { key: "status", label: "Status" },
        ]}
        fields={[
          { key: "title", label: "Task", required: true, full: true },
          { key: "assignee_name", label: "Assignee (name)" },
          { key: "due_date", label: "Due date", type: "date" },
          { key: "priority", label: "Priority", type: "select", options: ["normal", "high", "urgent", "low"] },
          { key: "status", label: "Status", type: "select", options: ["open", "in_progress", "done", "cancelled"] },
          { key: "detail", label: "Details", type: "textarea", full: true },
        ]}
      />
    </div>
  );
}
