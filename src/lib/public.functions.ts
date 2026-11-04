import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { tenantId } from "@/core/tenant.server";

/** Read-only publishable client. Public RLS policies apply (published/active rows only). */
function sb() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export const getOrganization = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("organization_settings").select("*").eq("organization_id", org).limit(1).maybeSingle();
  return data;
});

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    sections,
    slides,
    festivals,
    seva,
    contributors,
    blogs,
    news,
    videos,
    reels,
    campaigns,
    testimonials,
    requirements,
  ] = await Promise.all([
    c.from("homepage_sections").select("*").eq("organization_id", org).eq("active", true).order("display_order"),
    c.from("homepage_slides").select("*").eq("organization_id", org).eq("active", true).order("display_order"),
    c.from("festival_slides").select("*").eq("organization_id", org).eq("active", true).order("display_order"),
    c.from("seva_projects").select("*").eq("organization_id", org).eq("active", true).order("display_order"),
    c
      .from("contributors")
      .select("*").eq("organization_id", org)
      .gte("contribution_date", since)
      .order("contribution_date", { ascending: false }),
    c
      .from("blogs")
      .select("id,title,slug,excerpt,featured_image,published_at,city,state").eq("organization_id", org)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    c
      .from("news")
      .select("*").eq("organization_id", org)
      .eq("status", "published")
      .eq("display_homepage", true)
      .order("published_at", { ascending: false })
      .limit(8),
    c.from("videos").select("*").eq("organization_id", org).eq("active", true).order("display_order").limit(6),
    c.from("reels").select("*").eq("organization_id", org).eq("active", true).order("display_order").limit(8),
    c
      .from("campaigns")
      .select("*").eq("organization_id", org)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
    c
      .from("testimonials")
      .select("*").eq("organization_id", org)
      .eq("active", true)
      .eq("approved", true)
      .order("display_order")
      .limit(8),
    c
      .from("blood_requirements")
      .select(
        "id,requirement_id,blood_group,component,units_required,hospital,city,district,state,urgency,required_date,requester_name,requester_mobile,requester_whatsapp,verification_status",
      ).eq("organization_id", org)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return {
    sections: sections.data ?? [],
    slides: slides.data ?? [],
    festivals: festivals.data ?? [],
    seva: seva.data ?? [],
    contributors: contributors.data ?? [],
    blogs: blogs.data ?? [],
    news: news.data ?? [],
    videos: videos.data ?? [],
    reels: reels.data ?? [],
    campaigns: campaigns.data ?? [],
    testimonials: testimonials.data ?? [],
    requirements: requirements.data ?? [],
  };
});

export const getSevaProjects = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("seva_projects")
    .select("*").eq("organization_id", org)
    .eq("active", true)
    .order("display_order");
  return data ?? [];
});

export const getSevaProject = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const c = sb();
    const { data: project } = await c
      .from("seva_projects")
      .select("*").eq("organization_id", org)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!project) return null;

    const [blogs, contributors, galleries, videos] = await Promise.all([
      c
        .from("blogs")
        .select("id,title,slug,excerpt,featured_image,published_at").eq("organization_id", org)
        .eq("seva_project_id", project.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(6),
      c
        .from("contributors")
        .select("*").eq("organization_id", org)
        .eq("seva_project_id", project.id)
        .order("contribution_date", { ascending: false })
        .limit(8),
      c.from("galleries").select("*").eq("organization_id", org).eq("active", true).order("display_order").limit(3),
      c.from("videos").select("*").eq("organization_id", org).eq("active", true).order("display_order").limit(3),
    ]);

    return {
      project,
      blogs: blogs.data ?? [],
      contributors: contributors.data ?? [],
      galleries: galleries.data ?? [],
      videos: videos.data ?? [],
    };
  });

export const getBlogs = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("blogs")
    .select("id,title,slug,excerpt,featured_image,published_at,state,city,seva_project_id").eq("organization_id", org)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
});

export const getBlog = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const c = sb();
    const { data: blog } = await c
      .from("blogs")
      .select("*").eq("organization_id", org)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!blog) return null;
    const { data: related } = await c
      .from("blogs")
      .select("id,title,slug,excerpt,featured_image,published_at").eq("organization_id", org)
      .eq("status", "published")
      .neq("id", blog.id)
      .order("published_at", { ascending: false })
      .limit(3);
    return { blog, related: related ?? [] };
  });

export const getNewsList = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("news")
    .select("*").eq("organization_id", org)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
});

export const getNewsItem = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: item } = await sb()
      .from("news")
      .select("*").eq("organization_id", org)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return item;
  });

export const getCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("campaigns")
    .select("*").eq("organization_id", org)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getCampaign = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: item } = await sb()
      .from("campaigns")
      .select("*").eq("organization_id", org)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return item;
  });

