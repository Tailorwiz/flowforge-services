-- =====================================================================
-- JobIntel 360 — Affiliate / Referral Program
-- Dynamic hybrid commissions (flat + percentage + recurring + tiered),
-- admin-invited affiliates, manual (admin-marked) payouts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Role: add "affiliate" to the existing app_role enum
--    (safe to reference only inside function bodies, never in DDL below)
-- ---------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- ---------------------------------------------------------------------
-- 2. Commission plans — the "dynamic" rule definition
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commission_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  description        text,
  is_default         boolean NOT NULL DEFAULT false,
  status             text NOT NULL DEFAULT 'active', -- active | archived

  -- one-time, on first conversion
  flat_amount        numeric(12,2) NOT NULL DEFAULT 0,   -- $ paid per converted referral
  percent_rate       numeric(6,3)  NOT NULL DEFAULT 0,   -- % of the first sale

  -- recurring, on every subsequent payment of a referred client
  recurring_enabled  boolean NOT NULL DEFAULT false,
  recurring_percent  numeric(6,3)  NOT NULL DEFAULT 0,
  recurring_months   integer,                            -- NULL = unlimited

  -- tiered overrides, applied by the affiliate's lifetime converted count.
  -- jsonb array of { "min_referrals": int, "flat_amount": num, "percent_rate": num }
  tiers              jsonb NOT NULL DEFAULT '[]'::jsonb,

  cookie_window_days integer NOT NULL DEFAULT 30,
  currency           text NOT NULL DEFAULT 'USD',

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Only one default plan at a time
CREATE UNIQUE INDEX IF NOT EXISTS commission_plans_one_default
  ON public.commission_plans (is_default) WHERE is_default;

-- ---------------------------------------------------------------------
-- 3. Affiliates
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- set when they claim the account
  name               text NOT NULL,
  email              text NOT NULL,
  company            text,
  referral_code      text NOT NULL UNIQUE,
  status             text NOT NULL DEFAULT 'invited', -- invited | active | paused | disabled
  commission_plan_id uuid REFERENCES public.commission_plans(id) ON DELETE SET NULL,

  -- per-affiliate overrides (NULL = inherit from plan)
  override_flat_amount   numeric(12,2),
  override_percent_rate  numeric(6,3),

  payout_method      text,            -- paypal | zelle | wise | bank | other
  payout_details     text,            -- free-form handle / notes (manual payouts)
  notes              text,

  invited_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at         timestamptz NOT NULL DEFAULT now(),
  joined_at          timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliates_user_id_idx ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS affiliates_email_idx   ON public.affiliates(lower(email));

-- ---------------------------------------------------------------------
-- 4. Link columns on clients (attribution)
-- ---------------------------------------------------------------------
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code_used       text;

CREATE INDEX IF NOT EXISTS clients_referred_by_idx ON public.clients(referred_by_affiliate_id);

-- ---------------------------------------------------------------------
-- 5. Referrals (a tracked lead / signup attributed to an affiliate)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id       uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_code      text NOT NULL,
  referred_email     text,
  referred_name      text,
  referred_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status             text NOT NULL DEFAULT 'pending', -- pending | signed_up | converted | rejected
  landing_url        text,
  source             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  converted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS referrals_affiliate_idx ON public.referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS referrals_email_idx     ON public.referrals(lower(referred_email));

-- ---------------------------------------------------------------------
-- 6. Click tracking (top-of-funnel analytics)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id  uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  landing_url   text,
  referrer      text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_clicks_affiliate_idx ON public.referral_clicks(affiliate_id);

-- ---------------------------------------------------------------------
-- 7. Commission ledger
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id     uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  commission_type text NOT NULL,        -- signup_flat | first_sale_percent | recurring_percent | bonus | adjustment
  source_amount   numeric(12,2) NOT NULL DEFAULT 0,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  status          text NOT NULL DEFAULT 'pending', -- pending | approved | paid | void
  payout_id       uuid,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  approved_at     timestamptz,
  paid_at         timestamptz
);

CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_idx ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS affiliate_commissions_status_idx    ON public.affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS affiliate_commissions_payout_idx    ON public.affiliate_commissions(payout_id);

-- ---------------------------------------------------------------------
-- 8. Payout batches (manual / admin-marked)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'USD',
  status       text NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  method       text,
  reference    text,
  notes        text,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  paid_at      timestamptz,
  paid_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS affiliate_payouts_affiliate_idx ON public.affiliate_payouts(affiliate_id);

ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_payout_fk
  FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id) ON DELETE SET NULL;

-- =====================================================================
-- 9. Helper functions
-- =====================================================================

-- Role check (mirrors existing is_admin pattern)
CREATE OR REPLACE FUNCTION public.is_affiliate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'affiliate'::app_role
  );
$$;

-- The affiliate row owned by the current auth user
CREATE OR REPLACE FUNCTION public.current_affiliate_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.affiliates WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Unique, human-friendly referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_seed text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix text;
BEGIN
  base := upper(regexp_replace(coalesce(p_seed, 'JI360'), '[^a-zA-Z0-9]', '', 'g'));
  IF length(base) < 3 THEN base := 'JI360'; END IF;
  base := left(base, 8);
  LOOP
    suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    candidate := base || suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- Resolve the effective (tiered) rates for an affiliate.
