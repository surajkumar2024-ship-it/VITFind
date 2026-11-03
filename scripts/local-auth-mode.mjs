export function hasLocalGoogleCredentials(raw) {
  return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET"].every(key => {
    const value = raw.match(new RegExp("^" + key + "=(.*)$", "m"))?.[1]?.trim().replace(/^[\"']|[\"']$/g, "");
    return Boolean(value && value.length >= (key === "BETTER_AUTH_SECRET" ? 32 : 1));
  });
}

export function useLocalPracticeAccounts(command, requested, forceDemo, credentials) {
  return command === "serve" && requested === "1" &&
    (!hasLocalGoogleCredentials(credentials) || forceDemo === "1");
}
