# Deployment continuation

- Source branch: `migration/vercel-supabase-20261026`.
- Review: https://github.com/eleazarmr17/ThortitasFitData/pull/1
- Vercel project: `prj_owZ9uGFeuV29NgVx3SPfvTltTSH2` (`thortitas-fit-data`).
- Vercel account scope: `team_4qquf6wTi0fhBjxejPzujDum`.
- Vercel root directory: `web`; framework Next.js; Node 24; install `pnpm install --frozen-lockfile`; build `pnpm build`.
- Supabase project: `wxvxwqtfebbpucfafikt`, EU Frankfurt, schema already applied. Do not run setup a second time.
- Both approved addresses from the supplied handover have been configured. Actual email/password users still need to be created privately in the Supabase Auth dashboard.

Vercel created the project, but subsequent configuration requests returned an account-scope authorization error. Use the Vercel authorization flow for the exact account above, then retry the same scoped operation. Do not create duplicate projects or deploy to a different account.

After access is granted, configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for Preview and Production. Retrieve the publishable key from Supabase; never commit its value. No service-role key is needed.

Set Vercel authentication protection to Preview only, keeping the production URL reachable and the application's own email/password gate active. Deploy the reviewed branch to Preview and verify all remaining checks before production release. No production deployment has occurred.
