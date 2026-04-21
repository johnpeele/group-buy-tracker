# Group Buy Tracker

A private group buy management app for tracking peptide buy rounds, commitments, and payments.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/installation)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (`brew install supabase/tap/supabase`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required for local Supabase)

## Local setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values. For local development, use the keys that `supabase start` prints (see step 3).

### 3. Start local Supabase

```bash
supabase start
```

This boots a local Postgres + Auth + API stack in Docker and runs all migrations automatically. When it finishes it prints your local `API URL`, `anon key`, and `service_role key` — paste those into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from output>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Bootstrap your admin account

1. Open Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323).
2. Go to **Authentication → Users → Add user → Create new user**.
3. Enter your email and any password, and check **Auto Confirm User**.
4. Go to **Table Editor → profiles** and set your row's `role` to `admin`.

Or use the SQL editor shortcut:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in via Google or magic link — check Inbucket at [http://localhost:54324](http://localhost:54324) for magic link emails.

---

## Authentication setup

The app uses two sign-in methods: **Google OAuth** and **email magic links**. Both require third-party configuration before they work in production.

### Google OAuth

#### 1. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create or select a project.
2. **APIs & Services → Library** — enable the **Google+ API** and **Google People API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - Fill in app name, support email, and developer contact
   - Add scopes: `email` and `profile`
   - Add yourself as a test user while in testing mode
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - Production: `https://<your-project>.supabase.co/auth/v1/callback`
     - Local dev: `http://127.0.0.1:54321/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**.

> Before going live, return to the OAuth consent screen and click **Publish app** — while in Testing mode only explicitly added test users can sign in.

#### 2. Supabase (hosted)

Dashboard → **Authentication → Providers → Google** → paste your Client ID and Secret → enable.

#### 3. Supabase (local)

Add to your shell environment before running `supabase start`:

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

Then add both to `.env.local` as well (for the Next.js server actions that read them):

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
```

---

### Email magic links (SMTP)

Supabase's built-in email service has a low rate limit not suitable for production. Connect a custom SMTP provider so magic link emails are sent through your own mailer.

**[Resend](https://resend.com)** is recommended — it has a generous free tier and works out of the box.

#### 1. Resend setup

1. Sign up at [resend.com](https://resend.com).
2. Add and verify your sending domain under **Domains** (or use `onboarding@resend.dev` for initial testing).
3. Go to **API Keys → Create API Key** and copy it.

#### 2. Configure Supabase (hosted)

Dashboard → **Authentication → Settings → SMTP**:

| Field | Value |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | `noreply@yourdomain.com` |
| Sender name | `BatchKit` |

Enable the toggle and save. All auth emails (magic links, invites) now route through Resend.

#### 3. Local dev

Local Supabase uses [Inbucket](http://localhost:54324) to capture outgoing emails — no SMTP setup needed locally. All magic link and invite emails appear there.

---

## Switching between local and hosted Supabase

Just swap the values in `.env.local` and restart the dev server.

**Local:**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Hosted:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
NEXT_PUBLIC_APP_URL=https://your-production-url.com
```

---

## Database migrations

Migrations live in `supabase/migrations/`. To apply new migrations to your local stack:

```bash
supabase db reset        # wipes local DB and replays all migrations from scratch
supabase migration up    # applies only new migrations (no data loss)
```

To push migrations to your hosted Supabase project:

```bash
supabase link --project-ref <your-project-ref>   # one-time link
supabase db push
```

To generate a new migration after making schema changes in the dashboard:

```bash
supabase db diff -f your_migration_name
```

## Stopping local Supabase

```bash
supabase stop
```

Add `--no-backup` if you don't need to preserve local data between restarts.

## Project structure

```
src/
  app/
    (app)/        # authenticated routes (dashboard, history, admin)
    (auth)/       # login, invite acceptance
    auth/         # OAuth / magic link callback handler
  components/     # shared UI components
  lib/
    actions/      # server actions
    supabase/     # typed client helpers
supabase/
  migrations/     # SQL migrations (committed, applied in order)
  templates/      # custom auth email templates
```
