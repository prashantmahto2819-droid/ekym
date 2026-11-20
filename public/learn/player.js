// चलता-फिरता ट्यूटोरियल: बनाई हुई (नमूना) स्क्रीन पर कर्सर घूमता है, खाने भरता है, बटन दबाता है
// और ऊपर की पट्टी में लिखा आता है कि अभी क्या हो रहा है। कोई असली डेटा / सर्वर नहीं लगता।
// यही फ़ाइल Kalchuri One (repo ekym: public/learn/player.js) में भी है — दोनों एक जैसी रखिए।
//
// पाठ (lesson) = { id, title, intro, url, screen:[...], steps:[...] }
// screen के टुकड़े: ["top",शीर्षक] ["tabs",[नाम],चुना] ["h",पाठ] ["p",पाठ] ["f",id,लेबल,मान] ["b",id,लेबल,"ghost"?]
//   ["row",[टुकड़े]] ["node",id,नाम,नीचे की पंक्ति,बिल्ला,स्तर] ["card",id,शीर्षक,नीचे] ["check",id,लेबल]
//   ["ok",id,पाठ] ["img",id,पाठ] ["chip",id,पाठ]   — id के आगे "?" हो तो वह टुकड़ा शुरू में छिपा रहता है।
// step = { tab:n (ऊपर की कौन-सी पट्टी चुनी दिखे), s:ऊपर का पाठ, to:id, click:true, type:"लिखा जाने वाला पाठ", show:[id], hide:[id], on:[id], off:[id] }
// कोई भी पाठ {hi:"…", en:"…"} भी हो सकता है।

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chars = (t) => (typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter("hi", { granularity: "grapheme" }).segment(t)].map((x) => x.segment) : [...t]);

