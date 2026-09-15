# VITFind Campus

## Accounts

Use **Sign in with ChatGPT**. Open your avatar or Account to edit your display name, photo, course, year and bio. The sign-in email is read-only and private. **Log out** uses the hosting platform's sign-out flow; no separate VITFind password is stored. Campus enrollment is not verified by ChatGPT sign-in.

The Site currently keeps its owner-private access policy. Other users must be invited through Site access controls before they can join. Authentication does not itself make the site public. All admitted members use the same campus board, with private claims, messages and bookmarks.

## Returning an item

1. Publish a found-item report with a photo and a general description. Keep identifying details private.
2. A different signed-in member submits ownership proof.
3. The finder opens **Incoming claims**, checks the proof and can exchange messages with the claimant.
4. The finder approves the correct claim. Only the claimant receives the collection code.
5. Meet in a safe public place. The finder checks the code and confirms handover only after returning the item.

One item can have only one approved/completed claim. Claimants cannot approve themselves, and unrelated members cannot read private proof or conversations. Moderation privileges default to nobody and can only be provisioned server-side; there is no role-switching or self-promotion control.

## Data and access

Profiles and records persist in D1; uploaded photos are kept in R2. Account identity comes exclusively from the trusted hosting dispatcher, never a profile field or persona cookie. The active board uses a new shared namespace. Earlier sample records and private demonstration scopes are preserved but are not exposed on this board.

Only names and profile photos are included in public participant display data. Reports are visible to authorized Site members. Email, course, year and bio are returned only to the account owner. Suggestions compare item descriptions/category/colour/location; image recognition is not connected. Messages refresh periodically, rather than using a real-time socket or external push.

## Address

The managed address is `https://vitfind-campus.hrbrvishal.chatgpt.site`. The exact domain `vitfind-campus.site` is not purchased or connected. After obtaining the domain, attach it through Sites, apply the returned DNS/verification records at the registrar and validate HTTPS and sign-in on the new hostname. Do not guess DNS targets or change the current Site audience just to connect a domain.

## Development and deployment

Keep the pinned dependency lockfile and existing Sites/Vinext build scripts. Run `node --test tests/domain.test.mjs` for matching tests and the TypeScript check before building. Append Drizzle migrations; do not rewrite applied migrations. The profile schema is introduced by `0002_absent_black_cat.sql`.

Before a wider campus launch, provision authorized moderators, add university verification if required, complete abuse/retention/recovery policies, and test representative peak traffic. Discovery currently loads the latest 200 community reports plus personal and related records; claims/messages are bounded. Campus-wide search/pagination and a real load test remain necessary before claiming 50,000-user readiness. Never introduce public user-controlled gateway identity headers or deploy a test impersonation route.
