# ONEDOPEA portfolio

Next.js App Router portfolio with two selectable looks: the legacy Matrix experience and the light Antigravity feed. The public GitHub Pages URL is:

**https://visiontripin.github.io/onedopea/**

GitHub Pages is currently configured to serve the `main` branch root. Run `npm run build:pages` to create the static Next.js export and sync it into that document root; the script also writes `.nojekyll`, which is required so GitHub Pages serves Next.js' `_next` assets. Commit the generated root files to update the published site. The Actions workflow validates this build on pushes and pull requests.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The feed works with demo content before Supabase is configured. To enable Supabase-backed publishing and `/admin`, create a Supabase project, fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then run `supabase/schema.sql` in the Supabase SQL editor. Create an Auth user and add its UUID to `public.admin_users`. Never commit `.env.local` or service-role keys.

For the GitHub Pages build, set those two public values as repository Actions variables with the same names. They are public browser keys; database and Storage access must remain protected by the included RLS policies. Without them, the public demo feed still works and the admin page asks for configuration.

Upload audio/video files in `/admin`; they are stored in `portfolio-media`. SVG input is sanitized before rendering. `public/matrix.html` is the self-contained legacy version embedded by the Matrix style button.
