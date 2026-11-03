# VITFind: independent hosting and Google sign-in

This checkout now targets your own Cloudflare Workers account. Google is the only login provider; no ChatGPT account or Sites gateway is required by this version. The existing hosted Site remains unchanged until a separate launch is completed. Google login cannot work until real OAuth credentials are configured.

## What you need to provide

1. A [Cloudflare account](https://dash.cloudflare.com/) you control. Create a Worker named `vitfind-campus`, a D1 database named `vitfind-campus`, and a private R2 bucket named `vitfind-campus-photos`. Review the provider's billing/usage terms before enabling services. Do not enable a public R2 bucket URL.
2. A [Google Cloud project](https://console.cloud.google.com/) you control. In Google Auth Platform, configure branding, support/contact details and audience, then create an OAuth client of type **Web application**. Use External audience for personal Gmail users; while in Testing, explicitly add test users. Request only `openid`, `email`, and `profile`. No Gmail inbox permissions are needed.
3. An initial independent HTTPS address. Copy the exact Worker URL from Cloudflare; do not guess the account subdomain. A purchased domain is not required for initial testing. `vitfind-campus.site` is not owned or connected yet.

Do not paste passwords, client secrets or API tokens into chat. Enter secrets through the provider's secure dashboard or an interactive local prompt.

## Configure Google

Register these authorized redirect URIs, using the exact real production origin in place of the example:

```text
http://localhost:5173/api/auth/callback/google
https://YOUR-WORKER-HOST/api/auth/callback/google
```

When the custom domain is connected, add `https://vitfind-campus.site/api/auth/callback/google` too. Keep development and production OAuth clients separate when possible. Google login does not prove campus enrollment; the default accepts any verified Google account, including college Workspace accounts. Set `GOOGLE_ACCOUNT_POLICY` to `gmail-only` only if personal `@gmail.com` addresses are intended.

## Local development

1. Install the pinned dependencies with `npm ci`.
2. Copy `.dev.vars.example` to `.dev.vars`. Add the Google client ID/secret and an independently generated random auth secret of at least 32 bytes. Keep `BETTER_AUTH_URL=http://localhost:5173`.
3. Run `npm run db:local`, then `npm run dev`.
4. Sign in using an authorized Google test account. There is no simulated login or bypass. Until credentials are configured, the welcome screen explains that sign-in is awaiting setup and protected APIs deny access.

The inherited `scripts/sites-env.mjs` only keeps local development-tool files inside this folder; it does not connect to or authenticate through Sites. `.openai/hosting.json` and old Sites scripts remain solely as migration history and are not used by the current build/deploy configuration.

## Deploy to your account

1. Authenticate Wrangler with `npx wrangler login` in your terminal.
2. In `wrangler.jsonc`, replace the placeholder database ID with your actual D1 ID. Confirm the Worker and private bucket names match your resources.
3. Set `BETTER_AUTH_URL` to your exact independent HTTPS origin, `GOOGLE_CLIENT_ID` to your production Google client ID, and the desired account policy. These are not secrets.
4. In the Worker's Settings → Variables and Secrets, add `BETTER_AUTH_SECRET` and `GOOGLE_CLIENT_SECRET` as encrypted secrets. Generate a distinct production auth secret. Never put secrets in `wrangler.jsonc`, browser code or Git.
5. Run `npm run deploy`. This checks configuration and required secret names, builds the app, applies the append-only database migrations to your D1 database, and deploys the Worker. It does not create a new Sites publication.
6. Confirm the real Google callback, cookie/session persistence after refresh, editable profile, logout and denied access after logout. Then use two separate Google accounts to test report ownership, private claims/messages and handover. This end-to-end provider test is required before calling login production-ready.

For `vitfind-campus.site`, first purchase it, add it to your Cloudflare account, and follow Cloudflare's returned DNS/custom-domain instructions. Register the new Google redirect URI, update `BETTER_AUTH_URL`, deploy and repeat the sign-in/logout checks. Do not invent DNS values or remove the old working URL before verification. Google consent publication may require domain verification, app homepage/privacy-policy details and further Google review.

## Data and security boundaries

- New Google identities have a separate namespace and fresh shared board. Nothing automatically links Google accounts to old ChatGPT accounts by name or email. Old reports, uploads and moderator roles are not exported, reassigned or deleted. Any future transfer needs explicit authorization and a verified ownership mapping.
- Database sessions are validated on every protected API request. Authentication ignores old dispatcher identity headers and persona cookies. Logout uses a POST and revokes the server session. OAuth token storage is encrypted; auth endpoints use database-backed rate limiting.
- D1 signup uses narrowly scoped recovery for incomplete new-user creation: only IDs generated in that same request can be cleaned up, and only if they have no account, session or app profile. Abrupt Worker termination can still require operator recovery of a confirmed orphan by its exact ID; never fix this by enabling email-based linking.
- Private profiles, claim proof, messages and photos retain existing authorization checks. Only profile names/photos are shared with board members. All new users start as members, with no self-promotion to moderator.
- This is not a certification for 50,000 users. Before campus-wide rollout, add institution admission rules if required, moderators, abuse/retention/recovery policies, backups/monitoring and load tests. Existing bounded polling/search still needs capacity planning and pagination work for that scale.

Official references: [Google provider configuration](https://better-auth.com/docs/authentication/google), [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Cloudflare custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
