declare const __VITFIND_LOCAL_DEMO__: boolean;
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MEDIA_STORAGE?: "r2" | "d1";
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_ACCOUNT_POLICY?: string;
    LOCAL_DEMO_ENABLED?: string;
  }
}
