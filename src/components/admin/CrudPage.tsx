import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/site/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type AdminField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "checkbox" | "url" | "select";
  hint?: string;
  required?: boolean;
  full?: boolean;
  /** Allowed values for a select field; first option is used as the default. */
  options?: string[];
};

export type AdminColumn = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

/** Supabase errors are plain objects, not Error instances — read their message. */
function errText(e: unknown, fallback: string) {
  if (e && typeof e === "object") {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function CrudPage({
  table,
  title,
  description,
  columns,
  fields,
  orderBy = "created_at",
  ascending = false,
  slugFrom,
  defaults = {},
}: {
  table: string;
  title: string;
  description?: string;
  columns: AdminColumn[];
  fields: AdminField[];
  orderBy?: string;
  ascending?: boolean;
  slugFrom?: string;
  defaults?: Record<string, unknown>;
}) {
  const qc = useQueryClient();
  const tenant = useTenant();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const list = useQuery({
    queryKey: ["admin", table, tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("organization_id", tenant.organization_id)
        .order(orderBy, { ascending })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload: Record<string, any> = { ...defaults, ...values, organization_id: tenant.organization_id };
      if (slugFrom && !payload["slug"] && payload[slugFrom]) {
        payload["slug"] = slugify(String(payload[slugFrom]));
      }
      for (const k of Object.keys(payload)) {
        const empty = payload[k] === "" || payload[k] === null;
        // On create, leave blanks out so the database defaults apply
        // (several columns are required and reject an explicit blank).
        if (empty && !editing?.id) delete payload[k];
        else if (payload[k] === "") payload[k] = null;
      }
      if (editing?.id) {
        const { error } = await supabase
          .from(table as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(errText(e, "Could not save")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(errText(e, "Could not delete")),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Record<string, any> = {};
    for (const f of fields) {
      if (f.type === "checkbox") {
        values[f.key] = form.get(f.key) === "on";
      } else if (f.type === "number") {
        const v = form.get(f.key);
        values[f.key] = v === "" || v === null ? null : Number(v);
      } else {
        values[f.key] = (form.get(f.key) as string) ?? "";
      }
    }
    save.mutate(values);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> New
        </Button>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-left">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                  Loading…
                </td>
              </tr>
            ) : list.data?.length ? (
              list.data.map((row: any) => (
                <tr key={row.id} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c.key} className="max-w-xs truncate px-4 py-3">
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this record?")) remove.mutate(row.id);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "New"} — {title}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const value = editing?.[f.key];
              if (f.type === "checkbox") {
                return (
                  <label
                    key={f.key}
                    className={`flex items-center gap-3 text-sm ${f.full ? "sm:col-span-2" : ""}`}
                  >
                    <Checkbox name={f.key} defaultChecked={value ?? true} />
                    <span>{f.label}</span>
                  </label>
                );
              }
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  required={f.required}
                  className={f.full ? "sm:col-span-2" : undefined}
                >
                  {f.type === "textarea" ? (
                    <Textarea name={f.key} rows={5} defaultValue={value ?? ""} required={f.required} />
                  ) : f.type === "select" ? (
                    <select
                      name={f.key}
                      defaultValue={value ?? f.options?.[0] ?? ""}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      name={f.key}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      defaultValue={
                        f.type === "date" && value ? String(value).slice(0, 10) : (value ?? "")
                      }
                      required={f.required}
                    />
                  )}
                </Field>
              );
            })}
            <DialogFooter className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
