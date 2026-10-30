# Verification status — 26 October 2026

This is a migration draft. It has not been deployed to Vercel yet.

## Passed

- Next.js production build and TypeScript checks.
- Ten HTTP checks against the local production server, including unauthenticated rejection, forged identity headers, cross-site writes and safe error responses.
- Mobile sign-in visual review at 390px; no horizontal overflow in the checked form.
- Supabase schema applied to project `wxvxwqtfebbpucfafikt` in Frankfurt.
- Database transaction checks for two approved profiles, shared workout reads, owner-only changes, rejected ownership transfers, daily-step upserts, separate challenge contributions, social inserts and private photo metadata access.
- Authenticated outsiders and anonymous requests denied by database policies.
- Test fixtures rolled back. Cleanup query confirmed two approved addresses, zero profiles, zero workouts, zero test accounts and zero stored photos.

The security advisor reports no warnings or errors. It notes the intentionally policy-free private allowlist, which is inaccessible directly to application roles. New unused indexes are informational.

## Pending

- Vercel account-scope authorization, environment variables and preview deployment.
- Clean dependency installation on the host. Local compilation reused the original pinned dependencies.
- Creation of the two real email/password accounts, followed by actual sign-in, session refresh and logout tests.
- Full hosted user flows, actual file uploads and cross-device persistence.
- PWA installation checks on the target phones.

The SQL fixtures validate database permissions, not a real browser sign-in. Earlier Sites-specific verification reports are historical and do not validate this backend.
