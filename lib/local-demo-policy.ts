export const localDemoAccounts = {
  student: { id: "local-demo:student", name: "Demo Student", email: "student@vitfind.example" },
  second: { id: "local-demo:second", name: "Second Student", email: "second@vitfind.example" },
} as const;
export type LocalDemoAccount = keyof typeof localDemoAccounts;
export const localDemoScope = "vitfind-local-demo-v1";
export const localDemoCookie = "vitfind_local_demo";

export function localDemoAllowed(compiled: boolean, runtime: string | undefined, url: string, headers: Headers) {
  if (!compiled || runtime !== "true") return false;
  try {
    const target = new URL(url);
    return target.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) &&
      headers.get("host") === target.host &&
      !headers.has("forwarded") &&
      // The local Worker proxy adds this header. Never use it to select a host;
      // accept it only when it agrees exactly with the loopback URL and Host.
      (!headers.has("x-forwarded-host") || headers.get("x-forwarded-host") === target.host);
  } catch { return false; }
}

export function localDemoWriteAllowed(request: Request) {
  return request.method === "POST" && request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}

export function localDemoToken(headers: Headers) {
  const value = headers.get("cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(localDemoCookie + "="))?.slice(localDemoCookie.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export async function tokenHash(token: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
}
