// Renders every starter template in headless Chromium and checks the output is not blank. Run in CI after `bun build`.
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const bundle = readFileSync("ci-out/smoke.js", "utf8");
mkdirSync("ci-out/smoke", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (m) => console.log("[browser]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.setContent(`<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Mukta:wght@400;500;700&family=Tiro+Devanagari+Hindi&family=Noto+Serif+Devanagari:wght@400;700&display=swap">
</head><body></body></html>`);
await page.addScriptTag({ content: bundle });
await page.evaluate(() => document.fonts.ready);
const result = await page.evaluate(() => window.__smoke());
let failed = false;
for (const [kind, r] of Object.entries(result)) {
  const ok = r.canvases >= 1 && r.nonWhiteSamples > 50 && r.pdfBytes > 1000;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} ${kind}: pages=${r.pages} ${r.w}x${r.h} ink=${r.nonWhiteSamples} pdf=${r.pdfBytes}B`);
  writeFileSync(`ci-out/smoke/${kind}.png`, Buffer.from(r.png.split(",")[1], "base64"));
}
if (result.letter && result.letter.pages < 2) { console.log("FAIL letter: expected body to flow onto page 2"); failed = true; }
await browser.close();
process.exit(failed ? 1 : 0);
