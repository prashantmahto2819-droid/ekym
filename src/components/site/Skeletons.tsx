// Grey placeholders shown while a page or list is loading (instead of "…" or a blank screen).
import { Skeleton } from "@/components/ui/skeleton";

/** Whole page: header band + a grid of cards. Used as the router's pending screen. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="bg-secondary/60 py-14"><div className="container-page space-y-3"><Skeleton className="h-3 w-28" /><Skeleton className="h-9 w-2/3 max-w-md" /><Skeleton className="h-4 w-1/2 max-w-sm" /></div></div>
      <div className="container-page py-10"><CardGridSkeleton n={6} /></div>
    </div>
  );
}

export function CardGridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <Skeleton className="aspect-[16/9] w-full rounded-none" />
          <div className="space-y-2 p-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

/** Feed post placeholder: avatar, name, two lines, a photo. */
export function PostSkeleton({ photo = true }: { photo?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div></div>
      <div className="mt-4 space-y-2"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-5/6" /></div>
      {photo ? <Skeleton className="mt-3 aspect-[16/10] w-full" /> : null}
      <div className="mt-3 flex gap-6"><Skeleton className="h-3 w-14" /><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div>
    </div>
  );
}

/** Rows with an avatar (people, chats, notifications). */
export function ListSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-1 p-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5" style={{ width: `${45 + ((i * 17) % 40)}%` }} /><Skeleton className="h-3 w-1/3" /></div></div>
      ))}
    </div>
  );
}
