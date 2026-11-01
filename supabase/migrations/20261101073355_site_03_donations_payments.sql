CREATE TYPE public.donation_type AS ENUM ('general','bhojan_sewa','education','library','ambulance','medical','blood','campaign','seva_project','other');
CREATE TYPE public.payment_status AS ENUM ('CREATED','PENDING','PAID','FAILED','REFUNDED','CANCELLED');
CREATE SEQUENCE public.donation_number_seq;
CREATE SEQUENCE public.receipt_number_seq;

CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id text NOT NULL UNIQUE,
  donor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL, donor_email text, donor_mobile text NOT NULL, donor_whatsapp text,
  pan text, address text, state text, district text, city text, pincode text,
  donation_type public.donation_type NOT NULL DEFAULT 'general',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  seva_project_id uuid REFERENCES public.seva_projects(id) ON DELETE SET NULL,
  purpose text, message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  status public.payment_status NOT NULL DEFAULT 'CREATED',
  razorpay_order_id text UNIQUE, razorpay_payment_id text UNIQUE,
  payment_method text, failure_reason text, paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donations_user_idx ON public.donations(donor_user_id);
CREATE INDEX donations_campaign_idx ON public.donations(campaign_id);
CREATE INDEX donations_status_idx ON public.donations(status);
CREATE INDEX donations_created_idx ON public.donations(created_at DESC);
GRANT SELECT ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donors read own donations" ON public.donations FOR SELECT TO authenticated USING (donor_user_id = auth.uid());
CREATE POLICY "Finance staff read donations" ON public.donations FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','ACCOUNTANT','AUDITOR']::public.app_role[]));
CREATE POLICY "Admins update donations" ON public.donations FOR UPDATE TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','ACCOUNTANT']::public.app_role[]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','ACCOUNTANT']::public.app_role[]));

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid REFERENCES public.donations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'RAZORPAY',
  purpose text NOT NULL DEFAULT 'DONATION',
  razorpay_order_id text, razorpay_payment_id text, razorpay_signature text, event text,
  status public.payment_status NOT NULL DEFAULT 'CREATED',
  amount numeric(12,2), currency text NOT NULL DEFAULT 'INR', method text,
  error_code text, error_description text, raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_tx_donation_idx ON public.payment_transactions(donation_id);
CREATE INDEX payment_tx_order_idx ON public.payment_transactions(razorpay_order_id);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance staff read transactions" ON public.payment_transactions FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','ACCOUNTANT','AUDITOR']::public.app_role[]));

CREATE TABLE public.donation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL UNIQUE REFERENCES public.donations(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  verification_code text NOT NULL UNIQUE,
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  financial_year text,
  amount numeric(12,2) NOT NULL,
  storage_path text, pdf_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.donation_receipts TO authenticated;
GRANT ALL ON public.donation_receipts TO service_role;
ALTER TABLE public.donation_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donors read own receipts" ON public.donation_receipts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.donations d WHERE d.id = public.donation_receipts.donation_id AND d.donor_user_id = auth.uid()));
CREATE POLICY "Finance staff read receipts" ON public.donation_receipts FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','ACCOUNTANT','AUDITOR']::public.app_role[]));

CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'RAZORPAY',
  event_id text NOT NULL, event text NOT NULL, payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz, processing_error text,
  UNIQUE (provider, event_id)
);
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auditors read webhook events" ON public.payment_webhook_events FOR SELECT TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','AUDITOR']::public.app_role[]));

CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  online_payments_enabled boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'INR',
  min_donation_amount numeric(12,2) NOT NULL DEFAULT 10,
  max_donation_amount numeric(12,2) NOT NULL DEFAULT 500000,
  suggested_amounts numeric(12,2)[] NOT NULL DEFAULT ARRAY[101,251,501,1100,2100]::numeric(12,2)[],
  volunteer_fee numeric(12,2) NOT NULL DEFAULT 0,
  internship_fee numeric(12,2) NOT NULL DEFAULT 0,
  receipt_prefix text NOT NULL DEFAULT 'EKYM',
  receipt_footer_note text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment settings are public" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage payment settings" ON public.payment_settings FOR ALL TO authenticated
  USING (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN']::public.app_role[]))
  WITH CHECK (private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN']::public.app_role[]));
INSERT INTO public.payment_settings (receipt_footer_note)
VALUES ('This receipt is computer generated. Please contact the Manch office for any correction.');

CREATE OR REPLACE FUNCTION public.next_donation_id()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'DON-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.donation_number_seq')::text, 6, '0');
$$;
CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT COALESCE((SELECT receipt_prefix FROM public.payment_settings LIMIT 1), 'EKYM')
    || '/' || to_char(now(), 'YYYY') || '/' || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;
REVOKE ALL ON FUNCTION public.next_donation_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.next_receipt_number() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_campaign_raised_amount()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.campaign_id, OLD.campaign_id);
  IF target IS NOT NULL THEN
    UPDATE public.campaigns c
      SET raised_amount = COALESCE((SELECT SUM(d.amount) FROM public.donations d WHERE d.campaign_id = target AND d.status = 'PAID'), 0),
          updated_at = now()
    WHERE c.id = target;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.sync_campaign_raised_amount() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER donations_sync_campaign AFTER INSERT OR UPDATE OF status, amount, campaign_id OR DELETE ON public.donations
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_raised_amount();
CREATE TRIGGER donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payment_tx_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER donation_receipts_updated_at BEFORE UPDATE ON public.donation_receipts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payment_settings_updated_at BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();;
