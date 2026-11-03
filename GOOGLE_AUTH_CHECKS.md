# Google-auth migration checks — 15 September 2026

Status: local implementation prepared; independent hosting and real Google OAuth activation are pending owner setup. The old live Site is unchanged.

Passed locally:

- TypeScript validation and standalone production build.
- Eight regression tests covering auth configuration/admission, incomplete-signup cleanup constraints and item matching.
- Fresh standalone D1 database: all four migrations applied successfully. The previous local database was preserved.
- Welcome screen at 390 × 844 and 1440 × 900: no horizontal overflow or browser runtime errors after startup.
- With credentials absent, Google sign-in is visibly unavailable; its endpoint returns 503. State, actions and photo endpoints deny access with 401, including a request containing forged legacy identity headers/cookie.
- Deployment preflight refuses the unconfigured localhost setup before contacting the hosting provider.
- No ChatGPT identity helper or Sites mock-login plugin is imported by the current app/build.

Not yet verified:

- Real Google consent/callback and session creation with owner-provided credentials.
- End-to-end authenticated profile edits, cookie renewal, logout/revocation and two-user permissions on the new independent host.
- Failure injection for interrupted first-time signup, recovery, and concurrent Google callbacks.
- Custom domain/DNS, production backups/monitoring, abuse protection, and 50,000-user load behavior.

The dependency audit reported five moderate findings in the browser-target mapping and esbuild/Drizzle tooling dependency chains; no high/critical finding was reported by that audit. A forced automated fix proposed a breaking Drizzle downgrade and was not applied. Review these before wider launch and do not expose development servers to untrusted networks.
