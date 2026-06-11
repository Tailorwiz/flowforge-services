-- =============================================================
-- Multi-business Onboarding Wizard
-- Businesses: Executive Jobs on Demand, LinkedIn Icon Mentorship,
--             Results Driven Resumes
-- =============================================================

-- ---------- Businesses ----------
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  brand_color text NOT NULL DEFAULT '#1e3a5f',
  from_name text,
  reply_to_email text,
  portal_url text,
  welcome_email_subject text,
  welcome_email_body text,
  document_naming_pattern text NOT NULL DEFAULT '{client_name} - {document_label} - {date}',
  drive_parent_folder_id text,
  desktop_folder_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Per-business folder structure templates ----------
CREATE TABLE IF NOT EXISTS public.business_folder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  folder_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- External platform integrations ----------
CREATE TABLE IF NOT EXISTS public.platform_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  login_url text,
  api_base_url text,
  signup_path text DEFAULT '/api/accounts',
  is_enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Accounts provisioned for a client on each platform ----------
CREATE TABLE IF NOT EXISTS public.client_platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform_key text NOT NULL,
  account_email text NOT NULL,
  temp_password text,
  status text NOT NULL DEFAULT 'pending', -- pending | created | manual_required | failed
  external_account_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, platform_key)
);

-- ---------- One onboarding record per client ----------
CREATE TABLE IF NOT EXISTS public.onboarding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id),
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | completed | needs_attention
  drive_folder_id text,
  drive_folder_url text,
  desktop_path text,
  welcome_email_sent_at timestamptz,
  welcome_email_id text,
  welcome_email_subject text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Timeline of everything that happened / is due ----------
CREATE TABLE IF NOT EXISTS public.onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id),
  event_type text NOT NULL, -- signup | folder_created | document_saved | email_sent | account_created | due_item
  title text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'done', -- done | scheduled | completed | failed
  occurred_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_client ON public.onboarding_events(client_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_due ON public.onboarding_events(due_at) WHERE due_at IS NOT NULL;

-- ---------- Link clients to a business ----------
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id);

-- ---------- updated_at triggers ----------
CREATE OR REPLACE FUNCTION public.set_onboarding_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_platform_integrations_updated_at ON public.platform_integrations;
CREATE TRIGGER trg_platform_integrations_updated_at BEFORE UPDATE ON public.platform_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_client_platform_accounts_updated_at ON public.client_platform_accounts;
CREATE TRIGGER trg_client_platform_accounts_updated_at BEFORE UPDATE ON public.client_platform_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

DROP TRIGGER IF EXISTS trg_onboarding_records_updated_at ON public.onboarding_records;
CREATE TRIGGER trg_onboarding_records_updated_at BEFORE UPDATE ON public.onboarding_records
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

