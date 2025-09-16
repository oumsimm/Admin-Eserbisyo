# Admin App Hosting on AWS Amplify (GitHub)

This repo contains a mobile app and a separate Admin dashboard in `Admin/` (Next.js). These instructions deploy ONLY the Admin dashboard to Amplify Hosting via GitHub.

## What you deploy
- Directory: `Admin/`
- Framework: Next.js 14 (static export)
- Output folder: `Admin/out`

## Prerequisites
- A GitHub repository with this project pushed
- AWS account with Amplify access
- Firebase/Supabase credentials (if your dashboard requires them)

## Important project settings
- `Admin/next.config.js` is configured for static export with `output: 'export'`, `images.unoptimized: true`, and `trailingSlash: true`.
- Root `amplify.yml` builds only the Admin app and deploys `Admin/out`.

## Environment variables (Amplify Console > App settings > Environment variables)
Set these if your Admin app uses them:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- (Optional) `NEXT_PUBLIC_*` envs for Firebase if you refactor `Admin/lib/firebase.js` to read from envs instead of hardcoded values.

## Deploy steps (Amplify Console)
1. Open Amplify Console → Host web app → GitHub → select your repo and branch.
2. Review the detected build settings and ensure Amplify uses the root `amplify.yml` (provided).
3. Save and deploy.
4. After build completes, your Admin site will be live at the Amplify domain. You can add a custom domain in Amplify if desired.

## Local build (optional)
To test locally:
```bash
cd Admin
npm ci
npm run dev    # local dev at http://localhost:3000
npm run export # generates static site in Admin/out
```

## Notes
- If you add pages or change routes, keep `trailingSlash: true` to avoid 404s on static hosting.
- If you need SSR or API routes, remove `output: 'export'` and host on Amplify Hosting for SSR with Next, or use another runtime. Static export does not support server functions.
