# Onboarding Wizard — Setup Guide

The Onboarding Wizard (Admin Dashboard → **Onboarding Wizard**) onboards a new client for any of
your three businesses — **Executive Jobs on Demand**, **LinkedIn Icon Mentorship**, and
**Results Driven Resumes** — in one flow:

1. **Pick the business** → 2. **Enter client details** → 3. **Upload & name their documents** → 4. **Launch**

Launching automatically:

- Creates the client record (linked to the business)
- Creates the client's folder + subfolders in **Google Drive** and files the uploaded documents
  into the right subfolders, renamed using your naming pattern
- Shows/creates the matching **desktop folder path** (synced via Google Drive for Desktop)
- Creates their **TailorWiz**, **JobIntel**, **Jobs on Demand Academy**, and **client portal** accounts
- Sends the branded **welcome email** with a **PDF of all their logins** attached
- Logs everything to the **Tracker** tab: when they signed up, what was sent and when,
  and what's due (worksheet, follow-up email, deliverables) with overdue alerts

## One-time setup

### 1. Email (Resend)

Already used by this app. In Supabase → Edge Functions → Secrets, confirm:

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | *(optional)* A verified sender, e.g. `hello@resultsdrivenresumes.com`. Defaults to `onboarding@resend.dev` (test mode — only delivers to your own address until you verify a domain in Resend). |

### 2. Google Drive (cloud folders)

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, enable the
   **Google Drive API**, and create a **Service Account**. Download its JSON key.
2. Add the entire JSON file contents as the Supabase edge function secret
   `GOOGLE_SERVICE_ACCOUNT_JSON`.
3. In Google Drive, create (or pick) a parent folder per business (e.g. `Clients/EJOD`),
   and **share each folder with the service account's email** (it looks like
   `something@project.iam.gserviceaccount.com`) with **Editor** access.
4. In **Onboarding → Settings**, paste each folder's ID (the long string in the folder URL)
   into **Google Drive parent folder ID** for each business.

> If Drive isn't configured yet the wizard still works — it just marks the folders step
> "needs attention" instead of failing.

### 3. Desktop folder

A web app can't write directly to your computer, so the desktop folder comes from
**Google Drive for Desktop**:

1. Install [Google Drive for Desktop](https://www.google.com/drive/download/) and make sure the
   parent folders from step 2 are synced/mirrored.
2. In **Onboarding → Settings**, enter the local path where that folder lives on your machine
   (e.g. `C:\Users\Marcus\My Drive\Clients\EJOD`). The wizard and tracker will show each
   client's exact desktop path, and the folders appear there automatically as Drive syncs.

### 4. TailorWiz / JobIntel 360 / Jobs On Demand Academy accounts

The login URLs are already seeded from your live platforms:

| Platform | Login URL |
| --- | --- |
| TailorWiz | https://tailorwiz.com |
| JobIntel 360 | https://jobintel360.com |
| Jobs On Demand Academy | https://www.jobsondemandacademy.com |

The wizard generates **one username (the client's email) and one shared password** that
works across all platforms — matching your existing onboarding process — and the welcome
PDF tells clients to log in to TailorWiz first, then Jobs On Demand Academy, then
JobIntel 360 last (which kicks off their Career Intelligence Profile setup).

To have the wizard create the accounts on each platform automatically, set the **API base
URL** + **signup endpoint path** in Onboarding → Settings (the wizard POSTs
`{ name, email, password }` with an `Authorization: Bearer <key>` header) and add the API
key secrets in Supabase Edge Functions:

| Secret | Platform |
| --- | --- |
| `TAILORWIZ_API_KEY` | TailorWiz |
| `JOBINTEL_API_KEY` | JobIntel 360 |
| `JOBSONDEMANDACADEMY_API_KEY` | Jobs On Demand Academy |

Until a platform's API is configured, the wizard still generates the shared credentials,
puts them in the client's welcome PDF, and marks the account **manual_required** on the
tracker so you know to create it on that platform by hand (taking ~30 seconds since the
email/password are already decided).

The **client portal** account is created automatically (real Supabase auth user with the
same shared password) — no setup needed.

### 5. Database migration

Apply `supabase/migrations/20260611120000_onboarding_wizard.sql` (push via Lovable/Supabase as
usual). It creates: `businesses` (pre-seeded with your three businesses), per-business folder
templates, platform integrations, `client_platform_accounts`, `onboarding_records`, and
`onboarding_events`, and adds `business_id` to `clients`.

### 6. Deploy the edge functions

`create-client-folders`, `provision-platform-accounts`, `send-welcome-packet`
(deployed automatically by Lovable/Supabase on push, or `supabase functions deploy <name>`).

## Customizing

Everything is editable in **Onboarding → Settings** per business:

- **Subfolders** created for each client (defaults: `01 - Intake & Worksheets` … `06 - Correspondence`)
- **Document naming pattern** — default `{client_name} - {document_label} - {date}`;
  also supports `{business}`
- **Welcome email subject and body** — placeholders `{{client_name}}`, `{{business_name}}`,
  `{{service_name}}`, `{{delivery_date}}`, `{{portal_url}}`, `{{accounts_table}}`.
  The Executive Jobs on Demand template is pre-seeded with your real onboarding email
  (the 4-step "Do these 4 things" message with your Calendly kickoff link and signature).
- Brand color (used in the email header and login PDF)

The login PDF is attached as
`{Client Name} - Job Search Tools & Training Logins & Instructions {year}.PDF`,
matching the naming you already use.

## The Tracker

**Onboarding → Tracker** is your live database view:

- Totals: clients onboarded, welcome emails sent, items due, overdue
- **Upcoming & Overdue** list (worksheet due 2 days after welcome email, follow-up email due in
  7 days, deliverables due on the service's estimated delivery date) with one-click "Done"
- Per client: signup time, exactly what email was sent and when, cloud folder link, desktop
  path, account statuses per platform, and the full event timeline