CREATE OR REPLACE FUNCTION public.affiliate_effective_rates(p_affiliate_id uuid)
RETURNS TABLE (flat_amount numeric, percent_rate numeric, recurring_enabled boolean, recurring_percent numeric, recurring_months integer, currency text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a            public.affiliates%ROWTYPE;
  plan         public.commission_plans%ROWTYPE;
  converted    integer;
  v_flat       numeric(12,2);
  v_percent    numeric(6,3);
  tier         jsonb;
BEGIN
  SELECT * INTO a FROM public.affiliates WHERE id = p_affiliate_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO plan FROM public.commission_plans
    WHERE id = COALESCE(a.commission_plan_id,
                        (SELECT id FROM public.commission_plans WHERE is_default LIMIT 1));

  v_flat    := COALESCE(plan.flat_amount, 0);
  v_percent := COALESCE(plan.percent_rate, 0);

  -- count lifetime converted referrals to select a tier
  SELECT count(*) INTO converted
    FROM public.referrals
    WHERE affiliate_id = p_affiliate_id AND status = 'converted';

  IF plan.tiers IS NOT NULL THEN
    FOR tier IN
      SELECT * FROM jsonb_array_elements(plan.tiers)
      ORDER BY (value->>'min_referrals')::int ASC
    LOOP
      IF converted >= COALESCE((tier->>'min_referrals')::int, 0) THEN
        IF tier ? 'flat_amount'  THEN v_flat    := (tier->>'flat_amount')::numeric;  END IF;
        IF tier ? 'percent_rate' THEN v_percent := (tier->>'percent_rate')::numeric; END IF;
      END IF;
    END LOOP;
  END IF;

  -- per-affiliate overrides win
  IF a.override_flat_amount  IS NOT NULL THEN v_flat    := a.override_flat_amount;  END IF;
  IF a.override_percent_rate IS NOT NULL THEN v_percent := a.override_percent_rate; END IF;

  flat_amount       := v_flat;
  percent_rate      := v_percent;
  recurring_enabled := COALESCE(plan.recurring_enabled, false);
  recurring_percent := COALESCE(plan.recurring_percent, 0);
  recurring_months  := plan.recurring_months;
  currency          := COALESCE(plan.currency, 'USD');
  RETURN NEXT;
END;
$$;

-- Award the one-time (flat + first-sale %) commission for a converted client.
-- Idempotent per client. p_amount NULL => derive from service_types.price_cents.
CREATE OR REPLACE FUNCTION public.award_referral_commission(p_client_id uuid, p_amount numeric DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aff      uuid;
  v_ref      uuid;
  r          record;
  v_source   numeric(12,2);
BEGIN
  SELECT referred_by_affiliate_id INTO v_aff FROM public.clients WHERE id = p_client_id;
  IF v_aff IS NULL THEN RETURN; END IF;

  -- already awarded the one-time commission for this client? bail (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.affiliate_commissions
    WHERE client_id = p_client_id
      AND commission_type IN ('signup_flat','first_sale_percent')
  ) THEN
    RETURN;
  END IF;

  -- source amount
  v_source := p_amount;
  IF v_source IS NULL THEN
    SELECT COALESCE(st.price_cents,0)/100.0 INTO v_source
      FROM public.clients c
      LEFT JOIN public.service_types st ON st.id = c.service_type_id
      WHERE c.id = p_client_id;
  END IF;
  v_source := COALESCE(v_source, 0);

  SELECT * INTO r FROM public.affiliate_effective_rates(v_aff);

  SELECT id INTO v_ref FROM public.referrals
    WHERE affiliate_id = v_aff AND referred_client_id = p_client_id
    ORDER BY created_at LIMIT 1;

  IF r.flat_amount > 0 THEN
    INSERT INTO public.affiliate_commissions
      (affiliate_id, referral_id, client_id, commission_type, source_amount, amount, currency, description)
    VALUES (v_aff, v_ref, p_client_id, 'signup_flat', v_source, r.flat_amount, r.currency,
            'Flat referral bonus');
  END IF;

  IF r.percent_rate > 0 AND v_source > 0 THEN
    INSERT INTO public.affiliate_commissions
      (affiliate_id, referral_id, client_id, commission_type, source_amount, amount, currency, description)
    VALUES (v_aff, v_ref, p_client_id, 'first_sale_percent', v_source,
            round(v_source * r.percent_rate / 100.0, 2), r.currency,
            r.percent_rate || '% of first sale');
  END IF;

  -- mark the referral converted
  UPDATE public.referrals
    SET status = 'converted', converted_at = now()
    WHERE affiliate_id = v_aff AND referred_client_id = p_client_id AND status <> 'converted';
END;
$$;

-- Record a recurring commission on a subsequent payment of a referred client.
CREATE OR REPLACE FUNCTION public.record_referred_payment(p_client_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aff   uuid;
  v_ref   uuid;
  r       record;
  v_count integer;
BEGIN
  SELECT referred_by_affiliate_id INTO v_aff FROM public.clients WHERE id = p_client_id;
  IF v_aff IS NULL OR COALESCE(p_amount,0) <= 0 THEN RETURN; END IF;

  SELECT * INTO r FROM public.affiliate_effective_rates(v_aff);
  IF NOT r.recurring_enabled OR r.recurring_percent <= 0 THEN RETURN; END IF;

  IF r.recurring_months IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.affiliate_commissions
      WHERE client_id = p_client_id AND commission_type = 'recurring_percent';
    IF v_count >= r.recurring_months THEN RETURN; END IF;
  END IF;

  SELECT id INTO v_ref FROM public.referrals
    WHERE affiliate_id = v_aff AND referred_client_id = p_client_id ORDER BY created_at LIMIT 1;

  INSERT INTO public.affiliate_commissions
    (affiliate_id, referral_id, client_id, commission_type, source_amount, amount, currency, description)
  VALUES (v_aff, v_ref, p_client_id, 'recurring_percent', p_amount,
          round(p_amount * r.recurring_percent / 100.0, 2), r.currency,
          r.recurring_percent || '% recurring');
END;
$$;

-- Public RPC: capture a click (anon allowed)
CREATE OR REPLACE FUNCTION public.record_referral_click(p_code text, p_landing_url text DEFAULT NULL, p_referrer text DEFAULT NULL, p_user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_aff uuid;
BEGIN
  SELECT id INTO v_aff FROM public.affiliates WHERE referral_code = p_code AND status IN ('invited','active');
  INSERT INTO public.referral_clicks (affiliate_id, referral_code, landing_url, referrer, user_agent)
  VALUES (v_aff, p_code, p_landing_url, p_referrer, p_user_agent);
END;
$$;

-- Public RPC: register a referral signup (anon allowed)
CREATE OR REPLACE FUNCTION public.register_referral(p_code text, p_email text, p_name text DEFAULT NULL, p_landing_url text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_aff uuid;
BEGIN
  SELECT id INTO v_aff FROM public.affiliates
    WHERE referral_code = p_code AND status IN ('invited','active');
  IF v_aff IS NULL THEN RETURN; END IF;

  -- de-dup: one signed_up referral per email per affiliate
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE affiliate_id = v_aff AND lower(referred_email) = lower(p_email)
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.referrals (affiliate_id, referral_code, referred_email, referred_name, status, landing_url, source)
  VALUES (v_aff, p_code, lower(p_email), p_name, 'signed_up', p_landing_url, 'self_signup');
END;
$$;

-- =====================================================================
-- 10. Triggers
-- =====================================================================

-- generic updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS set_updated_at ON public.commission_plans;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_plans
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.affiliates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Attribution: when a client appears/updates, match an open referral by email.
CREATE OR REPLACE FUNCTION public.tg_link_client_referral()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_aff  uuid;
  v_code text;
BEGIN
  IF NEW.referred_by_affiliate_id IS NULL THEN
    -- try by an explicit code on the client, else by email match
    IF NEW.referral_code_used IS NOT NULL THEN
      SELECT id INTO v_aff FROM public.affiliates WHERE referral_code = NEW.referral_code_used;
    END IF;
    IF v_aff IS NULL AND NEW.email IS NOT NULL THEN
      SELECT affiliate_id, referral_code INTO v_aff, v_code FROM public.referrals
        WHERE lower(referred_email) = lower(NEW.email) AND referred_client_id IS NULL
        ORDER BY created_at DESC LIMIT 1;
      IF v_code IS NOT NULL THEN NEW.referral_code_used := v_code; END IF;
    END IF;
    NEW.referred_by_affiliate_id := v_aff;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_client_referral ON public.clients;
CREATE TRIGGER link_client_referral
  BEFORE INSERT OR UPDATE OF email, referral_code_used ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_link_client_referral();

-- After attribution is set, point the referral row at the client.
CREATE OR REPLACE FUNCTION public.tg_attach_referral_client()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referred_by_affiliate_id IS NOT NULL THEN
    UPDATE public.referrals
      SET referred_client_id = NEW.id,
          status = CASE WHEN status = 'pending' THEN 'signed_up' ELSE status END
      WHERE affiliate_id = NEW.referred_by_affiliate_id
        AND referred_client_id IS NULL
        AND lower(referred_email) = lower(NEW.email);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS attach_referral_client ON public.clients;
CREATE TRIGGER attach_referral_client
  AFTER INSERT OR UPDATE OF referred_by_affiliate_id ON public.clients
  FOR EACH ROW WHEN (NEW.referred_by_affiliate_id IS NOT NULL)
  EXECUTE FUNCTION public.tg_attach_referral_client();

-- Conversion: when a referred client becomes paid, auto-award commission.
CREATE OR REPLACE FUNCTION public.tg_client_paid_commission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referred_by_affiliate_id IS NOT NULL
     AND lower(COALESCE(NEW.payment_status,'')) IN ('paid','completed','complete','succeeded')
     AND COALESCE(OLD.payment_status,'') IS DISTINCT FROM NEW.payment_status THEN
    PERFORM public.award_referral_commission(NEW.id, NULL);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS client_paid_commission ON public.clients;
CREATE TRIGGER client_paid_commission
  AFTER UPDATE OF payment_status ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_client_paid_commission();

-- =====================================================================
-- 11. Row Level Security
-- =====================================================================
ALTER TABLE public.commission_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_clicks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts     ENABLE ROW LEVEL SECURITY;

-- commission_plans: admin manage; affiliates read
DROP POLICY IF EXISTS "plans admin all"  ON public.commission_plans;
CREATE POLICY "plans admin all"  ON public.commission_plans FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "plans read"       ON public.commission_plans;
CREATE POLICY "plans read"       ON public.commission_plans FOR SELECT
  USING (is_admin(auth.uid()) OR is_affiliate(auth.uid()));

-- affiliates: admin manage; affiliate reads/updates own (limited)
DROP POLICY IF EXISTS "aff admin all"    ON public.affiliates;
CREATE POLICY "aff admin all"    ON public.affiliates FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "aff read own"     ON public.affiliates;
CREATE POLICY "aff read own"     ON public.affiliates FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "aff update own"   ON public.affiliates;
CREATE POLICY "aff update own"   ON public.affiliates FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- referrals: admin all; affiliate reads own
DROP POLICY IF EXISTS "ref admin all"    ON public.referrals;
CREATE POLICY "ref admin all"    ON public.referrals FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "ref read own"     ON public.referrals;
CREATE POLICY "ref read own"     ON public.referrals FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- referral_clicks: admin reads; affiliate reads own (inserts via RPC only)
DROP POLICY IF EXISTS "clk admin read"   ON public.referral_clicks;
CREATE POLICY "clk admin read"   ON public.referral_clicks FOR SELECT
  USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "clk read own"     ON public.referral_clicks;
CREATE POLICY "clk read own"     ON public.referral_clicks FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- commissions: admin all; affiliate reads own
DROP POLICY IF EXISTS "com admin all"    ON public.affiliate_commissions;
CREATE POLICY "com admin all"    ON public.affiliate_commissions FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "com read own"     ON public.affiliate_commissions;
CREATE POLICY "com read own"     ON public.affiliate_commissions FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- payouts: admin all; affiliate reads own
DROP POLICY IF EXISTS "pay admin all"    ON public.affiliate_payouts;
CREATE POLICY "pay admin all"    ON public.affiliate_payouts FOR ALL
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
DROP POLICY IF EXISTS "pay read own"     ON public.affiliate_payouts;
CREATE POLICY "pay read own"     ON public.affiliate_payouts FOR SELECT
  USING (affiliate_id = current_affiliate_id());

-- allow anon/auth to call the public capture RPCs
GRANT EXECUTE ON FUNCTION public.record_referral_click(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_referral(text, text, text, text)      TO anon, authenticated;

-- Claim: an invited affiliate links their auth account on first login.
-- Matches by email, sets user_id + joined_at, and grants the affiliate role.
CREATE OR REPLACE FUNCTION public.claim_affiliate_account()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_id    uuid;
BEGIN
  -- already linked?
  SELECT id INTO v_id FROM public.affiliates WHERE user_id = auth.uid() LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN NULL; END IF;

  UPDATE public.affiliates
    SET user_id = auth.uid(),
        joined_at = COALESCE(joined_at, now()),
        status = CASE WHEN status = 'invited' THEN 'active' ELSE status END
    WHERE user_id IS NULL AND lower(email) = lower(v_email)
    RETURNING id INTO v_id;

  IF v_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'affiliate'::app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'affiliate'::app_role);
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_affiliate_account() TO authenticated;

-- =====================================================================
-- 12. Seed a sensible default plan
-- =====================================================================
INSERT INTO public.commission_plans
  (name, description, is_default, flat_amount, percent_rate,
   recurring_enabled, recurring_percent, recurring_months, tiers, cookie_window_days)
SELECT
  'Standard Partner', 'Default JobIntel 360 affiliate plan', true,
  25, 15, false, 0, NULL,
  '[{"min_referrals":5,"percent_rate":20},{"min_referrals":15,"percent_rate":25,"flat_amount":40}]'::jsonb,
  30
WHERE NOT EXISTS (SELECT 1 FROM public.commission_plans WHERE is_default);