export const getGalleries = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const { data: galleries } = await c
    .from("galleries")
    .select("*").eq("organization_id", org)
    .eq("active", true)
    .order("display_order");
  const { data: items } = await c.from("gallery_items").select("*").eq("organization_id", org).order("display_order");
  return { galleries: galleries ?? [], items: items ?? [] };
});

export const getVideos = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("videos").select("*").eq("organization_id", org).eq("active", true).order("display_order");
  return data ?? [];
});

export const getReels = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("reels").select("*").eq("organization_id", org).eq("active", true).order("display_order");
  return data ?? [];
});

export const getBloodRequirements = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("blood_requirements")
    .select(
      "id,requirement_id,patient_name,blood_group,component,units_required,hospital,hospital_contact,city,district,state,urgency,required_date,requester_name,requester_mobile,requester_whatsapp,verification_status,created_at",
    ).eq("organization_id", org)
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

export const getLibraryData = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const [books, categories] = await Promise.all([
    c
      .from("books")
      .select(
        "id,book_id,title,subtitle,author,publisher,language,subject,class_level,available_quantity,quantity,cover_image,category_id,shelf",
      ).eq("organization_id", org)
      .eq("status", "active")
      .order("title")
      .limit(300),
    c.from("book_categories").select("*").eq("organization_id", org).eq("active", true).order("display_order"),
  ]);
  return { books: books.data ?? [], categories: categories.data ?? [] };
});

export const getInternshipPrograms = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("internship_programs")
    .select("*").eq("organization_id", org)
    .eq("active", true)
    .order("display_order");
  return data ?? [];
});

/** Slugs for the dynamic sitemap. */
export const getSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const [blogs, news, seva, campaigns] = await Promise.all([
    c.from("blogs").select("slug,updated_at").eq("organization_id", org).eq("status", "published"),
    c.from("news").select("slug,updated_at").eq("organization_id", org).eq("status", "published"),
    c.from("seva_projects").select("slug,updated_at").eq("organization_id", org).eq("active", true),
    c.from("campaigns").select("slug,updated_at").eq("organization_id", org).eq("status", "published"),
  ]);
  return {
    blogs: blogs.data ?? [],
    news: news.data ?? [],
    seva: seva.data ?? [],
    campaigns: campaigns.data ?? [],
  };
});

export const getTeam = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const [committees, positions] = await Promise.all([
    c.from("gov_committees").select("id,name,name_hi,kind,tenure_from,tenure_to,display_order").eq("organization_id", org).eq("status", "active").order("display_order"),
    c.from("gov_positions_public").select("*").eq("organization_id", org).order("rank"),
  ]);
  return {
    committees: committees.data ?? [],
    positions: (positions.data ?? []) as {
      id: string; committee_id: string; person_name: string; person_name_hi: string | null; designation: string;
      designation_hi: string | null; rank: number; phone: string | null; photo_path: string | null; city: string | null;
    }[],
  };
});

export const getAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb()
    .from("gov_announcements")
    .select("id,title,title_hi,body,body_hi,pinned,publish_at")
    .eq("organization_id", org)
    .order("pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(20);
  return data ?? [];
});

export const verifyDocument = createServerFn({ method: "GET" })
  .inputValidator((d: { code: string }) => ({ code: String(d.code ?? "").trim().slice(0, 32) }))
  .handler(async ({ data }) => {
    const { data: rows } = await sb().rpc("k1_verify_document", { p_code: data.code });
    const first = (rows ?? [])[0];
    return (first as { kind: string; ref_no: string; doc_date: string; title: string; status: string; organization: string; recipient_name: string | null; issued_at: string | null } | undefined) ?? null;
  });

/* --------------------------- PUBLISHING (Phase 8) --------------------------- */
export const getCentralFeed = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().rpc("k1_central_feed", { p_org: org, p_limit: 60, p_status: "approved" } as never);
  return (data ?? []) as { kind: string; id: string; organization_id: string; org_name: string; org_slug: string; title: string; slug: string; excerpt: string | null; image: string | null; published_at: string | null }[];
});

export const getIssues = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("pub_issues").select("id,title,title_hi,slug,issue_no,issue_date,description,cover_path,access,status,views").eq("organization_id", org).eq("status", "published").order("issue_date", { ascending: false }).limit(100);
  return data ?? [];
});

export const getIssue = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: issue } = await sb().from("pub_issues").select("*").eq("organization_id", org).eq("slug", data.slug).eq("status", "published").maybeSingle();
    return issue;
  });

