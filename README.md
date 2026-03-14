# SocialPilot — AI Social Media Scheduler

Auto-generates and posts content to Facebook using AI (Gemini), on a fully automated schedule.

---

## 🚀 Deploy to Vercel (Free — Recommended)

### Step 1 — Neon Database (free PostgreSQL)
1. Go to **neon.tech** → create free account → New Project
2. Copy **both** connection strings:
   - Pooled connection → `DATABASE_URL`
   - Direct connection → `DIRECT_URL`

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/social-scheduler.git
git push -u origin main
```

### Step 3 — Deploy on Vercel
1. Go to **vercel.com** → Add New Project → Import your GitHub repo
2. Add these **Environment Variables** in Vercel Settings:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `GEMINI_API_KEY` | From aistudio.google.com |
| `CRON_SECRET` | Any random string (e.g. abc123xyz) |

3. Click **Deploy**

### Step 4 — Initialize Database
After deploy, run from your local machine (pointing to Neon):
```bash
npx prisma db push
```

### Step 5 — Done!
Vercel's built-in cron (in vercel.json) calls `/api/cron` every minute automatically.
No cron-job.org needed.

---

## 💻 Local Development

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env — use DATABASE_URL="file:./dev.db" for local SQLite

# 2. Install
npm install

# 3. Setup database
npx prisma db push

# 4. Run (includes built-in cron every minute)
npm run dev
```

Open http://localhost:3000

---

## 📋 Usage

1. **Connect** → Add your Facebook Page token + Page ID
2. **Photos** → Upload images for your posts
3. **Auto-Calendar** → Create automation: pick keyword, days, times, company info
4. **Test** → Visit `/api/test-automation` to fire immediately

---

## 🔑 Facebook Setup
- Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer)
- Select your app → Generate token
- Permissions needed: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
- Get your Page ID from your Facebook page URL or settings
