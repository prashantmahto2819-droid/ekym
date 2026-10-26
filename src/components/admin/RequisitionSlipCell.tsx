import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { requisitionSlipUrl } from "@/lib/photos.functions";

/** Opens a short-lived private link to the uploaded hospital requisition slip. */
export function RequisitionSlipCell({ path }: { path?: string | null }) {
  const [busy, setBusy] = useState(false);

  if (!path) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { url } = await requisitionSlipUrl({ data: { path } });
          window.open(url, "_blank", "noopener");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not open the slip");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Opening…" : "View slip"}
    </Button>
  );
}
