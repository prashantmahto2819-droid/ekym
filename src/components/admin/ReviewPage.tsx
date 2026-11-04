import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ApplicantPhotoCell } from "@/components/admin/ApplicantPhotoCell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/core/tenant-context";
import { supabase } from "@/integrations/supabase/client";

export type ReviewColumn = {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
};

/** Read + moderate list: search, view details and move a record through statuses. */
export function ReviewPage({
  table,
  title,
  description,
  columns,
  statusField = "status",
  statuses,
  searchKeys,
  orderBy = "created_at",
  photoField,
  rowActions,
}: {
  table: string;
  title: string;
  description?: string;
  columns: ReviewColumn[];
  statusField?: string;
  statuses: string[];
  searchKeys: string[];
  orderBy?: string;
  /** Column holding a stored photo path; staff can view and replace it. */
  photoField?: string;
  rowActions?: (row: any) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const tenant = useTenant();
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["admin", table, tenant.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .eq("organization_id", tenant.organization_id)
        .order(orderBy, { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from(table as any)
        .update({ [statusField]: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const rows = (list.data ?? []).filter((r: any) =>
    searchKeys
      .map((k) => String(r[k] ?? ""))
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        aria-label="Search records"
        className="mb-4 max-w-sm"
      />

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/70 text-left">
            <tr>
              {photoField ? <th className="px-4 py-3 font-semibold">Photo</th> : null}
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 font-semibold">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length + 1}>
                  Loading…
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row: any) => (
                <tr key={row.id} className="border-t border-border align-top">
                  {photoField ? (
                    <td className="px-4 py-3">
                      <ApplicantPhotoCell
                        id={row.id}
                        path={row[photoField] ?? null}
                        table={table}
                      />
                    </td>
                  ) : null}
                  {columns.map((c) => (
                    <td key={c.key} className="max-w-xs px-4 py-3">
                      {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="mb-2">
                      {String(row[statusField] ?? "—")}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {statuses
                        .filter((s) => s !== row[statusField])
                        .map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ id: row.id, status: s })}
                          >
                            {s}
                          </Button>
                        ))}
                    </div>
                    {rowActions ? <div className="mt-2">{rowActions(row)}</div> : null}
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
    </div>
  );
}
