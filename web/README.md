# Thortitas Fit Data

Mobile-first fitness tracking for two partners. This Next.js application runs independently of ChatGPT Sites. All major sections from the original application are retained: workouts/routines, exercise library, history, charts, goals/challenges, steps, body weight, activity feed, nutrition/recipes, photos, notifications and export.

## Hosting

- Vercel Hobby: application hosting and an HTTPS `vercel.app` address.
- Supabase Free: PostgreSQL database, email/password authentication and private photo storage.
- GitHub: source code and version history.

Stay on the free plans. Supabase may pause a Free project after a week of low activity; photos and database usage have free quotas. Paid upgrades are not required for this setup, and have not been authorized.

## One-time setup

1. Create a free Supabase project, preferably in a European region.
2. Run `database/setup.sql` once in its SQL editor. Use a new project: the script deliberately does not drop or replace existing tables.
3. Add exactly two approved emails in a separate SQL query, replacing the example addresses:

   ```sql
   insert into private.allowed_emails(email,slot) values
     ('owner@example.com',1),('partner@example.com',2);
   ```

4. In Authentication, disable public signups and anonymous sign-ins. Create the two email/password users in the Supabase dashboard, with verified email addresses, and choose initial passwords outside this chat. Passwords are not stored in this repository. The owner can reset them in the dashboard. Public account creation and outgoing invitation emails are not implemented.
5. Import this GitHub repository into Vercel, on the Hobby plan. Set **Root Directory to `web`**. Select Next.js, Node.js 24, `pnpm install --frozen-lockfile`, and `pnpm build`.
6. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Vercel for Preview and Production. These come from Supabase's Connect dialog. A service-role key or database password is not needed by the app.
7. Deploy a preview from this branch, verify the complete checklist below, then release the reviewed application. Give the production URL to both people.

The second profile connects automatically after its first successful sign-in. Both people can read the shared fitness information; each can modify only their own records. No real workout history needs to be migrated.

## Local commands

Requires Node.js 24 and the pinned pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm typecheck
pnpm build
pnpm start
```

Fill `.env.local` with your project values privately. Development and production servers bind to loopback for local testing; hosting uses Vercel's Next.js runtime.

## Security and data

Authentication uses Supabase's REST API. Access and refresh tokens remain in HTTP-only, SameSite cookies. The Auth server validates the identity on each protected request. The database also checks the verified account allowlist and active session. Editable user metadata and incoming identity headers do not authorize access.

Every exposed table has row-level security. All database and storage requests use the signed-in person's token; no privileged service key is used. Database policies protect ownership even when requests are made directly. Challenge contributions are separate per-person rows, avoiding concurrent updates overwriting each other. Step entries are unique per person and date. Historical snapshots are independent of routine templates.

Photos remain in a private bucket and are served through an authenticated route. Large phone photos are resized in the browser before uploading. Uploaded files have a 3 MB limit and checked image signatures. The service worker does not cache personal records, authenticated HTML or photos. An internet connection is required.

Dumbbell weights are entered per dumbbell. Volume consistently uses the weight entered multiplied by completed repetitions; it is not automatically doubled. No physiological calorie estimates, coaching recommendations, push notifications or offline synchronization are included.

## Release checklist

- Both approved users can sign in from separate devices; an unapproved user cannot read data.
- Refresh, close/reopen and a second device retain the same account's records.
- Create/edit/delete a routine and workout; previous exercise values appear across routines.
- Historical edits update charts and do not reorder earlier sessions.
- Direct API and database requests cannot edit the other person's records.
- Steps update one existing daily entry, including correcting a prior date.
- Goals, custom challenge contributions, cardio and progress views work.
- Partner posts, likes, comments, meals, favorites and notifications work.
- Photos are visible to the two approved accounts and inaccessible anonymously.
- Export contains only the requesting person's records.
- Workout logging and sign-in work at realistic phone widths without horizontal overflow.
- Verify the manifest and actual installation behavior on the target phones.

Local checks do not establish hosted persistence or real-device operation. The database setup and its row-level policies must be tested against the actual Supabase project before this branch is treated as ready for use.
