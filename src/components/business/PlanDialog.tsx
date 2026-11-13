// Buy / renew a paid plan for a business page — paid offline for now: QR / UPI / bank transfer / cash,
// then the member enters the UTR (and optionally a screenshot); an admin checks the payment and switches the plan on.
import { Check, Copy, ImagePlus, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inr, planName, upiLink, useBizRefresh, usePaySettings, usePlans, type BizPage, type Plan } from "@/components/business/biz";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { call, uploadCommunityImage } from "@/community/chat";
import { useTenant } from "@/core/tenant-context";
import { useAuth } from "@/hooks/use-auth";

export function PlanFeatures({ p, hi }: { p: Plan; hi: boolean }) {
  const items = hi
    ? [`रोज़ ${p.daily_posts} पोस्ट`, `हर महीने ${p.sponsored_per_month} प्रायोजित पोस्ट — सबके "आपके लिए" फ़ीड में`, `हर प्रायोजित पोस्ट ${p.sponsored_days} दिन, ${p.sponsored_reach.toLocaleString("en-IN")} लोगों तक`, "सत्यापित ✓ बैज", "निर्देशिका में ऊपर"]
    : [`${p.daily_posts} posts a day`, `${p.sponsored_per_month} sponsored posts a month in everyone's "For you" feed`, `Each runs ${p.sponsored_days} days, up to ${p.sponsored_reach.toLocaleString("en-IN")} people`, "Verified ✓ badge", "Higher in the directory"];
  return <ul className="space-y-1.5 text-sm">{items.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />{t}</li>)}</ul>;
}

