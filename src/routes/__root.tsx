import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { organizationQuery } from "@/lib/queries";
import { getTenant } from "@/core/tenant.functions";
import { getLang } from "@/core/lang.functions";
import { TenantProvider } from "@/core/tenant-context";
import { LangProvider, type Lang } from "@/core/i18n";
import type { Tenant } from "@/core/tenant.server";
import { themeCss, type Branding } from "@/core/theme";
import { AdSlot, ConsentBanner } from "@/components/site/Ads";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ context }) => {
    const [tenant, lang, org] = await Promise.all([
      getTenant() as Promise<Tenant>,
      getLang() as Promise<Lang>,
      context.queryClient.ensureQueryData(organizationQuery()),
    ]);
    return { tenant, lang, org };
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.org?.tagline ? `${loaderData.tenant.name} — ${loaderData.org.tagline}` : loaderData?.tenant.name ?? "Kalchuri One" },
      {
        name: "description",
        content: loaderData?.org?.about_short ?? "Community organization on Kalchuri One.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: loaderData?.tenant.name ?? "Kalchuri One" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.org?.logo ? [{ property: "og:image", content: loaderData.org.logo }] : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: loaderData?.org?.favicon || loaderData?.org?.logo || "/favicon.ico" },
      ...(loaderData?.org?.logo ? [{ rel: "apple-touch-icon", href: loaderData.org.logo }] : []),
      { rel: "alternate", type: "application/rss+xml", title: "RSS", href: "/feed.xml" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Mukta:wght@400;500;700&family=Tiro+Devanagari+Hindi&family=Noto+Serif+Devanagari:wght@400;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const data = Route.useLoaderData();
  return (
    <html lang={data?.lang ?? "en"}>
      <head>
        <HeadContent />
        {themeCss(data?.tenant?.branding as Branding) ? <style dangerouslySetInnerHTML={{ __html: themeCss(data?.tenant?.branding as Branding) }} /> : null}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthWatcher({ queryClient }: { queryClient: QueryClient }) {
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chromeless = pathname.startsWith("/admin") || pathname.startsWith("/auth");
  const { tenant, lang } = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider tenant={tenant}>
        <LangProvider initial={lang}>
          <AuthWatcher queryClient={queryClient} />
          <div className="flex min-h-screen flex-col">
            {chromeless ? null : <Header />}
            {chromeless ? null : <AdSlot slot="header" className="container-page my-2" />}
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <main className="flex-1">
              <Outlet />
            </main>
            {chromeless ? null : <AdSlot slot="footer" className="container-page my-2" />}
            {chromeless ? null : <Footer />}
            {chromeless ? null : <ConsentBanner />}
          </div>
          <Toaster richColors position="top-center" />
        </LangProvider>
      </TenantProvider>
    </QueryClientProvider>
  );
}
