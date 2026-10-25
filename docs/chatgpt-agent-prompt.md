# Prompt for ChatGPT agent (browser mode): deploy KitGap and prepare the store listings

Paste everything below the line into ChatGPT with agent/browser mode on.

---

You are helping me deploy my web app **KitGap** and prepare its app store listings. I'm a high school student entering the 2026 Congressional App Challenge (Florida's 15th district). Work in the browser, step by step, and tell me what you're doing as you go.

## About the app

- KitGap is a Next.js 16 app with Supabase (Postgres and Auth). Clubs run donation kit drives, and the receiving organization confirms what arrived.
- Code: https://github.com/Coder-13-11/KitGap, branch `claude/kitgap-master-build-ggo091` (the repository's default branch). The app is at the repository root.
- The Supabase project and its database **already exist**, and all database migrations are applied. Don't create a new Supabase project, and don't run anything against the database.
- Read `docs/setup.md` ("Deploy (Supabase + Vercel)") and `docs/mobile.md` in the repository on GitHub before you start, and follow them.

## Rules (follow these exactly)

1. **Secrets.** Never ask me to paste a password, connection string, API key or secret into this chat, and never type one yourself. When a field needs a secret (`DATABASE_URL`, `DEMO_COOKIE_SECRET`, or anything in the Supabase "Connect" or "API" pages), stop and tell me "Take over: paste X into this field". Wait until I say I'm done.
2. **Signing in.** When a site asks me to sign in or verify (GitHub, Vercel, Supabase, Apple, Google), stop and let me do it.
3. **Money and agreements.** Don't pay for anything, start a trial that needs a card, create developer accounts, or accept terms or agreements without asking me first in chat. Don't submit anything to the App Store, Google Play or the Congressional App Challenge. I'll do those myself.
4. **Only what's listed.** Don't change, delete or turn off anything else in my accounts. If a step seems to need something not listed here, ask first.
5. **Honesty.** If a step fails, tell me the exact error. Don't say something works unless you checked it on the live site.

## Tasks, in order

### 1. Deploy on Vercel

1. Go to vercel.com and import the GitHub repository `Coder-13-11/KitGap` (I'll sign in and approve GitHub access). Framework: Next.js. Root directory: the repository root. Production branch: `claude/kitgap-master-build-ggo091`.
2. Add these environment variables for **Production** (and Preview). For each secret, stop and let me paste the value:
   - `DATABASE_URL`: the Supabase **transaction pooler** connection string, port **6543** (Supabase → Connect). Secret, so I paste it.
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL (Supabase → Project Settings → API). Not secret.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable/anon key, same page. It's designed to be public, but still let me paste it.
   - `DEMO_COOKIE_SECRET`: a new random string of 32+ characters. I'll generate and paste it myself.
   - `NEXT_PUBLIC_SITE_URL`: leave it for now; you'll set it in step 4.
3. Deploy, wait for the build to finish, and tell me the production URL (for example `https://kitgap-xxxx.vercel.app`). If the build fails, show me the last 30 lines of the build log.
4. Set `NEXT_PUBLIC_SITE_URL` to that exact production URL (no trailing slash) and redeploy.

### 2. Supabase auth settings

In the Supabase dashboard for the existing project → Authentication:

1. **URL Configuration:** set Site URL to the production URL, and add `<production URL>/**` to Redirect URLs. Keep any existing localhost entries.
2. **Email templates:** replace "Confirm signup" and "Reset password" with the templates in the repository's `supabase/templates/` folder (open them on GitHub and copy them exactly).
3. Leave "Confirm email" on. Don't touch SMTP. Tell me it's still the built-in sender, which is rate-limited.

### 3. Check the live site

On the production URL, at desktop size and at phone size (about 390 px wide), check each of these and report pass or fail with a short note:

1. The home page loads. The "One kit, from list to doorstep" card animates and ends on a "Confirmed by Riverbend Family Center" stamp.
2. `/demo` → "Start the demo" works. Follow the guide bar at the top through all 6 steps ("Go as Jordan", "Go as Sam", "Go as Maya" and so on), using its suggested numbers. The bar should tick each step and end on "Confirmed".
3. `/install` loads, and `/manifest.webmanifest` returns JSON with the name "KitGap".
4. `/requests`, `/about` and `/scan` load without errors.
5. Report any page that shows "Something went wrong", a 404 or a 500, with its URL.

Don't create real accounts or post real requests. Use only the demo.

### 4. Draft the store listings (drafts only, don't submit)

Using what you saw on the live site and the repository's `docs/mobile.md`, write in this chat:

1. **App Store draft:** name (30 characters max), subtitle (30 max), promotional text (170 max), description (about 1,500 characters), keywords (100 characters, comma-separated), category, age rating answers, and the support URL and privacy policy URL to use (flag that a full privacy policy page still has to be written).
2. **Google Play draft:** title (30 max), short description (80 max), full description (4,000 max), category, and Data safety answers (what's collected: name and email for accounts; nothing sold; no tracking).
3. **Screenshot plan:** 5 screenshots and what each shows, at 6.7-inch iPhone and Android phone sizes, taken from the live demo.
4. A list of everything still blocking a store submission, from `docs/mobile.md` (for example account deletion, privacy policy, developer accounts, Google's 14-day closed test).

Write honestly: no invented users, partners, statistics or reviews, and say the demo uses fictional sample data.

## When you finish

Give me one summary: the production URL, what you changed in Vercel and Supabase, the check results (pass/fail), the drafts, and anything that needs me.
