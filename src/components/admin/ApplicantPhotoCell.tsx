import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PhotoUpload } from "@/components/site/PhotoUpload";
import { applicantPhotoUrl, replaceApplicantPhoto } from "@/lib/photos.functions";

/** Shows a stored applicant photo and lets staff replace it. */
export function ApplicantPhotoCell({
  id,
  path,
  table,
}: {
  id: string;
  path: string | null;
  table: string;
}) {
  const qc = useQueryClient();

  const signed = useQuery({
    queryKey: ["applicant-photo", path],
    enabled: !!path && !path.startsWith("http"),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => (await applicantPhotoUrl({ data: { path: path! } })).url,
  });

  const replace = useMutation({
    mutationFn: async (dataUrl: string) => replaceApplicantPhoto({ data: { id, dataUrl } }),
    onSuccess: () => {
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["admin", table] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update the photo"),
  });

  const preview = path?.startsWith("http") ? path : (signed.data ?? null);

  return (
    <PhotoUpload
      value={path}
      previewUrl={preview}
      label="Add photo"
      hint="Used on the ID card and certificate."
      onUpload={async (dataUrl) => {
        await replace.mutateAsync(dataUrl);
      }}
    />
  );
}
