# Aanwezigheid — check-in app

A kiosk-style check-in app for physio classes. Patients tap their character on
a shared tablet to check in; you see real names and attendance history in a
separate admin area.

## How it's structured

- `app/page.tsx` + `app/KioskClient.tsx` — the public kiosk screen (root URL `/`)
- `app/admin/login` — admin login (password only, see `.env`)
- `app/admin/(protected)/*` — dashboard, patient management, per-patient
  attendance history (all require login)
- `app/actions/kiosk.ts` — check-in + character-change logic
- `app/actions/admin.ts` — login/logout + patient CRUD
- `prisma/schema.prisma` — data model (see below)
- `prisma/seed.ts` — creates the 13 fixed weekly class slots (run once)
- `lib/schedule.ts` — your fixed weekly timetable, edit here if it ever changes
- `lib/time.ts` / `lib/currentClass.ts` — figures out "which class is right
  now" using **Europe/Amsterdam** time regardless of what timezone the server
  itself runs in (Vercel runs in UTC, so this matters — don't remove it)

### Data model

- `Patient` — name, character, active/inactive
- `ClassTemplate` — one row per fixed weekly slot (e.g. "Maandag 16:00 - 17:00")
- `PatientClass` — which patients belong to which recurring class
- `ClassSession` — one actual occurrence of a class on one date, created the
  first time someone checks in for that day
- `CheckIn` — a patient checked into a specific session

## Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL / DIRECT_URL from Neon, and pick your own
# ADMIN_PIN and AUTH_SECRET

npx prisma generate
npx prisma db push      # creates the tables in your Neon database
npx prisma db seed      # creates the 13 weekly class slots

npm run dev
```

Then:
- Visit `/` — this is the kiosk screen (put this on the tablet)
- Visit `/admin/login` — log in with your `ADMIN_PIN`, then go to
  **Cliënten** to add your first patients and assign them to classes

Nothing shows up on the kiosk for a class until at least one patient is
assigned to it in the admin panel.

## Deploying (same flow as your wishlist app)

1. Push this project to a new GitHub repo
2. In Neon, create a new project/database, grab the **pooled** connection
   string (`DATABASE_URL`) and the **direct** one (`DIRECT_URL`)
3. In Vercel, import the repo, and add these environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `ADMIN_PIN`
   - `AUTH_SECRET` (generate with `openssl rand -base64 32`)
4. Deploy
5. Once deployed, run the schema push and seed once, pointed at the Neon
   database (from your own machine, with the same `.env` values):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
6. Open the deployed `/admin/login`, log in, add your patients in
   **Cliënten**, and assign them to their classes
7. Open the deployed root URL on the tablet you'll use in the room

## Notes / things you might want to tweak later

- Characters live in `lib/characters.ts` — it's a plain list of
  `{ key, emoji, name }`, easy to add to or change
- The weekly schedule lives in `lib/schedule.ts` — if class times ever change,
  edit it there and re-run `npx prisma db seed` (it won't duplicate existing
  slots, only adds missing ones)
- There's currently no way to *remove* a class slot from the seed once
  created — if that's ever needed, it's a one-line Prisma delete, ask me
