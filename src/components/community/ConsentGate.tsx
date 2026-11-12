// One-time consent for the community features (chat, profile, stories, friends, posting): a short summary of the rules,
// a checkbox, "मैं सहमत हूँ" → k1_accept_terms (stored with version). Wrap any action with useConsent().ensure(fn).
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { call } from "@/community/chat";
import { useLang } from "@/core/i18n";
import { useSession } from "@/hooks/use-auth";

export const TERMS_VERSION = "community-2026-11";

type Ctx = { ensure: (fn: () => void | Promise<void>) => void; accepted: boolean | null };
const C = createContext<Ctx>({ ensure: (fn) => void fn(), accepted: null });
export const useConsent = () => useContext(C);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { lang } = useLang(); const L = lang === "hi";
  const qc = useQueryClient();
  const st = useQuery({ queryKey: ["terms_status", user?.id], enabled: !!user, staleTime: 600000, queryFn: () => call<{ accepted_at: string | null; version: string | null }>("k1_terms_status").catch(() => ({ accepted_at: null, version: null })) });
  const accepted = st.data ? st.data.accepted_at !== null && st.data.version === TERMS_VERSION : null;
  const [pending, setPending] = useState<(() => void | Promise<void>) | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const ensure: Ctx["ensure"] = (fn) => { if (accepted || !user) void fn(); else setPending(() => fn); };
  async function accept() {
    setBusy(true);
    try { await call("k1_accept_terms", { p_version: TERMS_VERSION }); await qc.invalidateQueries({ queryKey: ["terms_status"] }); const fn = pending; setPending(null); setAgree(false); if (fn) await fn(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  return (
    <C.Provider value={{ ensure, accepted }}>
      {children}
      {pending ? (
        <Dialog open onOpenChange={(o) => { if (!o) { setPending(null); setAgree(false); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">🤝 {L ? "समुदाय में भाग लेने से पहले" : "Before you join in"}</DialogTitle></DialogHeader>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto text-sm">
              <p>{L ? "चैट, प्रोफ़ाइल, स्टोरी, मित्र और पोस्ट — ये सुविधाएँ समाज के सदस्यों के लिए हैं। एक बार ये बातें पढ़कर सहमति दीजिए:" : "Chat, profiles, stories, friends and posts are for community members. Please read and agree once:"}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{L ? "मैं वही फोटो/वीडियो/टेक्स्ट डालूँगा जिसका अधिकार मेरे पास है; दूसरों की फोटो या फ़िल्म/गाने के क्लिप, लोगो बिना अनुमति नहीं। मेरी सामग्री का कॉपीराइट मेरा रहेगा; साइट उसे सिर्फ़ सेवा चलाने के लिए दिखाएगी।" : "I will post only content I have the right to (no others' photos, film/song clips or logos without permission). I keep the copyright; the site shows it only to run the service."}</li>
                <li>{L ? "पोस्ट/स्टोरी की पहुँच (सार्वजनिक / सदस्य / सिर्फ़ मित्र) और प्रोफ़ाइल में मोबाइल/ईमेल/जन्मदिन दिखाना मैं खुद चुनूँगा; \"सार्वजनिक\" सामग्री बिना लॉगिन भी दिख सकती है।" : "I choose who sees my posts/stories (public / members / friends) and what my profile shows; public content may be seen without sign-in."}</li>
                <li>{L ? "मेरी ऑनलाइन/आख़िरी बार वाली स्थिति चैट में सदस्यों को दिखेगी। स्टोरी 24 घंटे में अपने आप मिटेगी, पर तब तक लोग उसे देख/सहेज सकते हैं।" : "My online / last-seen status is visible in chat. Stories self-delete after 24 hours but can be viewed or saved until then."}</li>
                <li>{L ? "गाली, धमकी, अश्लीलता, झूठी खबर, किसी की निजी जानकारी, नफ़रत या राजनीतिक/व्यापारिक प्रचार नहीं करूँगा; ऐसी सामग्री एडमिन हटा सकता है और खाता रोक सकता है।" : "No abuse, threats, obscenity, false news, others' private data, hate or political/commercial promotion; admins may remove it and suspend the account."}</li>
                <li>{L ? "संगठन मेरे जन्मदिन/वर्षगाँठ पर शुभकामना भेज सकता है और चौपाल पर पोस्ट कर सकता है — इसे मैं प्रोफ़ाइल की गोपनीयता सेटिंग से बंद कर सकता हूँ।" : "The organization may greet me and post on my birthday/anniversary — I can switch this off in profile privacy."}</li>
              </ul>
              <p className="text-xs text-muted-foreground">{L ? "पूरी शर्तें: " : "Full terms: "}<Link to="/terms" target="_blank" className="underline">{L ? "उपयोग की शर्तें" : "Terms of use"}</Link> · <Link to="/privacy-policy" target="_blank" className="underline">{L ? "गोपनीयता नीति" : "Privacy policy"}</Link></p>
            </div>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" /><span>{L ? "मैंने ऊपर की बातें पढ़ लीं और इनसे सहमत हूँ।" : "I have read the points above and agree."}</span></label>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setPending(null); setAgree(false); }}>{L ? "अभी नहीं" : "Not now"}</Button><Button onClick={() => void accept()} disabled={!agree || busy}>{L ? "मैं सहमत हूँ, आगे बढ़ें" : "I agree, continue"}</Button></div>
          </DialogContent>
        </Dialog>
      ) : null}
    </C.Provider>
  );
}
