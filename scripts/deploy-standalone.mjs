import "./cloudflare-env.mjs";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

// This script targets only the owner's Cloudflare account, never Sites.
// Keep wrangler.jsonc JSON-compatible so preflight can parse it deterministically.
const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
if (process.env.VITFIND_LOCAL_DEMO === "1" || config.vars?.LOCAL_DEMO_ENABLED === "true")
  throw Error("Local demo login must be disabled before deployment.");
const baseURL = new URL(config.vars?.BETTER_AUTH_URL || "http://localhost");
if (baseURL.protocol !== "https:" || baseURL.hostname === "localhost" ||
    baseURL.hostname.endsWith(".chatgpt.site") || baseURL.pathname !== "/" ||
    baseURL.search || baseURL.hash || baseURL.username || baseURL.password)
  throw Error("Set BETTER_AUTH_URL to your independent HTTPS origin before deploying.");
if (!config.vars.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com"))
  throw Error("Set your Google Web application client ID in wrangler.jsonc.");
if (!config.d1_databases?.[0]?.database_id ||
    ["00000000-0000-4000-8000-000000000000", "11111111-1111-4111-8111-111111111111"].includes(config.d1_databases[0].database_id))
  throw Error("Create your own D1 database and set its database_id first.");
if (!["any-google", "gmail-only"].includes(config.vars.GOOGLE_ACCOUNT_POLICY))
  throw Error("Choose a supported Google account policy.");

function run(args, capture = false) {
  const result = spawnSync(process.execPath, args, {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  return result.stdout;
}
const wrangler = ["--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js"];
const secrets = JSON.parse(run([...wrangler, "secret", "list", "--config", "wrangler.jsonc"], true));
for (const name of ["BETTER_AUTH_SECRET", "GOOGLE_CLIENT_SECRET"])
  if (!secrets.some(secret => secret.name === name))
    throw Error(`Add ${name} securely to your Worker before deploying.`);

run(["--import", "./scripts/sites-env.mjs", "./node_modules/vinext/dist/cli.js", "build"]);
run([...wrangler, "d1", "migrations", "apply", "DB", "--remote", "--config", "wrangler.jsonc"]);
run([...wrangler, "deploy", "--config", "dist/server/wrangler.json"]);