export function mountTutorial(root, groups, opts = {}) {
  const lang = opts.lang === "en" ? "en" : "hi";
  const T = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x[lang] ?? x.hi ?? "" : x ?? "");
  const UI = lang === "hi"
    ? { play: "▶ चलाकर देखें", pause: "⏸ रोकें", again: "↻ फिर से देखें", prev: "पिछला कदम", next: "अगला कदम", step: "कदम", sample: "नमूना स्क्रीन", start: "▶ दबाकर देखिए कि यह कैसे किया जाता है", done: "पूरा हुआ। अब आप खुद करके देखिए।", contents: "इस पेज में" }
    : { play: "▶ Play", pause: "⏸ Pause", again: "↻ Watch again", prev: "Previous step", next: "Next step", step: "Step", sample: "Sample screen", start: "Press ▶ to watch how this is done", done: "Done. Now try it yourself.", contents: "On this page" };
  const calm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const players = [];
  root.classList.add("tut");
  root.textContent = "";

  // ---- सूची (ऊपर) ----
  const toc = el("nav", "tut-toc");
  toc.setAttribute("aria-label", UI.contents);
  groups.forEach((g, gi) => { const a = el("a", "", T(g.title)); a.href = "#tut-g" + gi; a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("tut-g" + gi)?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" }); }); toc.append(a); });
  root.append(toc);

  let n = 0;
  groups.forEach((g, gi) => {
    const sec = el("section", "tut-group");
    sec.id = "tut-g" + gi;
    sec.append(el("h2", "", T(g.title)));
    if (g.intro) sec.append(el("p", "tut-gintro", T(g.intro)));
    g.lessons.forEach((L) => { n += 1; sec.append(lesson(L, n)); });
    root.append(sec);
  });

  // जो पाठ स्क्रीन पर आए वही अपने-आप चले (एक समय में एक)
  if (!calm && typeof IntersectionObserver === "function") {
    const io = new IntersectionObserver((list) => {
      for (const e of list) {
        const p = players.find((x) => x.stage === e.target);
        if (!p) continue;
        if (e.isIntersecting && e.intersectionRatio > 0.6) { if (!p.touched && !p.playing && p.i < 0) p.play(); }
        else if (p.playing && !e.isIntersecting) p.pause();
      }
    }, { threshold: [0, 0.6] });
    players.forEach((p) => io.observe(p.stage));
  }
  return { stop: () => players.forEach((p) => p.pause()) };

  function build(spec, map) {
    const [kind, a, b, c, d, lvl] = spec;
    const reg = (id, node) => { if (!id) return node; const hidden = id[0] === "?"; const key = hidden ? id.slice(1) : id; node.dataset.k = key; if (hidden) node.hidden = true; map.set(key, node); return node; };
    if (kind === "top") return el("div", "ts-top", T(a));
    if (kind === "tabs") { const w = el("div", "ts-tabs"); a.forEach((t, i) => w.append(el("span", i === (b ?? 0) ? "on" : "", T(t)))); w._tab = b ?? 0; map.set("_tabs", w); return w; }
    if (kind === "h") return el("div", "ts-h", T(a));
    if (kind === "p") return el("div", "ts-p", T(a));
    if (kind === "f") { const w = reg(a, el("div", "ts-f")); w.append(el("label", "", T(b))); const box = el("div", "ts-in"); box.append(el("span", "v", T(c)), el("i", "caret")); w.append(box); w._v = box.firstChild; w._init = T(c) || ""; return w; }
    if (kind === "b") return reg(a, el("span", "ts-b" + (c === "ghost" ? " ghost" : ""), T(b)));
    if (kind === "row") { const w = el("div", "ts-row"); a.forEach((s) => w.append(build(s, map))); return w; }
    if (kind === "node") { const w = reg(a, el("div", "ts-node")); w.style.marginLeft = (lvl || 0) * 22 + "px"; const t = el("div", "nm", T(b)); if (d) t.append(el("em", "", T(d))); w.append(t); if (c) w.append(el("div", "sb", T(c))); return w; }
    if (kind === "card") { const w = reg(a, el("div", "ts-card")); w.append(el("b", "", T(b))); if (c) w.append(el("span", "", T(c))); return w; }
    if (kind === "check") { const w = reg(a, el("div", "ts-check")); w.append(el("i", "box"), el("span", "", T(b))); return w; }
    if (kind === "ok") return reg(a, el("div", "ts-ok", T(b)));
    if (kind === "img") { const w = reg(a, el("div", "ts-img")); w.append(el("span", "", T(b))); return w; }
    if (kind === "chip") return reg(a, el("span", "ts-chip", T(b)));
    return el("div");
  }

  function lesson(L, num) {
    const art = el("article", "tut-lesson");
    art.id = "tut-" + L.id;
    const head = el("header");
    head.append(el("span", "tut-num", String(num)), el("h3", "", T(L.title)));
    art.append(head);
    if (L.intro) art.append(el("p", "tut-intro", T(L.intro)));
    const grid = el("div", "tut-grid");

    // --- मंच ---
    const stageWrap = el("div", "tut-stagewrap");
    const stage = el("div", "tut-stage");
    const bar = el("div", "tut-bar");
    bar.append(el("i"), el("i"), el("i"), el("span", "url", T(L.url) || ""), el("span", "tag", UI.sample));
    const cap = el("div", "tut-cap");
    const capText = el("span", "", UI.start);
    cap.append(capText);
    cap.setAttribute("aria-live", "polite");
    const scene = el("div", "tut-scene");
    const map = new Map();
    L.screen.forEach((s) => scene.append(build(s, map)));
    const cur = el("div", "tut-cur");
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 2.5v17l4.6-4.3 3 6.6 2.7-1.2-3-6.5H19z" fill="#14213d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg><b></b>';
    stage.append(bar, cap, scene, cur);

    // --- बटन ---
    const ctl = el("div", "tut-ctl");
    const bPlay = el("button", "main", UI.play); bPlay.type = "button";
    const bPrev = el("button", "", "‹"); bPrev.type = "button"; bPrev.setAttribute("aria-label", UI.prev);
    const bNext = el("button", "", "›"); bNext.type = "button"; bNext.setAttribute("aria-label", UI.next);
    const prog = el("div", "tut-prog"); const fill = el("i"); prog.append(fill);
    const count = el("span", "tut-count", `0 / ${L.steps.length}`);
    ctl.append(bPlay, bPrev, bNext, prog, count);
    stageWrap.append(stage, ctl);

    // --- लिखे हुए कदम ---
    const ol = el("ol", "tut-steps");
    const lis = L.steps.map((s, i) => { const li = el("li"); const b = el("button", "", T(s.s)); b.type = "button"; b.addEventListener("click", () => { P.touched = true; P.pause(); jump(i); }); li.append(b); ol.append(li); return li; });
    grid.append(stageWrap, ol);
    art.append(grid);
    if (L.tip) art.append(el("p", "tut-tip", T(L.tip)));

    const P = { stage, playing: false, touched: false, i: -1, run: 0, play, pause };
    players.push(P);

    function reset() {
      map.forEach((node, key) => {
        if (key === "_tabs") { [...node.children].forEach((c, k) => c.classList.toggle("on", k === node._tab)); return; }
        node.classList.remove("on", "hit", "focus");
        if (node._v) node._v.textContent = node._init;
        const spec = findSpec(L.screen, key);
        node.hidden = !!spec && String(spec[1])[0] === "?";
      });
      cur.style.opacity = "0";
    }
    function mark(i) {
      P.i = i;
      lis.forEach((li, k) => li.classList.toggle("now", k === i));
      lis.forEach((li, k) => li.classList.toggle("past", k < i));
      fill.style.width = ((i + 1) / L.steps.length) * 100 + "%";
      count.textContent = `${Math.max(0, i + 1)} / ${L.steps.length}`;
      if (i >= 0) { capText.classList.remove("in"); void capText.offsetWidth; capText.textContent = T(L.steps[i].s); capText.classList.add("in"); }
    }
    function pointAt(node) {
      const s = stage.getBoundingClientRect(), r = node.getBoundingClientRect();
      const x = Math.min(s.width - 20, r.left - s.left + Math.min(r.width * 0.5, 90)), y = r.top - s.top + r.height * 0.55;
      cur.style.opacity = "1";
      cur.style.transform = `translate(${x}px,${y}px)`;
    }
    function apply(st, instant) { // बिना चलाए सीधे नतीजा दिखाना
      (st.show || []).forEach((k) => { const x = map.get(k); if (x) x.hidden = false; });
      (st.hide || []).forEach((k) => { const x = map.get(k); if (x) x.hidden = true; });
      (st.on || []).forEach((k) => map.get(k)?.classList.add("on"));
      (st.off || []).forEach((k) => map.get(k)?.classList.remove("on"));
      const t = st.to ? map.get(st.to) : null;
      if (t && st.type != null && t._v && instant) t._v.textContent = T(st.type);
      const tabs = map.get("_tabs");
      if (tabs && st.tab != null) [...tabs.children].forEach((c, k) => c.classList.toggle("on", k === st.tab));
      if (t && instant && !t.hidden) pointAt(t);
    }
    function jump(i) { // किसी कदम पर सीधे जाना
      P.run += 1; reset();
      for (let k = 0; k <= i; k++) apply(L.steps[k], true);
      mark(i);
      bPlay.textContent = i >= L.steps.length - 1 ? UI.again : UI.play;
    }
    async function doStep(i, run) {
      const st = L.steps[i];
      mark(i);
      const t = st.to ? map.get(st.to) : null;
      if (t && t.hidden && (st.show || []).includes(st.to)) t.hidden = false; // जो टुकड़ा इसी कदम में दिखना है
      if (t && !t.hidden) {
        pointAt(t);
        await wait(calm ? 50 : 850);
        if (run !== P.run) return false;
        if (st.type != null && t._v) {
          t.classList.add("focus");
          t._v.textContent = "";
          for (const ch of chars(T(st.type))) { t._v.textContent += ch; await wait(calm ? 0 : 55); if (run !== P.run) return false; }
          await wait(250);
          t.classList.remove("focus");
        }
        if (st.click) { cur.classList.add("tap"); t.classList.add("hit"); await wait(calm ? 50 : 380); cur.classList.remove("tap"); t.classList.remove("hit"); if (run !== P.run) return false; }
      }
      apply(st, false);
      const words = T(st.s).length;
      await wait(calm ? 400 : Math.min(4200, 1300 + words * 28));
      return run === P.run;
    }
    async function play() {
      if (P.playing) return;
      players.forEach((o) => { if (o !== P) o.pause(); });
      let from = P.i + 1;
      if (from >= L.steps.length) { from = 0; reset(); mark(-1); }
      else if (from === 0) reset();
      P.playing = true; const run = ++P.run;
      bPlay.textContent = UI.pause; art.classList.add("playing");
      for (let i = from; i < L.steps.length; i++) { if (!(await doStep(i, run))) return; }
      if (run !== P.run) return;
      P.playing = false; art.classList.remove("playing");
      bPlay.textContent = UI.again;
    }
    function pause() { if (!P.playing) return; P.playing = false; P.run += 1; art.classList.remove("playing"); bPlay.textContent = P.i >= L.steps.length - 1 ? UI.again : UI.play; }

    bPlay.addEventListener("click", () => { P.touched = true; if (P.playing) pause(); else void play(); });
    bPrev.addEventListener("click", () => { P.touched = true; pause(); jump(Math.max(0, P.i - 1)); });
    bNext.addEventListener("click", () => { P.touched = true; pause(); jump(Math.min(L.steps.length - 1, P.i + 1)); });
    return art;
  }

  function findSpec(list, key) {
    for (const s of list) {
      if (s[0] === "row") { const r = findSpec(s[1], key); if (r) return r; }
      else if (typeof s[1] === "string" && (s[1] === key || s[1] === "?" + key)) return s;
    }
    return null;
  }
}
