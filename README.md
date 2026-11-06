# ONEDOPEA portfolio

Next.js App Router portfolio with two selectable looks: the legacy Matrix experience and the light Antigravity feed. The public GitHub Pages site is built from this branch by GitHub Actions:

**https://visiontripin.github.io/onedopea/**

The feed works with demo content before Supabase is configured.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

To enable Supabase-backed publishing and `/admin`, create a Supabase project, fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then run `supabase/schema.sql` in the Supabase SQL editor. Create an Auth user and add its UUID to `public.admin_users`. Never commit `.env.local` or service-role keys.

For GitHub Pages, set the same two public values as repository Actions variables named `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. They are public browser keys; database and Storage access must remain protected by the included RLS policies. Without them, the public demo feed still works and the admin page asks for configuration.

Upload audio/video files in `/admin`; they are stored in `portfolio-media`. SVG input is treated as untrusted and sanitized before rendering. `public/matrix.html` is the self-contained legacy version shown by the Matrix style button.

## Deployment

The `.github/workflows/pages.yml` workflow statically exports the Next.js app for the `/onedopea` project path and deploys it to GitHub Pages when this branch is pushed. The GitHub Pages version uses browser-side Supabase access because Pages does not run a Next.js server.
