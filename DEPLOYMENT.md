# Deploying CampusVerse AI

This app ships as **one Docker image**: the root `Dockerfile` builds the
React frontend, then serves it from the same Express process as the API
(see the static-serving block near the bottom of `backend/server.js`).
That means one service on one host is enough — no separate frontend host,
no cross-origin setup to debug.

## 0. Before you do anything else: rotate your secrets

`backend/.env` in this project already contains a warning that its Gemini
API key was previously exposed. **Do not deploy with the key or JWT
secret currently in that file.**

1. Get a fresh Gemini key: https://aistudio.google.com/apikey
2. Generate a fresh JWT secret:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. Set both as environment variables on your hosting platform (step 2
   below) — never commit them to git. `backend/.gitignore` already
   excludes `.env`, so keep it that way.

## 1. Recommended: Render (free tier, persistent disk, one click)

Render's free web-service tier includes a small persistent disk, which is
what makes it a good fit for this app's SQLite database — most serverless
platforms (Vercel, Netlify Functions) don't offer persistent local disk,
which would silently reset your database on every deploy.

1. Push this repo to GitHub (with the rotated secrets from step 0 — the
   old `.env` values stay out of git either way).
2. In Render: **New → Blueprint**, point it at your repo. Render reads
   `render.yaml` at the project root and provisions the service and disk
   automatically.
3. In the service's **Environment** tab, fill in the two secrets the
   blueprint deliberately leaves blank: `JWT_SECRET` and `GEMINI_API_KEY`.
4. Deploy. First boot creates the SQLite schema automatically
   (`docker-entrypoint.sh` runs `prisma db push` only when no database
   file exists yet — see the comments in that file for why it's
   conditional).
5. Seed initial data **once**, using Render's shell (Dashboard → your
   service → Shell):
   ```
   npm run db:seed
   ```
   Don't run this again after go-live — it wipes and recreates all data
   (students, clubs, events, faculty, timetable, admin accounts, etc.).
6. Visit the URL Render gives you — that's the whole app, frontend and
   API both.

Default admin login after seeding: `admin@campusverse.edu` /
`Admin@123` — change this password immediately after first login.

## 2. Alternative: Railway / Fly.io (same Docker image)

Both support the same Dockerfile + persistent volume model:

- **Railway**: New Project → Deploy from GitHub → it detects the
  Dockerfile automatically. Add a volume mounted at
  `/app/backend/data`, and set the same environment variables as
  `render.yaml` lists (`DATABASE_URL=file:./data/prod.db`,
  `JWT_SECRET`, `GEMINI_API_KEY`, etc.).
- **Fly.io**: `fly launch` (it will detect the Dockerfile), then
  `fly volumes create campusverse_data --size 1` and mount it at
  `/app/backend/data` in `fly.toml`. Set secrets with `fly secrets set
  JWT_SECRET=... GEMINI_API_KEY=...`.

## 3. Alternative: split deployment (frontend and backend separately)

If you'd rather deploy the frontend to Vercel/Netlify and the backend to
Render/Railway separately (e.g. to get Vercel's CDN for the static
assets), the codebase supports it — just:

1. Deploy `backend/` on its own (same steps as above, minus the frontend
   build stage — you can build+run just the backend half of the
   Dockerfile, or run `npm ci && npm start` directly on a Node host).
2. Deploy `frontend/` separately. Set its `VITE_API_URL` env var to your
   backend's public URL plus `/api`, e.g.
   `VITE_API_URL=https://campusverse-backend.onrender.com/api`
   (see `frontend/.env.example`).
3. On the backend, set `CORS_ORIGIN` to your frontend's exact URL so
   `server.js` doesn't stay wide open to any origin, e.g.
   `CORS_ORIGIN=https://campusverse.vercel.app`.

This path means two services to manage and a real CORS boundary between
them — the single-service Docker path in section 1 is simpler unless you
specifically want a CDN-fronted frontend.

## 4. Local Docker test (before deploying anywhere)

```bash
docker build -t campusverse-ai .
docker run -p 5000:5000 \
  -e JWT_SECRET=replace_with_a_long_random_secret \
  -e GEMINI_API_KEY=your_key_here \
  -v campusverse-data:/app/backend/data \
  campusverse-ai

# in another terminal, once it's up:
docker exec -it <container-id> npm run db:seed
```

Then visit http://localhost:5000.

## Outgrowing SQLite

If you need multiple app instances, higher write concurrency, or a
managed backup story, `backend/prisma/schema.prisma` has a migration
note at the top with the exact steps to switch to MySQL (or adapt the
same idea for Postgres). Do this before scaling beyond one instance —
SQLite's single-file model doesn't support concurrent writers across
multiple containers.
