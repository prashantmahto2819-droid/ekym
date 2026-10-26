ALTER TABLE public.blood_requirements
  ADD COLUMN IF NOT EXISTS requisition_slip text;

COMMENT ON COLUMN public.blood_requirements.requisition_slip IS
  'Private storage path (bucket blood-requisitions) of the hospital requisition slip uploaded by the requester.';