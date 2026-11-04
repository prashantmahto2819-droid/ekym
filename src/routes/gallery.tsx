import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { siteName } from "@/core/seo";

import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { galleryQuery } from "@/lib/queries";

export const Route = createFileRoute("/gallery")({
  loader: ({ context }) => context.queryClient.ensureQueryData(galleryQuery()),
  head: ({ matches }) => ({
    meta: [
      { title: `Photo gallery — ${siteName(matches)}` },
      {
        name: "description",
        content:
          `Photographs from ${siteName(matches)}'s kitchens, blood donation camps, library and community programmes.`,
      },
      { property: "og:title", content: `Photo gallery — ${siteName(matches)}` },
      { property: "og:description", content: "Moments from our seva, captured by our volunteers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const { data } = useSuspenseQuery(galleryQuery());
  const [active, setActive] = useState<{ image: string; caption?: string | null } | null>(null);

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Moments from our kitchens, camps, classrooms and community drives."
        crumbs={[{ label: "Gallery" }]}
      />
      <section className="section-y">
        <div className="container-page space-y-12">
          {data.galleries.length ? (
            data.galleries.map((g: any) => {
              const items = data.items.filter((i: any) => i.gallery_id === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id}>
                  <SectionHeading title={g.title} subtitle={g.description} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((i: any) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setActive({ image: i.image, caption: i.caption })}
                        className="surface-card lift-on-hover overflow-hidden text-left"
                      >
                        <img
                          src={i.image}
                          alt={i.caption ?? ""}
                          loading="lazy"
                          className="h-56 w-full object-cover"
                        />
                        {i.caption ? (
                          <p className="p-3 text-sm text-muted-foreground">{i.caption}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">Photos will be published here soon.</p>
          )}
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">{active?.caption ?? "Gallery image"}</DialogTitle>
          {active ? (
            <img src={active.image} alt={active.caption ?? ""} className="w-full rounded-lg" />
          ) : null}
          {active?.caption ? (
            <p className="text-sm text-muted-foreground">{active.caption}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
