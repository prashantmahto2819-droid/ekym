import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { pageMeta } from "@/core/seo";

import { Field, FormSuccess, FormError } from "@/components/site/Field";
import { LocationFields } from "@/components/site/LocationFields";
import { PageHeader } from "@/components/site/PageHeader";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitBookDonation, type BookDonationInput } from "@/lib/forms.functions";
import { libraryQuery } from "@/lib/queries";

export const Route = createFileRoute("/library")({
  loader: ({ context }) => context.queryClient.ensureQueryData(libraryQuery()),
  head: ({ matches }) => pageMeta(matches, { en: "Community library", hi: "पुस्तकालय" }, { en: "Search the catalogue or donate books.", hi: "सूची खोजें या पुस्तकें दान करें।" }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data } = useSuspenseQuery(libraryQuery());
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");

  const books = useMemo(
    () =>
      data.books.filter((b: any) => {
        const matchesQ = `${b.title} ${b.author ?? ""} ${b.subject ?? ""} ${b.language ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase());
        const matchesCat = !category || b.category_id === category;
        return matchesQ && matchesCat;
      }),
    [data.books, q, category],
  );

  return (
    <>
      <PageHeader
        title="Community library"
        description="A free reading room and lending library for students in our area."
        crumbs={[{ label: "Library" }]}
      />

      <section className="section-y">
        <div className="container-page">
          <SectionHeading
            eyebrow={`${data.books.length} titles`}
            title="Browse the catalogue"
            subtitle="Search by title, author, subject or language. Come to the library to borrow."
          />
          <div className="mb-6 flex flex-col gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search books"
              aria-label="Search books"
              className="max-w-md"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  !category ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                }`}
              >
                All
              </button>
              {data.categories.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    category === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {books.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((b: any) => (
                <article key={b.id} className="surface-card flex gap-4 p-4">
                  {b.cover_image ? (
                    <img src={b.cover_image} alt="" loading="lazy" className="h-28 w-20 rounded object-cover" />
                  ) : (
                    <span className="bg-primary-soft text-primary-deep flex h-28 w-20 items-center justify-center rounded">
                      <BookOpen className="size-6" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-semibold">{b.title}</h3>
                    {b.author ? <p className="text-xs text-muted-foreground">{b.author}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[b.language, b.subject, b.class_level].filter(Boolean).join(" · ")}
                    </p>
                    <Badge
                      variant={b.available_quantity > 0 ? "secondary" : "outline"}
                      className="mt-2"
                    >
                      {b.available_quantity > 0 ? `${b.available_quantity} available` : "On loan"}
                    </Badge>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No books match this search yet. Our catalogue is growing every week.
            </p>
          )}
        </div>
      </section>

      <section className="bg-secondary/60 section-y">
        <div className="container-page max-w-3xl">
          <SectionHeading
            eyebrow="Book donation"
            title="Donate books to the library"
            subtitle="Textbooks, competitive exam guides, children's books and general reading are all welcome."
          />
          <BookDonationForm />
        </div>
      </section>
    </>
  );
}

function BookDonationForm() {
  const [sent, setSent] = useState(false);
  const [pickup, setPickup] = useState(false);
  const form = useForm<BookDonationInput>();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await submitBookDonation({ data: { ...values, pickup_required: pickup } });
      setSent(true);
      toast.success("Thank you. We will contact you about collection.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not submit your offer";
      setFormError(msg);
      toast.error(msg);
    }
  });

  if (sent) {
    return (
      <FormSuccess
        title="Book donation received"
        text="Our library team will contact you to arrange collection or a drop-off point."
      />
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-card grid gap-4 p-6 sm:grid-cols-2">
      <Field label="Your name" required error={errors.donor_name?.message}>
        <Input {...register("donor_name", { required: "Please enter your name" })} />
      </Field>
      <Field label="Mobile" required error={errors.mobile?.message}>
        <Input type="tel" {...register("mobile", { required: "Mobile number is required" })} />
      </Field>
      <Field label="WhatsApp" error={errors.whatsapp?.message}>
        <Input type="tel" {...register("whatsapp")} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" {...register("email")} />
      </Field>
      <Field label="Approximate number of books" error={errors.book_count?.message}>
        <Input type="number" {...register("book_count")} />
      </Field>
      <Field label="Condition" hint="new, good, usable" error={errors.condition?.message}>
        <Input {...register("condition")} />
      </Field>
      <LocationFields form={form} />
      <Field label="Pincode" error={errors.pincode?.message}>
        <Input {...register("pincode")} />
      </Field>
      <Field label="Address" className="sm:col-span-2" error={errors.address?.message}>
        <Textarea rows={2} {...register("address")} />
      </Field>
      <Field label="Preferred date" error={errors.preferred_date?.message}>
        <Input type="date" {...register("preferred_date")} />
      </Field>
      <label className="flex items-center gap-3 self-end text-sm">
        <Checkbox checked={pickup} onCheckedChange={(v) => setPickup(v === true)} />
        <span className="text-muted-foreground">I need pickup from my address</span>
      </label>
      <Field label="What kind of books?" className="sm:col-span-2" error={errors.description?.message}>
        <Textarea rows={3} {...register("description")} />
      </Field>
      <div className="sm:col-span-2">
        <FormError
          message={formError ?? (Object.keys(errors).length ? "Please fill the required fields highlighted above and try again." : null)}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit book donation"}
        </Button>
      </div>
    </form>
  );
}