-- ---------- RLS: admin only ----------
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_folder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage businesses" ON public.businesses
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage folder templates" ON public.business_folder_templates
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage platform integrations" ON public.platform_integrations
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage client platform accounts" ON public.client_platform_accounts
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage onboarding records" ON public.onboarding_records
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage onboarding events" ON public.onboarding_events
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- =============================================================
-- Seed data
-- =============================================================
INSERT INTO public.businesses (slug, name, brand_color, from_name, welcome_email_subject, welcome_email_body)
VALUES
  (
    'executive-jobs-on-demand',
    'Executive Jobs on Demand',
    '#0f2c52',
    'Executive Jobs on Demand',
    'Welcome to Executive Jobs on Demand, {{client_name}}!',
    '<p>Hi {{client_name}},</p><p>Welcome to <strong>Executive Jobs on Demand</strong>! We are thrilled to partner with you on your executive job search.</p><p><strong>Your package:</strong> {{service_name}}<br/><strong>Estimated delivery:</strong> {{delivery_date}}</p><p>Your login credentials for all of your accounts are attached as a PDF. Please keep it somewhere safe and change your passwords after your first login.</p>{{accounts_table}}<p><strong>What happens next?</strong></p><ol><li>Log in to your client portal and complete your New Client Worksheet</li><li>Upload your current resume and supporting documents</li><li>We''ll take it from there and keep you posted at every step</li></ol><p>Questions? Just reply to this email.</p><p>Best regards,<br/><strong>Marcus Hall<br/>Executive Jobs on Demand</strong></p>'
  ),
  (
    'linkedin-icon-mentorship',
    'LinkedIn Icon Mentorship',
    '#0a66c2',
    'LinkedIn Icon Mentorship',
    'Welcome to LinkedIn Icon Mentorship, {{client_name}}!',
    '<p>Hi {{client_name}},</p><p>Welcome to <strong>LinkedIn Icon Mentorship</strong>! You''ve just taken a major step toward becoming a recognized voice in your industry.</p><p><strong>Your program:</strong> {{service_name}}<br/><strong>Kickoff target:</strong> {{delivery_date}}</p><p>Your login credentials for all of your accounts are attached as a PDF. Please keep it somewhere safe and change your passwords after your first login.</p>{{accounts_table}}<p><strong>What happens next?</strong></p><ol><li>Log in to your portal and complete your intake worksheet</li><li>Share your current LinkedIn profile and goals</li><li>We''ll schedule your first mentorship session</li></ol><p>Questions? Just reply to this email.</p><p>Best regards,<br/><strong>Marcus Hall<br/>LinkedIn Icon Mentorship</strong></p>'
  ),
  (
    'results-driven-resumes',
    'Results Driven Resumes',
    '#1e3a5f',
    'Results Driven Resumes',
    'Welcome to Results Driven Resumes, {{client_name}}!',
    '<p>Hi {{client_name}},</p><p>Welcome to <strong>Results Driven Resumes</strong>! We''re excited to help you land your dream job.</p><p><strong>Your package:</strong> {{service_name}}<br/><strong>Estimated delivery:</strong> {{delivery_date}}</p><p>Your login credentials for all of your accounts are attached as a PDF. Please keep it somewhere safe and change your passwords after your first login.</p>{{accounts_table}}<p><strong>What happens next?</strong></p><ol><li>Log in to your client portal and complete your New Client Worksheet</li><li>Upload your current resume — we''ll use it as our starting point</li><li>Review the draft we send you, then receive your polished, ATS-ready documents</li></ol><p>Questions? Just reply to this email.</p><p>Best regards,<br/><strong>Marcus Hall<br/>Results Driven Resumes</strong></p>'
  )
ON CONFLICT (slug) DO NOTHING;

-- Default folder structure for each business (editable in Onboarding Settings)
INSERT INTO public.business_folder_templates (business_id, folder_name, sort_order)
SELECT b.id, f.folder_name, f.sort_order
FROM public.businesses b
CROSS JOIN (VALUES
  ('01 - Intake & Worksheets', 1),
  ('02 - Original Documents', 2),
  ('03 - Resumes', 3),
  ('04 - LinkedIn', 4),
  ('05 - Deliverables', 5),
  ('06 - Correspondence', 6)
) AS f(folder_name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_folder_templates t WHERE t.business_id = b.id
);

-- The three platforms whose accounts get auto-created during onboarding
INSERT INTO public.platform_integrations (platform_key, display_name, signup_path, notes)
VALUES
  ('tailorwiz', 'TailorWiz', '/api/accounts', 'Set Login URL + API Base URL in Onboarding Settings, and add the TAILORWIZ_API_KEY secret to Supabase edge function secrets.'),
  ('jobintel', 'JobIntel', '/api/accounts', 'Set Login URL + API Base URL in Onboarding Settings, and add the JOBINTEL_API_KEY secret to Supabase edge function secrets.'),
  ('jobsondemandacademy', 'Jobs on Demand Academy', '/api/accounts', 'Set Login URL + API Base URL in Onboarding Settings, and add the JOBSONDEMANDACADEMY_API_KEY secret to Supabase edge function secrets.')
ON CONFLICT (platform_key) DO NOTHING;
