// Used by .github/workflows/site-check.yml
import { chromium, devices } from "playwright";
import fs from "node:fs";

const DEFAULT = [
  "https://kalchuri.org/", "https://kalchuri.org/community", "https://kalchuri.org/events", "https://kalchuri.org/about",
  "https://kalchuri.org/gallery", "https://kalchuri.org/blood", "https://kalchuri.org/auth", "https://kalchuri.org/manifest.webmanifest",
  "https://shokpatra.kalchuri.org/", "https://shokpatra.kalchuri.org/login.html", "https://shokpatra.kalchuri.org/app.html",
];
const urls = (process.env.URLS || "").trim() ? process.env.URLS.trim().split(/\s+/) : DEFAULT;
fs.mkdirSync("site-check", { recursive: true });
const browser = await chromium.launch();
let bad = 0;
for (const url of urls) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  const errs = [], fails = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e.message || e).slice(0, 300)));
  page.on("requestfailed", (r) => fails.push(`${r.failure()?.errorText} ${r.url().slice(0, 150)}`));
  page.on("response", (r) => { if (r.status() >= 400) fails.push(`${r.status()} ${r.url().slice(0, 150)}`); });
  let status = "?", title = "";
  try {
    const res = await page.goto(url, { waitUntil: "load", timeout: 45000 });
    status = res?.status() ?? "?";
    await page.waitForTimeout(4000);
    title = await page.title();
    const text = (await page.evaluate(() => document.body?.innerText || "")).replace(/\s+/g, " ").slice(0, 160);
    console.log(`\n### ${url}\nstatus=${status} title="${title}" final=${page.url()}\ntext: ${text}`);
  } catch (e) { console.log(`\n### ${url}\nLOAD FAILED: ${e.message.slice(0, 200)}`); bad++; }
  for (const e of errs) console.log("  console-error: " + e);
  for (const f of fails) console.log("  request-failed: " + f);
  if (errs.length || Number(status) >= 400) bad++;
  const name = url.replace(/https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  await page.screenshot({ path: `site-check/${name}.png` }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log(`\nDONE — pages with problems: ${bad}`);
