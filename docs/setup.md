# Setting up KitGap

## Run it on your computer

You need Node.js 20.9 or newer, and Docker (for the local Supabase stack).

```bash
npm install
npm run db:start          # starts local Postgres, Auth and a mail catcher in Docker
cp .env.example .env.local
```

`npm run db:start` prints the local URLs and keys. Fill in `.env.local`:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY from the output>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEMO_COOKIE_SECRET=<any random string of 32+ characters>
```

Then:

```bash
npm run db:migrate        # creates the kitgap schema
npm run dev               # http://localhost:3000
```

- Confirmation and password-reset emails go to the local mail catcher at http://127.0.0.1:54324. Nothing is actually sent.
- To use the review queue, sign up, sign in once, then run `npm run db:make-reviewer -- you@example.com`.
- The demo needs no setup: open http://localhost:3000/demo.
- `npm run db:stop` stops the Docker containers. Your data is kept.

## Checks

```bash
npm run typecheck
npm run lint
npm test                  # unit + integration tests (needs the database running)
PLAYWRIGHT_CHROMIUM_PATH=… npm run test:e2e   # browser tests (needs the app and database running)
```

The browser tests create test accounts ending in `@example.com` and delete them afterwards. Their cleanup refuses to run against anything but a local database. **Never point the tests at a real deployment.**

## Deploy (Supabase + Vercel)

These are the expected steps. They involve creating accounts and services, so do them yourself. None of this has been done for you.

1. **Supabase project.** Create a project at supabase.com (the free plan is enough for a pilot).
   - In **Connect**, copy the **transaction pooler** connection string (port 6543). It becomes `DATABASE_URL`.
   - In **Project Settings → API**, copy the project URL and the publishable (anon) key.
2. **Create the tables.** From your computer, with `DATABASE_URL` set to the production string:
   ```bash
   DATABASE_URL="postgresql://…:6543/postgres" npm run db:migrate
   ```
3. **Auth settings** (Supabase dashboard → Authentication):
   - **URL Configuration:** set the Site URL to your production address (for example `https://kitgap.vercel.app`), and add `https://kitgap.vercel.app/**` to Redirect URLs.
   - **Email confirmations:** keep "Confirm email" on.
   - **Email templates:** replace the *Confirm signup* and *Reset password* templates with the ones in `supabase/templates/`. Their links go to `/auth/confirm?token_hash=…`, which works even if the email is opened on a different device. The default templates also work, but only in the same browser.
   - **SMTP:** Supabase's built-in email sender is for testing only and is heavily rate-limited. Before real people sign up, connect an email provider under **Authentication → SMTP Settings** (for example Resend, Postmark or SES; most have a free tier). This is a separate account, which you would need to set up.
4. **Vercel.** Import the GitHub repository and add the environment variables from `.env.example`:
   - `DATABASE_URL`: the pooler string, server-only
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`: your production URL
   - `DEMO_COOKIE_SECRET`: a new random string (for example from `openssl rand -base64 32`)

   Then deploy. `npm run build` runs automatically.
5. **First reviewer.** Sign up on the deployed site, sign in once, then from your computer run
   `DATABASE_URL="…" npm run db:make-reviewer -- you@example.com`.
6. **Smoke test.** Try the demo; register a test organization and post a request; approve it as reviewer; adopt it from a second account; record, pack, deliver, and review. Then delete the test request (cancel it) or leave it as a draft.

### Keys and secrets

- Only `NEXT_PUBLIC_*` values reach the browser, and those two are designed to be public.
- `DATABASE_URL` and `DEMO_COOKIE_SECRET` are server-only. Never commit them; `.env*` files are ignored by git (except `.env.example`).
- KitGap never uses the Supabase service-role key.

### Demo housekeeping

Each demo visitor gets a database schema that's removed after a day unused (at most 300 at once). `npm run demo:cleanup` removes old ones on demand.

## Changing the database

Add a new numbered file in `db/migrations/` (for example `0003_add_x.sql`). Never edit a migration that has already been applied: the runner stores checksums and refuses changed files. Write unqualified table names (no `kitgap.`), because the same files also build demo sandboxes.
