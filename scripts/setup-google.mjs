import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  console.log("VITFind Google sign-in setup. Your credentials stay in the ignored .dev.vars file.");
  const answer = process.argv[2] || await prompt.question("Path to the OAuth client JSON downloaded from Google Cloud: ");
  const filename = resolve(answer.trim().replace(/^['\"]|['\"]$/g, ""));
  await access(filename);
  const client = JSON.parse(await readFile(filename, "utf8")).web;
  if (!client?.client_id?.endsWith(".apps.googleusercontent.com") || !client.client_secret)
    throw Error("Download an OAuth client of type Web application from Google Cloud.");
  const requestedOrigin = new URL(process.argv[3] || "http://localhost:5173");
  if (requestedOrigin.protocol !== "http:" || requestedOrigin.hostname !== "localhost" ||
      requestedOrigin.username || requestedOrigin.password || requestedOrigin.pathname !== "/" ||
      requestedOrigin.search || requestedOrigin.hash)
    throw Error("Use a local origin such as http://localhost:5174.");
  const origin = requestedOrigin.origin;
  const callback = origin + "/api/auth/callback/google";
  if (!client.redirect_uris?.includes(callback))
    throw Error("Add " + callback + " to Authorized redirect URIs, then download the updated JSON.");
  const envPath = resolve(root, ".dev.vars");
  let existing = "";
  try { existing = await readFile(envPath, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const previousSecret = existing.match(/^BETTER_AUTH_SECRET=["']?([^\r\n"']+)/m)?.[1];
  const values = {
    BETTER_AUTH_URL: origin,
    GOOGLE_CLIENT_ID: client.client_id,
    GOOGLE_CLIENT_SECRET: client.client_secret,
    BETTER_AUTH_SECRET: previousSecret?.length >= 32 ? previousSecret : randomBytes(48).toString("base64url"),
    GOOGLE_ACCOUNT_POLICY: "any-google",
  };
  const rest = existing.split(/\r?\n/).filter(line => !Object.keys(values).some(key => line.startsWith(key + "=")));
  await writeFile(envPath, rest.join("\n").trim() + "\n" + Object.entries(values).map(([key,value]) => key + "=" + JSON.stringify(value)).join("\n") + "\n", {mode:0o600});
  console.log("Google credentials configured. Restart with npm run local, then open " + origin + ".");
  console.log("Google sign-in is used automatically when these credentials are configured. No Gmail inbox permission is requested.");
} catch(error) {
  console.error(error instanceof Error ? error.message : "Google setup failed.");
  process.exitCode = 1;
} finally { prompt.close(); }
