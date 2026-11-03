export type AuthSettings = {
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_ACCOUNT_POLICY?: string;
};

export function readAuthSettings(settings: AuthSettings) {
  const { BETTER_AUTH_URL: baseURL, BETTER_AUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = settings;
  if (!baseURL || !secret || secret.length < 32 || !clientId || !clientSecret) return null;
  try {
    const url = new URL(baseURL);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    const policy = settings.GOOGLE_ACCOUNT_POLICY || "any-google";
    if (policy !== "any-google" && policy !== "gmail-only") return null;
    return { baseURL: url.origin, secret, clientId, clientSecret, policy };
  } catch { return null; }
}

export function admittedGoogleEmail(email: string, verified: boolean, policy: string) {
  return verified && (policy === "any-google" ||
    (policy === "gmail-only" && /^[^@\s]+@gmail\.com$/i.test(email)));
}
