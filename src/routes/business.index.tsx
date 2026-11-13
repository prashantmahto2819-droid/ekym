// Business directory: every member's business page, paid pages first; search, category and city filters; "create your page".
import { createFileRoute, Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { useState } from "react";

import { CATEGORIES, catLabel, useBizFacets, useDirectory, useMyPages } from "@/components/business/biz";
import { BizCard, BizEditor } from "@/components/business/BizUI";
import { EmptyState, SearchBox } from "@/components/site/kit";
import { PageHeader } from "@/components/site/PageHeader";
import { useLang } from "@/core/i18n";
import { pageMeta } from "@/core/seo";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/business/")({
  head: ({ matches }) => pageMeta(matches, { en: "Business directory", hi: "व्यापार निर्देशिका" }, { en: "Shops, services and professionals of the community — find, follow and contact them directly.", hi: "समाज के व्यापार, दुकानें और सेवाएँ — ढूँढ़ें, फ़ॉलो करें और सीधे संपर्क करें।" }),
  component: Directory,
});

function Directory() {
  const { lang } = useLang();
  const hi = lang === "hi";
  const { user, orgs } = useAuth();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);
  const facets = useBizFacets();
  const list = useDirectory({ q, category, city });
  const mine = useMyPages(!!user);
  const rows = list.data ?? [];
  const canCreate = !!user && orgs.length > 0;
  return (
    <>
      <PageHeader icon={<Store />} title={hi ? "व्यापार निर्देशिका" : "Business directory"}
        description={hi ? "समाज के व्यापार, दुकानें और सेवाएँ — ढूँढ़िए, फ़ॉलो कीजिए और सीधे कॉल या WhatsApp कीजिए।" : "Shops, services and professionals of the community — find, follow and call or WhatsApp them directly."}
        crumbs={[{ label: hi ? "समुदाय" : "Community", to: "/community" }, { label: hi ? "व्यापार" : "Business" }]}
        stats={facets.data ? [{ label: hi ? "व्यापार" : "businesses", value: facets.data.total }, { label: hi ? "श्रेणियाँ" : "categories", value: facets.data.categories.length }] : undefined}
        actions={canCreate ? <button type="button" onClick={() => setCreating(true)} className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "+ अपना व्यापार पेज बनाएँ" : "+ Create your business page"}</button>
          : <Link to="/auth" className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-95">{hi ? "लॉगिन करके पेज बनाएँ" : "Sign in to create a page"}</Link>} />
      <section className="section-y pt-6">
        <div className="container-page space-y-5">
          {mine.data?.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900">
              <span className="font-semibold">{hi ? "मेरे पेज:" : "My pages:"}</span>
              {mine.data.map((b) => <Link key={b.id} to="/business/$slug" params={{ slug: b.slug }} className="rounded-full bg-card px-3 py-1 font-medium shadow-sm ring-1 ring-border/60 hover:text-primary">{b.name}{b.status === "blocked" ? (hi ? " (रोका गया)" : " (blocked)") : ""}</Link>)}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchBox value={q} onChange={setQ} placeholder={hi ? "नाम, सामान, सेवा या शहर…" : "Name, product, service or city…"} className="md:max-w-md md:flex-1" />
            <select aria-label={hi ? "शहर" : "City"} value={city} onChange={(e) => setCity(e.target.value)} className="h-11 rounded-full border border-input bg-background px-4 text-sm shadow-sm">
              <option value="">{hi ? "सभी शहर" : "All cities"}</option>
              {(facets.data?.cities ?? []).map((c) => <option key={c.name} value={c.name}>{c.name} ({c.n})</option>)}
            </select>
          </div>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            <button type="button" onClick={() => setCategory("")} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!category ? "border-amber-600 bg-amber-600 text-white" : "border-border bg-background hover:border-amber-500"}`}>{hi ? "सभी" : "All"}</button>
            {CATEGORIES.filter((c) => facets.data?.categories.some((x) => x.name === c.key)).map((c) => (
              <button key={c.key} type="button" onClick={() => setCategory(c.key)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${category === c.key ? "border-amber-600 bg-amber-600 text-white" : "border-border bg-background hover:border-amber-500"}`}>{c.icon} {catLabel(c.key, hi)} <span className="opacity-70">{facets.data?.categories.find((x) => x.name === c.key)?.n}</span></button>
            ))}
          </div>
          {list.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-muted" />)}</div> : null}
          {rows.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{rows.map((b) => <BizCard key={b.id} b={b} hi={hi} />)}</div> : null}
          {list.isSuccess && !rows.length ? <EmptyState icon={<Store />} title={q || category || city ? (hi ? "कोई व्यापार नहीं मिला" : "No business found") : (hi ? "अभी कोई व्यापार पेज नहीं" : "No business pages yet")} text={hi ? "अपनी दुकान या सेवा का मुफ़्त पेज बनाने वाले पहले सदस्य बनिए।" : "Be the first member to create a free page for your shop or service."} /> : null}
          <p className="text-center text-xs text-muted-foreground">{hi ? "मुफ़्त पेज पर रोज़ 1 पोस्ट। व्यापार की पोस्ट समुदाय के \"व्यापार\" टैब में दिखती है।" : "Free pages can post once a day. Business posts show in the community Business tab."} <Link to="/community" className="underline">{hi ? "समुदाय पर जाएँ" : "Go to community"}</Link></p>
        </div>
      </section>
      {creating ? <BizEditor hi={hi} onClose={() => setCreating(false)} /> : null}
    </>
  );
}
