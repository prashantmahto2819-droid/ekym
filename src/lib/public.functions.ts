import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

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
  const { data } = await sb().from("organization_settings").select("*").limit(1).maybeSingle();
  return data;
});

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
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
    c.from("homepage_sections").select("*").eq("active", true).order("display_order"),
    c.from("homepage_slides").select("*").eq("active", true).order("display_order"),
    c.from("festival_slides").select("*").eq("active", true).order("display_order"),
    c.from("seva_projects").select("*").eq("active", true).order("display_order"),
    c
      .from("contributors")
      .select("*")
      .gte("contribution_date", since)
      .order("contribution_date", { ascending: false }),
    c
      .from("blogs")
      .select("id,title,slug,excerpt,featured_image,published_at,city,state")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    c
      .from("news")
      .select("*")
      .eq("status", "published")
      .eq("display_homepage", true)
      .order("published_at", { ascending: false })
      .limit(8),
    c.from("videos").select("*").eq("active", true).order("display_order").limit(6),
    c.from("reels").select("*").eq("active", true).order("display_order").limit(8),
    c
      .from("campaigns")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
    c
      .from("testimonials")
      .select("*")
      .eq("active", true)
      .eq("approved", true)
      .order("display_order")
      .limit(8),
    c
      .from("blood_requirements")
      .select(
        "id,requirement_id,blood_group,component,units_required,hospital,city,district,state,urgency,required_date,requester_name,requester_mobile,requester_whatsapp,verification_status",
      )
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
  const { data } = await sb()
    .from("seva_projects")
    .select("*")
    .eq("active", true)
    .order("display_order");
  return data ?? [];
});

export const getSevaProject = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const c = sb();
    const { data: project } = await c
      .from("seva_projects")
      .select("*")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (!project) return null;

    const [blogs, contributors, galleries, videos] = await Promise.all([
      c
        .from("blogs")
        .select("id,title,slug,excerpt,featured_image,published_at")
        .eq("seva_project_id", project.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(6),
      c
        .from("contributors")
        .select("*")
        .eq("seva_project_id", project.id)
        .order("contribution_date", { ascending: false })
        .limit(8),
      c.from("galleries").select("*").eq("active", true).order("display_order").limit(3),
      c.from("videos").select("*").eq("active", true).order("display_order").limit(3),
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
  const { data } = await sb()
    .from("blogs")
    .select("id,title,slug,excerpt,featured_image,published_at,state,city,seva_project_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
});

export const getBlog = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const c = sb();
    const { data: blog } = await c
      .from("blogs")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!blog) return null;
    const { data: related } = await c
      .from("blogs")
      .select("id,title,slug,excerpt,featured_image,published_at")
      .eq("status", "published")
      .neq("id", blog.id)
      .order("published_at", { ascending: false })
      .limit(3);
    return { blog, related: related ?? [] };
  });

export const getNewsList = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb()
    .from("news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  return data ?? [];
});

export const getNewsItem = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const { data: item } = await sb()
      .from("news")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return item;
  });

export const getCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb()
    .from("campaigns")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getCampaign = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: str(d?.slug) }))
  .handler(async ({ data }) => {
    const { data: item } = await sb()
      .from("campaigns")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    return item;
  });

export const getGalleries = createServerFn({ method: "GET" }).handler(async () => {
  const c = sb();
  const { data: galleries } = await c
    .from("galleries")
    .select("*")
    .eq("active", true)
    .order("display_order");
  const { data: items } = await c.from("gallery_items").select("*").order("display_order");
  return { galleries: galleries ?? [], items: items ?? [] };
});

export const getVideos = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb().from("videos").select("*").eq("active", true).order("display_order");
  return data ?? [];
});

export const getReels = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb().from("reels").select("*").eq("active", true).order("display_order");
  return data ?? [];
});

export const getBloodRequirements = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb()
    .from("blood_requirements")
    .select(
      "id,requirement_id,patient_name,blood_group,component,units_required,hospital,hospital_contact,city,district,state,urgency,required_date,requester_name,requester_mobile,requester_whatsapp,verification_status,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

export const getLibraryData = createServerFn({ method: "GET" }).handler(async () => {
  const c = sb();
  const [books, categories] = await Promise.all([
    c
      .from("books")
      .select(
        "id,book_id,title,subtitle,author,publisher,language,subject,class_level,available_quantity,quantity,cover_image,category_id,shelf",
      )
      .eq("status", "active")
      .order("title")
      .limit(300),
    c.from("book_categories").select("*").eq("active", true).order("display_order"),
  ]);
  return { books: books.data ?? [], categories: categories.data ?? [] };
});

export const getInternshipPrograms = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await sb()
    .from("internship_programs")
    .select("*")
    .eq("active", true)
    .order("display_order");
  return data ?? [];
});

/** Slugs for the dynamic sitemap. */
export const getSitemapEntries = createServerFn({ method: "GET" }).handler(async () => {
  const c = sb();
  const [blogs, news, seva, campaigns] = await Promise.all([
    c.from("blogs").select("slug,updated_at").eq("status", "published"),
    c.from("news").select("slug,updated_at").eq("status", "published"),
    c.from("seva_projects").select("slug,updated_at").eq("active", true),
    c.from("campaigns").select("slug,updated_at").eq("status", "published"),
  ]);
  return {
    blogs: blogs.data ?? [],
    news: news.data ?? [],
    seva: seva.data ?? [],
    campaigns: campaigns.data ?? [],
  };
});
