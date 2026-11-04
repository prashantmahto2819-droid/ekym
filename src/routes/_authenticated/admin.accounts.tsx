import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLang } from "@/core/i18n";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { dmy, inr, rpc, type Account, type FinYear } from "@/lib/fin";

export const Route = createFileRoute("/_authenticated/admin/accounts")({ component: AccountsPage });

const TYPES: Account["type"][] = ["asset", "liability", "equity", "income", "expense"];
const TYPE_HI: Record<Account["type"], string> = { asset: "संपत्ति", liability: "देनदारी", equity: "निधि", income: "आय", expense: "व्यय" };

export function useAccounts(org: string) {
  return useQuery({ queryKey: ["fin_accounts", org], queryFn: async () => { const { data, error } = await supabase.from("fin_accounts").select("*").eq("organization_id", org).order("code"); if (error) throw error; return (data ?? []) as unknown as Account[]; } });
}

function AccountsPage() {
  const tenant = useTenant();
  const org = tenant.organization_id;
  const { lang } = useLang();
  const L = lang === "hi";
  const { can } = useAuth();
  const qc = useQueryClient();
  const canEdit = can("fin.voucher.create");
  const accounts = useAccounts(org);
  const years = useQuery({ queryKey: ["fin_years", org], queryFn: async () => { const { data } = await supabase.from("fin_years").select("*").eq("organization_id", org).order("starts_on", { ascending: false }); return (data ?? []) as unknown as FinYear[]; } });
  const [edit, setEdit] = useState<Partial<Account> | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["fin_accounts", org] }); qc.invalidateQueries({ queryKey: ["fin_years", org] }); };

  async function seed() {
    setBusy(true);
    try { const n = await rpc<number>("fin_seed_accounts", { p_org: org }); toast.success(`${n} ${L ? "खाते बने" : "accounts created"}`); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!edit?.code?.trim() || !edit.name?.trim() || !edit.type) { toast.error(L ? "कोड, नाम और प्रकार ज़रूरी हैं।" : "Code, name and type are required."); return; }
    setBusy(true);
    try {
      const row = { organization_id: org, code: edit.code.trim(), name: edit.name.trim(), name_hi: edit.name_hi || null, type: edit.type, parent_id: edit.parent_id || null, is_group: !!edit.is_group, is_cash: !!edit.is_cash, is_bank: !!edit.is_bank, opening_balance: Number(edit.opening_balance ?? 0), is_active: edit.is_active ?? true, sort_order: Number(edit.sort_order ?? 0) };
      const { error } = edit.id ? await supabase.from("fin_accounts").update(row as never).eq("id", edit.id) : await supabase.from("fin_accounts").insert(row as never);
      if (error) throw error;
      toast.success(L ? "सहेज लिया" : "Saved"); setEdit(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function lock(y: FinYear, lockIt: boolean) {
    if (!confirm(lockIt ? (L ? `${y.label} बंद करें? इसके बाद इस वर्ष में कोई बदलाव नहीं होगा।` : `Lock ${y.label}? No changes will be possible afterwards.`) : (L ? `${y.label} फिर खोलें?` : `Unlock ${y.label}?`))) return;
    try { await rpc("fin_lock_year", { p_id: y.id, p_lock: lockIt }); refresh(); } catch (e) { toast.error((e as Error).message); }
  }

  const list = accounts.data ?? [];
  const byParent = new Map<string | null, Account[]>();
  list.forEach((a) => { const arr = byParent.get(a.parent_id) ?? []; arr.push(a); byParent.set(a.parent_id, arr); });
  const rows: { a: Account; depth: number }[] = [];
  const walk = (pid: string | null, depth: number) => (byParent.get(pid) ?? []).sort((x, y) => x.sort_order - y.sort_order || x.code.localeCompare(y.code)).forEach((a) => { rows.push({ a, depth }); walk(a.id, depth + 1); });
  walk(null, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{L ? "खातों की सूची (Chart of accounts)" : "Chart of accounts"}</h1>
          <p className="text-sm text-muted-foreground">{L ? "संपत्ति / देनदारी / निधि / आय / व्यय के खाते। समूह खातों में सीधे प्रविष्टि नहीं होती।" : "Asset / liability / fund / income / expense accounts. Group accounts cannot be posted to directly."}</p>
        </div>
        {canEdit ? <div className="flex gap-2">{!list.length ? <Button onClick={seed} disabled={busy}>{L ? "मानक खाते बनाएँ (संस्था template)" : "Create standard accounts (society template)"}</Button> : <Button variant="outline" size="sm" onClick={seed} disabled={busy}>{L ? "छूटे मानक खाते जोड़ें" : "Add missing standard accounts"}</Button>}<Button size="sm" onClick={() => setEdit({ type: "expense", is_active: true })}>+ {L ? "खाता" : "Account"}</Button></div> : null}
      </header>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/60 text-xs uppercase text-muted-foreground"><tr><th className="p-2">{L ? "कोड" : "Code"}</th><th className="p-2">{L ? "खाता" : "Account"}</th><th className="p-2">{L ? "प्रकार" : "Type"}</th><th className="p-2 text-right">{L ? "प्रारंभिक शेष" : "Opening"}</th><th className="p-2"></th></tr></thead>
          <tbody>
            {rows.map(({ a, depth }) => (
              <tr key={a.id} className={`border-t border-border ${!a.is_active ? "opacity-50" : ""}`}>
                <td className="p-2 font-mono text-xs">{a.code}</td>
                <td className="p-2" style={{ paddingLeft: 8 + depth * 18 }}>{a.is_group ? <b>{L && a.name_hi ? a.name_hi : a.name}</b> : (L && a.name_hi ? a.name_hi : a.name)}{!L && a.name_hi ? <span className="ml-1 text-xs text-muted-foreground">{a.name_hi}</span> : null}{a.is_cash ? <Badge variant="secondary" className="ml-2">{L ? "नकद" : "cash"}</Badge> : null}{a.is_bank ? <Badge variant="secondary" className="ml-2">{L ? "बैंक" : "bank"}</Badge> : null}</td>
                <td className="p-2 text-xs">{L ? TYPE_HI[a.type] : a.type}</td>
                <td className="p-2 text-right tabular-nums">{a.is_group ? "" : inr(a.opening_balance)}</td>
                <td className="p-2 text-right">{canEdit ? <Button size="sm" variant="ghost" onClick={() => setEdit(a)}>{L ? "बदलें" : "Edit"}</Button> : null}</td>
              </tr>
            ))}
            {accounts.isSuccess && !rows.length ? <tr><td className="p-3 text-muted-foreground" colSpan={5}>{L ? "अभी कोई खाता नहीं। ऊपर 'मानक खाते बनाएँ' दबाइए।" : "No accounts yet. Use 'Create standard accounts' above."}</td></tr> : null}
          </tbody>
        </table>
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">{L ? "वित्तीय वर्ष" : "Financial years"}</h2>
        <p className="text-xs text-muted-foreground">{L ? "वर्ष पहले वाउचर के साथ अपने आप बनता है (अप्रैल–मार्च)। ऑडिट के बाद वर्ष बंद करें — फिर उसमें कुछ नहीं बदलेगा; सुधार अगले वर्ष में reversal से।" : "A year is created automatically with the first voucher (April–March). Lock it after audit — nothing changes afterwards; corrections go as reversals in the open year."}</p>
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {(years.data ?? []).map((y) => (
            <li key={y.id} className="flex items-center justify-between gap-2 p-2">
              <span><b>{y.label}</b> <span className="text-xs text-muted-foreground">{dmy(y.starts_on)} – {dmy(y.ends_on)}</span> {y.locked ? <Badge className="ml-2">{L ? "बंद" : "locked"}</Badge> : <Badge variant="secondary" className="ml-2">{L ? "खुला" : "open"}</Badge>}</span>
              {can("fin.fy.lock") ? <Button size="sm" variant="outline" onClick={() => lock(y, !y.locked)}>{y.locked ? (L ? "खोलें" : "Unlock") : (L ? "बंद करें" : "Lock")}</Button> : null}
            </li>
          ))}
          {years.isSuccess && !years.data.length ? <li className="p-2 text-muted-foreground">{L ? "अभी कोई वर्ष नहीं।" : "No years yet."}</li> : null}
        </ul>
      </section>

      {edit ? (
        <Dialog open onOpenChange={(o) => { if (!o) setEdit(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit.id ? (L ? "खाता बदलें" : "Edit account") : (L ? "नया खाता" : "New account")}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <L1 label={L ? "कोड" : "Code"}><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></L1>
              <L1 label={L ? "प्रकार" : "Type"}><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={edit.type ?? "expense"} onChange={(e) => setEdit({ ...edit, type: e.target.value as Account["type"] })}>{TYPES.map((t) => <option key={t} value={t}>{t} · {TYPE_HI[t]}</option>)}</select></L1>
              <L1 label="Name (English)"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></L1>
              <L1 label="नाम (हिंदी)"><Input value={edit.name_hi ?? ""} onChange={(e) => setEdit({ ...edit, name_hi: e.target.value })} /></L1>
              <L1 label={L ? "समूह (parent)" : "Parent group"}><select className="h-9 w-full rounded-md border border-input bg-background px-2" value={edit.parent_id ?? ""} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value || null })}><option value="">—</option>{list.filter((a) => a.is_group && a.id !== edit.id).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></L1>
              <L1 label={L ? "प्रारंभिक शेष (डेबिट +, क्रेडिट −)" : "Opening balance (debit +, credit −)"}><Input type="number" step="0.01" value={edit.opening_balance ?? 0} onChange={(e) => setEdit({ ...edit, opening_balance: Number(e.target.value) })} disabled={!!edit.is_group} /></L1>
              <div className="col-span-2 flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!edit.is_group} onChange={(e) => setEdit({ ...edit, is_group: e.target.checked })} /> {L ? "समूह खाता" : "Group account"}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!edit.is_cash} onChange={(e) => setEdit({ ...edit, is_cash: e.target.checked })} /> {L ? "नकद" : "Cash"}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={!!edit.is_bank} onChange={(e) => setEdit({ ...edit, is_bank: e.target.checked })} /> {L ? "बैंक" : "Bank"}</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={edit.is_active ?? true} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> {L ? "सक्रिय" : "Active"}</label>
              </div>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setEdit(null)}>{L ? "रद्द" : "Cancel"}</Button><Button onClick={save} disabled={busy}>{L ? "सहेजें" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function L1({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
