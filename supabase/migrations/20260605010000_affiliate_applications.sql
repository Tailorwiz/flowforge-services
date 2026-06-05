-- =====================================================================
-- JobIntel 360 — Affiliate public applications
-- Public application form -> admin review -> approve creates an affiliate.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_applications (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  email                text NOT NULL,
  company              text,
  website              text,
  audience             text,        -- how/where they'll promote
  promo_plan           text,        -- their pitch
  social_links         text,
  status               text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at          timestamptz,
  created_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_applications_status_idx ON public.affiliate_applications(status);
CREATE INDEX IF NOT EXISTS affiliate_applications_email_idx  ON public.affiliate_applications(lower(email));

ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

-- Admins manage everything; public submits only via the RPC below.
DROP POLICY IF EXISTS "appl admin all" ON public.affiliate_applications;
CREATE POLICY "appl admin all" ON public.affiliate_applications FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Public RPC: submit an application (anon allowed).
CREATE OR REPLACE FUNCTION public.submit_affiliate_application(
  p_name text,
  p_email text,
  p_company text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_audience text DEFAULT NULL,
  p_promo_plan text DEFAULT NULL,
  p_social_links text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_name IS NULL OR p_email IS NULL OR length(trim(p_name)) = 0 OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'Name and email are required';
  END IF;

  -- Soft de-dupe: collapse repeat pending applications from the same email.
  SELECT id INTO v_id FROM public.affiliate_applications
    WHERE lower(email) = lower(p_email) AND status = 'pending'
    ORDER BY created_at DESC LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.affiliate_applications
      SET name = p_name, company = p_company, website = p_website,
          audience = p_audience, promo_plan = p_promo_plan, social_links = p_social_links,
          created_at = now()
      WHERE id = v_id;
    RETURN v_id;
  END IF;

  INSERT INTO public.affiliate_applications
    (name, email, company, website, audience, promo_plan, social_links)
  VALUES (p_name, lower(p_email), p_company, p_website, p_audience, p_promo_plan, p_social_links)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_affiliate_application(text, text, text, text, text, text, text)
  TO anon, authenticated;

-- Admin RPC: approve an application -> create an affiliate with a fresh code.
CREATE OR REPLACE FUNCTION public.approve_affiliate_application(
  p_application_id uuid,
  p_commission_plan_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app  public.affiliate_applications%ROWTYPE;
  v_code text;
  v_aff  uuid;
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve applications';
  END IF;

  SELECT * INTO app FROM public.affiliate_applications WHERE id = p_application_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF app.created_affiliate_id IS NOT NULL THEN RETURN app.created_affiliate_id; END IF;

  -- Reuse an existing affiliate with the same email if present.
  SELECT id INTO v_aff FROM public.affiliates WHERE lower(email) = lower(app.email) LIMIT 1;

  IF v_aff IS NULL THEN
    v_code := public.generate_referral_code(app.name);
    INSERT INTO public.affiliates
      (name, email, company, referral_code, status, commission_plan_id, invited_by, notes)
    VALUES (app.name, lower(app.email), app.company, v_code, 'invited',
            p_commission_plan_id, auth.uid(),
            'Approved from public application')
    RETURNING id INTO v_aff;
  END IF;

  UPDATE public.affiliate_applications
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), created_affiliate_id = v_aff
    WHERE id = p_application_id;

  RETURN v_aff;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_affiliate_application(uuid, uuid) TO authenticated;
