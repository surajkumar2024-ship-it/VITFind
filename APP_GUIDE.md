# VITFind Campus

## Accounts

For local testing without Google, follow [LOCAL_DEMO.md](LOCAL_DEMO.md). The local launcher provides two clearly labelled dummy member accounts with editable profiles, persistent local records and logout. It does not change the live website or grant access to the Google board.

The standalone version uses **Continue with Google**, once the owner completes [setup](STANDALONE_SETUP.md). Open your avatar or Account to edit your display name, photo, course, year and bio. The sign-in email is read-only and private. **Log out** revokes the VITFind session; it does not sign you out of Google on other websites. No separate VITFind password is stored. Google sign-in does not verify campus enrollment.

The independent version defaults to verified Google accounts, including college Workspace accounts; it can be restricted to personal Gmail addresses. All admitted members use the same campus board, with private claims, messages and bookmarks. The old live Site and its access settings are unchanged by this migration.

## Returning an item

1. Publish a found-item report with a photo and a general description. Keep identifying details private.
2. A different signed-in member submits ownership proof.
3. The finder opens **Incoming claims**, checks the proof and can exchange messages with the claimant.
4. The finder approves the correct claim. Only the claimant receives the collection code.
5. Meet in a safe public place. The finder checks the code and confirms handover only after returning the item.

One item can have only one approved/completed claim. Claimants cannot approve themselves, and unrelated members cannot read private proof or conversations. Moderation privileges default to nobody and can only be provisioned server-side; there is no role-switching or self-promotion control.

## Data and access

Profiles and records persist in D1; uploaded photos are kept in R2. Account identity comes from a validated server session, never a profile field, identity header or persona cookie. The Google board uses a new shared namespace. Earlier records and demonstration scopes are preserved but are not exposed on this board. No accounts are automatically linked by email.

Only names and profile photos are included in public participant display data. Reports are visible to authorized Site members. Email, course, year and bio are returned only to the account owner. Suggestions compare item descriptions/category/colour/location; image recognition is not connected. Messages refresh periodically, rather than using a real-time socket or external push.

## Address

The old managed address is `https://vitfind-campus.hrbrvishal.chatgpt.site`. The independent address is not deployed yet. The exact domain `vitfind-campus.site` is not purchased or connected. Follow the standalone setup guide to deploy to your Cloudflare account, then attach a domain you own and validate HTTPS and Google sign-in.

## Development and deployment

Keep the pinned dependency lockfile. Use the current standalone setup guide and `npm run deploy`, not the historical Sites publication instructions. Run `node --test tests/*.test.mjs` and the TypeScript check before building. Append Drizzle migrations; do not rewrite applied migrations.

Before a wider campus launch, provision authorized moderators, add university verification if required, complete abuse/retention/recovery policies, and test representative peak traffic. Discovery currently loads the latest 200 community reports plus personal and related records; claims/messages are bounded. Campus-wide search/pagination and a real load test remain necessary before claiming 50,000-user readiness. Never introduce public user-controlled gateway identity headers or deploy a test impersonation route.
