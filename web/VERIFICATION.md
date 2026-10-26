# Verification status — 26 October 2026

This is a migration draft, not a published or fully verified release.

## Passed locally

- Next.js production build, using webpack.
- TypeScript checks, both standalone and during the production build.
- Ten HTTP checks against the production server: redirect to sign-in; sign-in page; unauthenticated data, export and photo requests; forged Sites identity headers; cross-site write rejection; safe sign-in error output; app manifest.

## Still required before use

- Apply and execute the PostgreSQL setup in the intended Supabase project.
- Verify row-level policies, including anonymous denial, a third-account denial, shared reads and owner-only writes through direct requests.
- Test real email/password sessions and refresh/logout with the two actual accounts.
- Verify actual database and photo persistence after refresh, reopening and a second physical device.
- Exercise all major sections against the hosted backend: workouts, history, progress, tracking, goals/challenges, social, nutrition, photos, notifications and export.
- Complete hosted mobile/browser and PWA installation checks.
- Verify a clean dependency installation on the host. Local compilation reused the original project's installed pinned dependencies; outbound package installation was unavailable in this environment.

The original archive contains prior local API/UI checks for the Sites version. Those results are historical evidence about the interface, not validation of this new Supabase backend.