/** Everything the sitemap / RSS need, in one call. */
export const getSitemapData = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const [blogs, news, seva, campaigns, issues, pages] = await Promise.all([
    c.from("blogs").select("slug,updated_at,published_at,title,excerpt").eq("organization_id", org).eq("status", "published").order("published_at", { ascending: false }).limit(1000),
    c.from("news").select("slug,updated_at,published_at,title,description").eq("organization_id", org).eq("status", "published").order("published_at", { ascending: false }).limit(1000),
    c.from("seva_projects").select("slug,updated_at").eq("organization_id", org).eq("active", true).limit(500),
    c.from("campaigns").select("slug,updated_at").eq("organization_id", org).eq("status", "published").limit(500),
    c.from("pub_issues").select("slug,updated_at").eq("organization_id", org).eq("status", "published").eq("access", "public").limit(500),
    c.from("cms_pages").select("slug,updated_at,is_home").eq("organization_id", org).eq("status", "published").limit(500),
  ]);
  return { blogs: blogs.data ?? [], news: news.data ?? [], seva: seva.data ?? [], campaigns: campaigns.data ?? [], issues: issues.data ?? [], pages: pages.data ?? [] };
});

/* --------------------------- WEBSITE BUILDER (Phase 9) --------------------------- */
export const getPage = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: page } = await sb().from("cms_pages").select("id,slug,title,title_hi,blocks,seo,is_home,updated_at").eq("organization_id", org).eq("slug", data.slug).eq("status", "published").maybeSingle();
    return page;
  });

export const getHomePage = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data: page } = await sb().from("cms_pages").select("id,slug,title,title_hi,blocks,seo,is_home,updated_at").eq("organization_id", org).eq("status", "published").eq("is_home", true).maybeSingle();
  return page;
});

export const getMenus = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const c = sb();
  const [menus, pages] = await Promise.all([
    c.from("cms_menus").select("location,items").eq("organization_id", org),
    c.from("cms_pages").select("slug,title,title_hi,menu_order").eq("organization_id", org).eq("status", "published").eq("show_in_menu", true).order("menu_order"),
  ]);
  const out: { header: MenuItem[] | null; footer: MenuItem[] | null; pages: { slug: string; title: string; title_hi: string | null }[] } = { header: null, footer: null, pages: pages.data ?? [] };
  for (const m of menus.data ?? []) { const items = (m.items as unknown as MenuItem[]) ?? []; if (m.location === "header" && items.length) out.header = items; if (m.location === "footer" && items.length) out.footer = items; }
  return out;
});
export type MenuItem = { label: string; label_hi?: string; to: string; children?: MenuItem[] };

/* --------------------------- EVENTS (Phase 10) --------------------------- */
export const getEvents = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("ev_events").select("id,slug,title,title_hi,kind,starts_at,ends_at,venue,venue_hi,cover_image,status,registration_open").eq("organization_id", org).in("status", ["published", "done"]).order("starts_at", { ascending: false }).limit(100);
  return data ?? [];
});
export const getEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: ev } = await sb().from("ev_events").select("*").eq("organization_id", org).eq("slug", data.slug).in("status", ["published", "done"]).maybeSingle();
    return ev;
  });
export const getRsvpInfo = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => ({ token: str(d?.token) }))
  .handler(async ({ data }) => {
    const { data: info } = await sb().rpc("k1_rsvp_info", { p_token: data.token } as never);
    return (info ?? null) as null | { guest: { name: string; seats: number; rsvp: string; rsvp_note: string | null; checked_in: boolean }; event: { title: string; title_hi: string | null; starts_at: string; ends_at: string | null; venue: string | null; venue_hi: string | null; map_url: string | null; cover_image: string | null; status: string; slug: string }; org: { name: string; name_hi: string | null } };
  });

/* --------------------------- COMMUNITY (Phase 11) --------------------------- */
export const getListings = createServerFn({ method: "GET" })
  .inputValidator((d: { kinds: string[] }) => ({ kinds: Array.isArray(d?.kinds) ? d.kinds.map(str) : [] }))
  .handler(async ({ data }) => {
    const org = await tenantId();
    const { data: rows } = await sb().from("cm_listings").select("id,kind,title,title_hi,body,body_hi,category,fields,contact_name,phone,email,website,address,city,district,state,image,featured,expires_at,views,created_at").eq("organization_id", org).eq("status", "approved").in("kind", data.kinds).order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(500);
    return rows ?? [];
  });
export const getPolls = createServerFn({ method: "GET" }).handler(async () => {
  const org = await tenantId();
  const { data } = await sb().from("cm_polls").select("id,question,question_hi,description,options,audience,status,ends_at,open_results").eq("organization_id", org).eq("audience", "public").in("status", ["open", "closed"]).order("created_at", { ascending: false }).limit(20);
  return data ?? [];
});
