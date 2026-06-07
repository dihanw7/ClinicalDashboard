# ClinicalDashboard

Ward management app for clinical groups. Built with React + Vite, backed by Supabase.

---

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

---

## Deploy to Vercel

### Option A — GitHub (recommended)

1. Create a new repo on GitHub (e.g. `clinical-dashboard`)
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/YOUR_USERNAME/clinical-dashboard.git
   git push -u origin main
   ```
3. Go to https://vercel.com → New Project → Import your GitHub repo
4. Vercel auto-detects Vite. Click **Deploy**.
5. You'll get a URL like `clinical-dashboard.vercel.app` — share with your group.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
```

---

## Credentials

Supabase URL and key are hardcoded in `src/WardManager.jsx`.
To change them, edit these lines at the top of the file:

```js
const SUPABASE_URL = "https://kpwfldmucvfbgasnkcag.supabase.co";
const SUPABASE_KEY = "sb_publishable_--WwMN5Z4CSgeHcrBN3VRw_ssGCevfr";
```

---

## Leader PIN

```
CG1LEAD
```

Change this in `src/WardManager.jsx`:
```js
const LEADER_PIN = "CG1LEAD";
```
