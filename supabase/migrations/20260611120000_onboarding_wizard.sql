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
    'Welcome to Executive Jobs on Demand! Here are Your Next Steps...',
    '<p>Welcome {{client_name}}!</p><p>You''re in, and your payment for the <strong>{{service_name}}</strong> is confirmed.</p><p>Your logins for all three platforms (TailorWiz, JobIntel 360, and Jobs On Demand Academy) are in the PDF attached to this email.</p><p><strong>Do these 4 things:</strong></p><p><strong>1. Open the attached PDF.</strong> It has one username and one password that work for all three platforms, plus the login link for each. Keep it handy, you''ll use it in the next step.</p><p><strong>2. Log in to all three platforms, in this order:</strong> TailorWiz first, then Jobs On Demand Academy, then JobIntel 360 last. Logging in confirms all three accounts are active, and saving JobIntel 360 for last is what kicks off your profile setup in Step 3.</p><p><strong>3. Complete your Career Intelligence Profile.</strong> As soon as you log in to JobIntel 360, it walks you through a quick setup wizard. Upload your most recent resume and answer the questions it asks. This is a one-time setup and there are no worksheets to fill out. You can save your progress and come back to it whenever it''s convenient, and if you hit a question you don''t have the answer to yet, you can skip it and come back to it later. Feel free to copy and paste answers straight from your resume. And here''s the best tip: if the answer is already on your resume or any other document you''ve uploaded, just skip that question or simply note that it''s already on the resume, so there''s no double work. Once it''s done, every tool in your account is personalized to you automatically.</p><p><strong>4. Once steps 1, 2, and 3 are done, book your kickoff and clarity call with me.</strong> Please finish your logins and your Career Intelligence Profile first, then book the call. That way we can sit down together and go over everything on our 1-hour Zoom session, lock in your target roles, and map your 90-day plan. Grab your time here:<br/><a href="https://calendly.com/marcusbhall/jod-onboarding">https://calendly.com/marcusbhall/jod-onboarding</a></p><p><strong>IMPORTANT</strong></p><p>Most people get through all four steps in just 15 to 20 minutes, so this won''t take long. That said, take as much time as you need on this, especially your Career Intelligence Profile. It''s one of the most important things you''ll do in this whole program, and the good news is you only have to do it once. Do it right and every tool works for you from here on out.</p><p>And if you run into any trouble at all, with anything, please text me at 281-883-6465 or just reply to this email. I''ve got you.</p><p>Once that''s done, I take it from here.</p><p><strong>Marcus Hall</strong><br/><br/>Founder, Executive Jobs on Demand<br/>Creator, The Science of Getting Job Interviews<br/>Creator, TailorWiz &amp; JobIntel 360<br/>281-883-6465<br/>marcushall2023@gmail.com<br/><a href="http://executivejobsondemand.com">executivejobsondemand.com</a></p>'
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

-- The three platforms whose accounts get auto-created during onboarding.
-- One username + one password works across all three (clients log in to
-- TailorWiz first, then Jobs On Demand Academy, then JobIntel 360 last,
-- which kicks off their Career Intelligence Profile setup).
INSERT INTO public.platform_integrations (platform_key, display_name, login_url, signup_path, notes)
VALUES
  ('tailorwiz', 'TailorWiz', 'https://tailorwiz.com', '/api/accounts', 'Set API Base URL in Onboarding Settings and add the TAILORWIZ_API_KEY secret to Supabase edge function secrets to auto-create accounts.'),
  ('jobintel', 'JobIntel 360', 'https://jobintel360.com', '/api/accounts', 'Set API Base URL in Onboarding Settings and add the JOBINTEL_API_KEY secret to Supabase edge function secrets to auto-create accounts.'),
  ('jobsondemandacademy', 'Jobs On Demand Academy', 'https://www.jobsondemandacademy.com', '/api/accounts', 'Set API Base URL in Onboarding Settings and add the JOBSONDEMANDACADEMY_API_KEY secret to Supabase edge function secrets to auto-create accounts.')
ON CONFLICT (platform_key) DO NOTHING;
