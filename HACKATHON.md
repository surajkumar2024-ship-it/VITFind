# VITFind — hackathon handoff

## What is implemented

A responsive, server-backed campus lost-and-found web app. Desktop uses a sidebar and multi-column board; phones use a touch-friendly drawer, bottom navigation, and scrollable forms.

- Lost/found reports, compressed photo uploads, report editing, search, category/location/status filters, sorting, bookmarks and personal reports.
- Explainable suggestions based on category, location, colour and description. These are heuristic suggestions, not image AI or proof of ownership.
- Private ownership claims, persisted conversations, in-app notifications, staff review, a six-digit collection code and confirmed handover.
- Staff moderation, concern reporting and an audit history. Only one claim can be approved per item, including simultaneous requests.
- Loading, empty and error states; responsive dialogs; image size/type checks; a home-screen manifest and icons. This is an online web app, not an offline-capable or app-store-native release.

## Three-minute presentation

1. Open the private hosted app while signed in. Show the Explore board and search/filter controls.
2. Open the account menu. Choose **Aarav Sharma**. In Matches, open the suggested water bottle and submit a claim with sample private proof (e.g. a distinctive sticker).
3. Send a message in Messages. Switch to **Campus Help Desk**, review the claim, and approve it.
4. Switch back to Aarav. Open **My reports → My claims** to see the collection code.
5. Switch to Campus Help Desk, enter that code, and confirm the item was physically returned. Show the status and audit history.
6. On a phone, publish a new sample lost/found report with a photo. Refresh to demonstrate persistence.

Completed claims stay completed. To repeat the full flow, create a new found report as Meera, then claim it as Aarav. Do not use real IDs, student documents, passwords or identifying proof in the demo.

## Demo identity boundary

The hosted Site is owner-private. Platform sign-in protects it; each authenticated platform user has a separate demo namespace. The three personas are intentionally switchable demonstration identities inside that namespace. **They are not VIT authentication or a production staff permission system.** This version does not provide a shared, real campus board.

The board is deliberately limited to 200 reports, with bounded claim/message/history reads. Messages refresh every 15 seconds while the page is visible; in-app notifications are not external push notifications. Sample photography is illustrative; attribution is available inside the app.

## Stack and structure

- React + TypeScript, Next-compatible routing on Vinext/Vite, Tailwind and accessible UI primitives.
- Cloudflare Workers-compatible request handlers, D1 database with Drizzle schema/migrations, and R2-backed private photo storage.
- `components/workspace.tsx`: responsive interface and flows.
- `lib/domain.ts`: shared data contracts and explainable matching.
- `app/api/*`: validated server actions, scoped reads and photo access.
- `db/schema.ts` and `drizzle/`: database schema and append-only migrations.
- `tests/domain.test.mjs`: matching regression tests, run with `node --test tests/domain.test.mjs`.

The original starter's development/publishing instructions remain in README.md. Dependencies are pinned through package-lock.json. For a new machine, use Node 22.13+ and the documented install/build process. Apply migrations to a local database before exercising write flows. Never apply local test/reset SQL to production.

## Before inviting a real campus

This is a working hackathon foundation, **not a verified 50,000-user deployment**. Total students, daily active users and simultaneous users are different capacity inputs. Do the following before a real rollout:

1. Replace demo personas with university-approved SSO and server-derived student/staff roles. Define campus/tenant membership and privacy boundaries; remove the persona-switch API from production.
2. Replace the private sandbox namespace with authorized shared campus data. Add server-side search and cursor pagination, rather than returning a capped board. Profile the database and choose managed PostgreSQL if relational/concurrency requirements justify migration; do not migrate solely because the student count sounds large.
3. Add per-user/per-IP rate limiting across every write, upload scanning/quarantine, verified ownership procedures, abuse handling, retention/deletion/export, staff audit access and collection-code expiry/attempt throttling.
4. Add reliable background jobs, retry/idempotency policies, delivery tracking and real push/email integrations. Add image similarity only after evaluation on representative lost-and-found photos and clear false-match handling.
5. Create separate development/staging/production environments, CI typechecks/tests/builds, secrets management, monitoring, alerts, database backups and a successfully tested restoration procedure.
6. Agree on a measured peak workload, latency/error targets and cost ceiling. Load-test the complete workload—including uploads, claim races and notification fan-out—then run a limited campus pilot before expanding. Test actual low-end Android devices, iPhone Safari and weak networks, not just desktop browser emulation.

## Verification performed for this build

The local browser checks covered desktop and phone layouts, photo/report persistence, search/bookmarks, claims, messages, staff approval, collection and duplicate-handover rejection. API checks covered unauthenticated access, cross-origin writes, student-only restrictions, invalid image input and private proof visibility. Concurrent approvals produced one winner and one conflict; handover racing another approval produced one completed claim without a second approval notification/audit. These are functional checks, not a campus-scale load test.
