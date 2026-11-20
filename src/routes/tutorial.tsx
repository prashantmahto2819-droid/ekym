// चलता-फिरता ट्यूटोरियल: नमूना स्क्रीन पर कर्सर खुद चलकर दिखाता है कि हर काम कैसे होता है।
// Player and lessons are plain browser modules in public/learn/ (the player is shared with the Shokpatra app).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { siteName } from "@/core/seo";

export const Route = createFileRoute("/tutorial")({
  head: ({ matches }) => ({
    meta: [
      { title: `Tutorial: how to use the site — ${siteName(matches)}` },
      { name: "description", content: "Animated step-by-step lessons: sign in, become a member, build a family tree, tribute pages, matrimony, community posts and admin tasks." },
    ],
    links: [
      { rel: "stylesheet", href: "/learn/player.css" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;700&family=Tiro+Devanagari+Hindi&display=swap" },
    ],
  }),
  component: TutorialPage,
});

type Player = { mountTutorial: (root: HTMLElement, groups: unknown, opts: { lang: string }) => { stop: () => void } };
type Lessons = { LESSONS: unknown };

function TutorialPage() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    const playerUrl = "/learn/player.js", lessonsUrl = "/learn/lessons-k1.js";
    void Promise.all([import(/* @vite-ignore */ playerUrl) as Promise<Player>, import(/* @vite-ignore */ lessonsUrl) as Promise<Lessons>])
      .then(([p, l]) => { if (!gone && box.current) stop = p.mountTutorial(box.current, l.LESSONS, { lang }).stop; })
      .catch(() => { if (box.current) box.current.textContent = hi ? "ट्यूटोरियल नहीं खुल सका। पेज दोबारा खोलिए।" : "The tutorial could not be loaded. Please reload the page."; });
    return () => { gone = true; stop?.(); };
  }, [lang, hi]);

  return (
    <>
      <PageHeader
        title={hi ? "देखकर सीखें" : "Learn by watching"}
        description={hi ? "हर काम का छोटा चलता-फिरता उदाहरण: कर्सर खुद दिखाता है कि कहाँ दबाना है और क्या भरना है।" : "A short animated example of each task: the cursor shows where to press and what to fill in."}
        crumbs={[{ label: hi ? "ट्यूटोरियल" : "Tutorial" }]}
      />
      <section className="section-y">
        <div className="container-page">
          <div className="rounded-2xl p-4 sm:p-6" style={{ background: "#fcfbf8", color: "#14213d" }}>
            <p className="mb-4 max-w-3xl rounded-lg p-3 text-[15px]" style={{ background: "#f6efdc" }}>
              {hi
                ? "ये नमूना स्क्रीन हैं — नाम और नंबर काल्पनिक हैं और असली पेज का रंग-रूप थोड़ा अलग दिख सकता है। ▶ से चलाइए, ‹ › से एक-एक कदम आगे-पीछे जाइए, या लिखे हुए किसी कदम पर दबाकर सीधे वहीं पहुँचिए।"
                : "These are sample screens — names and numbers are made up and the real pages may look a little different. Press ▶ to play, ‹ › to move one step at a time, or press any written step to jump to it."}
            </p>
            <div ref={box}><p>{hi ? "ट्यूटोरियल खुल रहा है…" : "Loading the tutorial…"}</p></div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {hi ? "और देखिए: " : "See also: "}
            <Link to="/privacy-policy" className="underline">{hi ? "गोपनीयता नीति" : "Privacy policy"}</Link> · <Link to="/terms" className="underline">{hi ? "उपयोग की शर्तें" : "Terms of use"}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
