# VITFind free Cloudflare deployment

Production origin: https://vitfind-campus.vitfind-campus.workers.dev

This deployment uses Workers and D1. It does not bind R2 or activate an R2 subscription.
`wrangler.free.jsonc` is separate from the original local development configuration.

## Deploy

Authenticate with Wrangler using `scripts/cloudflare-env.mjs`, then run:

```text
node scripts/deploy-free.mjs
```

The deploy command builds the app, checks the production configuration, applies migrations
to the free database, uploads the Worker and static files, and adds missing login secrets.
It sends secrets directly to Cloudflare as Worker secret bindings, without writing them
into source or printing them. Existing production auth secrets remain unchanged on redeployment.
On restricted Windows machines, the verified Vite output uploads through Cloudflare's
multipart Worker and static-assets APIs to avoid Wrangler's native bundler path scan.

The owner must register both of these values on the Google Web application OAuth client:

```text
Authorized JavaScript origin:
https://vitfind-campus.vitfind-campus.workers.dev

Authorized redirect URI:
https://vitfind-campus.vitfind-campus.workers.dev/api/auth/callback/google
```

The client currently comes from the owner's ignored `.dev.vars` file. Keep existing
localhost registrations to retain local sign-in. Only openid, email and profile scopes
are requested. Do not expose the client secret or `.dev.vars`.

## Storage limits

The browser compresses uploaded photos to at most 450 KiB. The server accepts at most
512 KiB for each free-mode photo and bounds streamed request bodies too. D1 stores the
JPEG and upload metadata in one transaction. SQLite triggers enforce a global 200 MiB
photo budget, including simultaneous uploads. When that cap is reached the app rejects
new photos with an explanatory error. Reports without photos can still be published.

The free database has a Cloudflare limit of 500 MB per database. The application photo
cap leaves room for profiles and other records. Workers Free permits 100,000 dynamic
requests per day, and D1 Free has daily read/write limits. Reaching platform quotas can
make requests fail. These are small-launch limits, not a claim of readiness for 50,000 students.

Dummy sign-in is disabled in production builds. Photo reads retain authentication and
report/profile ownership checks. Old local R2 photos are not moved or deleted.

## Local checks of the free storage mode

```text
node --test tests/free-photo-storage.test.mjs
node scripts/run-free-local.mjs
```

The free-mode local launcher uses a separate database binding on port 5175 and only permits
dummy accounts on loopback HTTP. It never enables those accounts on the public deployment.

Official limits:
https://developers.cloudflare.com/workers/platform/limits/
https://developers.cloudflare.com/d1/platform/limits/
https://developers.cloudflare.com/d1/platform/pricing/