export function PlanDialog({ page, hi, onClose }: { page: BizPage; hi: boolean; onClose: () => void }) {
  const tenant = useTenant();
  const { user } = useAuth();
  const plans = usePlans();
  const refresh = useBizRefresh();
  const list = (plans.data ?? []).filter((p) => p.active);
  const [step, setStep] = useState<1 | 2>(1);
  const [key, setKey] = useState<"silver" | "gold">(page.tier === "gold" ? "gold" : "silver");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [mode, setMode] = useState<"upi" | "bank" | "cash">("upi");
  const [ref, setRef] = useState("");
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [proof, setProof] = useState<string | null>(null);
  const [bill, setBill] = useState({ name: page.name, gstin: "", address: [page.address, page.city, page.state].filter(Boolean).join(", ") });
  const [busy, setBusy] = useState<string | null>(null);
  const plan = list.find((p) => p.key === key);
  const amount = plan ? (period === "year" ? plan.price_year : plan.price_month) : 0;
  const note = `${page.name} ${planName(key, false)} ${period}`;
  const L = (h: string, e: string) => (hi ? h : e);
  async function upload(f: File | undefined) {
    if (!f || !user) return; setBusy("proof");
    try { setProof(await uploadCommunityImage(f, `${tenant.organization_id}/biz/${user.id}`, 1400)); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(null); }
  }
  async function submit() {
    if (mode !== "cash" && ref.trim().length < 6) { toast.error(L("भुगतान का UTR / ट्रांज़ैक्शन नंबर लिखें", "Enter the UTR / transaction number")); return; }
    setBusy("send");
    try {
      await call("biz_subscribe", { p_page: page.id, p_plan: key, p_period: period, p_pay_mode: mode, p_ref: ref.trim() || null, p_proof: proof, p_paid_on: paidOn, p_buyer: bill });
      await refresh();
      toast.success(L("अनुरोध भेज दिया — एडमिन भुगतान जाँचकर पैकेज चालू करेंगे। WhatsApp पर सूचना आएगी।", "Request sent — an admin will check the payment and switch the plan on."));
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 py-3"><DialogTitle className="font-display text-lg">{step === 1 ? L("पैकेज चुनें", "Choose a plan") : L("भुगतान करें", "Pay")} · {page.name}</DialogTitle></DialogHeader>
        {step === 1 ? (
          <div className="space-y-4 p-5">
            <div className="mx-auto flex w-fit rounded-full bg-secondary p-1 text-sm font-semibold">
              {(["month", "year"] as const).map((p) => <button key={p} type="button" onClick={() => setPeriod(p)} className={`rounded-full px-4 py-1.5 ${period === p ? "bg-background shadow-sm" : "text-muted-foreground"}`}>{p === "month" ? L("महीना", "Monthly") : L("साल (2 महीने बचत)", "Yearly (save 2 months)")}</button>)}
            </div>
            {plans.isLoading ? <div className="h-40 animate-pulse rounded-2xl bg-muted" /> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((p) => (
                <button key={p.key} type="button" onClick={() => setKey(p.key)} className={`relative rounded-2xl p-4 text-left ring-2 transition ${key === p.key ? (p.key === "gold" ? "bg-amber-50 ring-amber-500 dark:bg-amber-950/30" : "bg-slate-50 ring-slate-500 dark:bg-slate-900/40") : "bg-card ring-border hover:ring-primary/40"}`}>
                  {p.key === "gold" ? <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{L("सबसे ज़्यादा पहुँच", "Most reach")}</span> : null}
                  <p className="font-display text-lg font-semibold">{hi ? p.name_hi : p.name}</p>
                  <p className="mt-1"><span className="font-display text-3xl font-bold">{inr(period === "year" ? p.price_year : p.price_month)}</span><span className="text-sm text-muted-foreground">/{period === "year" ? L("साल", "year") : L("महीना", "month")}</span></p>
                  <div className="mt-3"><PlanFeatures p={p} hi={hi} /></div>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">{L("मुफ़्त पेज: रोज़ 1 पोस्ट, कोई प्रायोजित पोस्ट नहीं। पैकेज एडमिन की मंज़ूरी के दिन से चालू होगा; पहले से चल रहे उसी पैकेज का नवीनीकरण उसकी तारीख़ के बाद जुड़ता है।", "Free page: 1 post a day, no sponsored posts. A plan starts on the day an admin approves it; renewing the same plan adds after its current end date.")}</p>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{L("रहने दें", "Cancel")}</Button><Button disabled={!plan} onClick={() => setStep(2)}>{L(`आगे — ${inr(amount)} भुगतान करें`, `Next — pay ${inr(amount)}`)}</Button></div>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <PayInfo amount={amount} note={note} hi={hi} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm"><span className="font-medium">{L("कैसे भुगतान किया", "Paid by")}</span>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="upi">UPI / QR</option><option value="bank">{L("बैंक ट्रांसफ़र (NEFT/IMPS)", "Bank transfer (NEFT/IMPS)")}</option><option value="cash">{L("नकद (एडमिन को)", "Cash (to an admin)")}</option>
                </select></label>
              <label className="space-y-1 text-sm"><span className="font-medium">{L("भुगतान की तारीख़", "Date paid")}</span><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></label>
              {mode !== "cash" ? <label className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">{L("UTR / ट्रांज़ैक्शन नंबर", "UTR / transaction number")} *</span><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 431812345678" inputMode="numeric" /><span className="block text-xs text-muted-foreground">{L("UPI ऐप में भुगतान के बाद 12 अंकों का UTR / Ref No. दिखता है।", "Your UPI app shows a 12-digit UTR / Ref No. after paying.")}</span></label> : null}
              <div className="space-y-1 text-sm sm:col-span-2"><span className="font-medium">{L("भुगतान का स्क्रीनशॉट (वैकल्पिक, जल्दी मंज़ूरी के लिए)", "Payment screenshot (optional, for faster approval)")}</span>
                <div className="flex items-center gap-3">{proof ? <img src={proof} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" /> : null}<label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary"><ImagePlus className="size-4" />{busy === "proof" ? "…" : proof ? L("बदलें", "Change") : L("फोटो चुनें", "Choose photo")}<input type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label></div></div>
            </div>
            <details className="rounded-xl border border-border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">{L("बिल / GST की जानकारी (वैकल्पिक)", "Billing / GST details (optional)")}</summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Input value={bill.name} onChange={(e) => setBill({ ...bill, name: e.target.value })} placeholder={L("बिल पर नाम", "Name on bill")} />
                <Input value={bill.gstin} onChange={(e) => setBill({ ...bill, gstin: e.target.value.toUpperCase() })} placeholder="GSTIN" maxLength={15} />
                <Textarea className="sm:col-span-2" rows={2} value={bill.address} onChange={(e) => setBill({ ...bill, address: e.target.value })} placeholder={L("पता", "Address")} />
              </div>
            </details>
            <div className="flex justify-between gap-2"><Button variant="outline" onClick={() => setStep(1)} disabled={!!busy}>{L("← पीछे", "← Back")}</Button><Button onClick={() => void submit()} disabled={!!busy}>{busy === "send" ? "…" : L("भुगतान कर दिया — मंज़ूरी के लिए भेजें", "I've paid — send for approval")}</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Where and how much to pay: QR, UPI ID (copy + UPI-app button on phones), bank account, note. */
export function PayInfo({ amount, note, hi }: { amount: number; note: string; hi: boolean }) {
  const pay = usePaySettings();
  const s = pay.data ?? {};
  const upi = upiLink(s, amount, note);
  const L = (h: string, e: string) => (hi ? h : e);
  const copy = (t: string) => { void navigator.clipboard.writeText(t).then(() => toast.success(L("कॉपी हुआ", "Copied"))); };
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-200 dark:from-emerald-950/30 dark:to-teal-950/20 dark:ring-emerald-900">
              <p className="text-sm">{L("भुगतान करें", "Pay")} <b className="font-display text-2xl">{inr(amount)}</b> {L("इन्हें", "to")} <b>{s.payee_name || "—"}</b></p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                {s.qr_url ? <img src={s.qr_url} alt="QR" className="mx-auto size-48 shrink-0 rounded-xl bg-white object-contain p-2 ring-1 ring-border sm:mx-0" /> : <span className="mx-auto grid size-48 shrink-0 place-items-center rounded-xl bg-white/60 text-center text-xs text-muted-foreground ring-1 ring-border sm:mx-0"><QrCode className="mx-auto mb-1 size-8 opacity-50" />{L("QR अभी नहीं लगा", "No QR yet")}</span>}
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  {s.upi_id ? <p className="flex items-center gap-2">UPI: <b className="break-all">{s.upi_id}</b><button type="button" onClick={() => copy(s.upi_id!)} aria-label="copy" className="rounded p-1 hover:bg-background"><Copy className="size-4" /></button></p> : null}
                  {upi ? <a href={upi} className="inline-flex h-10 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 sm:hidden">{L("UPI ऐप से भुगतान करें", "Pay with a UPI app")}</a> : null}
                  {s.bank_text ? <div><p className="text-xs font-semibold text-muted-foreground">{L("बैंक खाता", "Bank account")}</p><p className="whitespace-pre-wrap">{s.bank_text}</p></div> : null}
                  {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
                  {!s.upi_id && !s.qr_url && !s.bank_text ? <p className="text-amber-800 dark:text-amber-300">{L("भुगतान की जानकारी अभी एडमिन ने नहीं भरी — नकद या एडमिन से पूछकर भुगतान करें।", "Payment details are not set yet — pay in cash or ask the admin.")}</p> : null}
                </div>
              </div>
            </div>
  );
}
