# Security + Bug Fix — Instructions

## What this patch does

### 1. Security
Before: every `/api/*` route was publicly accessible. Anyone could `GET`,
`PATCH`, `DELETE` any account, post, article, or schedule. `GET /api/accounts`
even leaked all your Facebook / Google Business / Twitter access tokens in
plain text. This is how someone wiped your data.

After: a `middleware.ts` protects every `/api/*` route and every page
(except `/login`). Access requires the `ADMIN_SECRET` env var, either as a
cookie (set by the login page) or as an `x-admin-secret` header (for scripts).
The accounts endpoints no longer return raw tokens to the client.

### 2. "Porte claquée" bug on Google Business
Before: `getServicesForDay()` picked ONE pair of services based on the day of
the year, so every post on a given day used the same two services — and the
AI naturally opened with the first one ("ouverture de porte claquée ..."). 
The cron also runs hourly, so every hour of the day you got the same opening.

After: `pickServices()` picks a random pair for every single post, and
remembers the last pair used per schedule so it never repeats two in a row.
The AI prompt was also rewritten to:
- forbid starting the opening sentence with a service name
- vary the opening style each time (question / situation / stat / anecdote / ...)
- raise temperature from 0.8 to 0.95 for more variation
- inject a random seed into the prompt

---

## STEP 0 — BEFORE you deploy: revoke your tokens NOW

Since the old API was public and leaked tokens, assume everything was stolen.

1. **Facebook / Instagram**: Business Settings → System Users → revoke all tokens → regenerate. Also: Meta Business Suite → Settings → Page roles → check no unknown admin was added.
2. **Google Business**: Google Cloud Console → APIs & Services → Credentials → delete the OAuth client → create new one. In Business Profile Manager → Users → remove any unknown user.
3. **Twitter/X**: Developer Portal → your App → "Regenerate" on all keys and tokens.
4. **WordPress**: wp-admin → Users → your user → Application Passwords → revoke all → create new.
5. **Cloudinary**: Dashboard → Settings → Security → regenerate API Secret.
6. **Groq / Gemini**: regenerate the API key.
7. **Make.com webhook**: create a new scenario + webhook URL, disable the old one.
8. **Vercel**: Project → Settings → Environment Variables → rotate `CRON_SECRET`,
   `DATABASE_URL` password, and all of the above. Redeploy.

---

## STEP 1 — Add ADMIN_SECRET to Vercel

1. Generate a long random string (e.g. on https://www.random.org/strings or
   run `openssl rand -hex 32`).
2. Vercel → your Project → Settings → Environment Variables → Add:
   - Name: `ADMIN_SECRET`
   - Value: your random string
   - Environments: Production, Preview, Development (check all 3)
3. Save.

---

## STEP 2 — Replace / add these files in your project

Copy each file from this `fixed/` folder to the matching path in your project.

### NEW files (don't exist yet — create them)

| Create this file in your project | Source here |
|---|---|
| `lib/auth.ts` | `lib/auth.ts` |
| `middleware.ts` (at project root, same level as `package.json`) | `middleware.ts` |
| `app/login/page.tsx` | `app/login/page.tsx` |
| `app/api/login/route.ts` | `app/api/login/route.ts` |

### REPLACE existing files

| Replace this file | With |
|---|---|
| `lib/automation.ts` | `lib/automation.ts` (fixes porte claquée bug) |
| `app/api/accounts/route.ts` | `app/api/accounts/route.ts` (stops token leak) |
| `app/api/accounts/[id]/route.ts` | `app/api/accounts/[id]/route.ts` (stops token leak) |
| `components/Sidebar.tsx` | `components/Sidebar.tsx` (adds logout button) |

### Files you do NOT need to change

All other `app/api/*/route.ts` files are now protected by `middleware.ts`,
so you don't need to edit them one by one. They keep working as before,
but the middleware blocks unauthenticated requests before they reach the route.

The one exception is `app/api/cron/route.ts` — leave it as it is, it has its
own `CRON_SECRET` check and is exempted in the middleware so Vercel cron jobs
can still hit it.

---

## STEP 3 — Deploy and test

1. `git add .`
2. `git commit -m "Add auth + fix service rotation"`
3. `git push` (Vercel auto-deploys)
4. Visit `https://your-app.vercel.app` → you should be redirected to `/login`
5. Enter the `ADMIN_SECRET` you set in step 1 → you're in.
6. Try visiting `https://your-app.vercel.app/api/accounts` in a private window
   (no cookie) → you should get `{"error":"Unauthorized"}`. That confirms it works.
7. Trigger a test post from the Auto-Calendar page and check that Google
   Business no longer opens with "ouverture de porte claquée".

---

## STEP 4 (later, recommended) — Harder fixes

These are longer-term improvements, not required today:

1. **Encrypt access tokens at rest**. Right now they're plain text in the DB.
   If someone gets DB access, they still see them. Use a package like
   `@47ng/cloak` or Node's built-in `crypto` module with a `TOKEN_ENCRYPTION_KEY`.
2. **Replace shared-secret auth with real login**. Use NextAuth.js / Clerk /
   Auth.js for proper user accounts, 2FA, etc.
3. **Add rate limiting** on login attempts so someone can't brute-force the secret.
4. **Enable Vercel Deployment Protection** (Project → Settings → Deployment
   Protection) so even previews require Vercel auth.
5. **Audit Vercel access logs** (Dashboard → Logs) for the dates when data
   went missing, look for suspicious `DELETE` calls and unknown IPs.
