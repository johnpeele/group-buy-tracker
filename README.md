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

The seed migration promotes a specific email address to admin. Since your email isn't in the seed, use the Supabase local dashboard after signing up:

1. Run the dev server (step 5) and sign up at `/login` with your email.
2. Open the local Supabase dashboard at [http://127.0.0.1:54323](http://127.0.0.1:54323).
3. Go to **Table Editor → profiles** and set your row's `role` to `admin`.

Alternatively, run this in the SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 5. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

Migrations live in `supabase/migrations/`. To apply new migrations to your local stack:

```bash
supabase db reset   # wipes local DB and replays all migrations from scratch
# or
supabase migration up   # applies only new migrations
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
    (auth)/       # login / signup
  components/     # shared UI components
  lib/
    actions/      # server actions
    supabase/     # typed client helpers
supabase/
  migrations/     # SQL migrations (committed, applied in order)
```
