import "./sites-env.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { hasLocalGoogleCredentials } from "./local-auth-mode.mjs";
import { createServer } from "node:net";

let credentials = "";
if (existsSync(".dev.vars")) credentials = readFileSync(".dev.vars", "utf8");
const configured = hasLocalGoogleCredentials(credentials);
const demo = !configured || process.argv.includes("--demo");
let localPort = "5173";
let localOrigin = "http://localhost:5173";
if (configured) {
  const value = credentials.match(/^BETTER_AUTH_URL=(.*)$/m)?.[1]?.trim().replace(/^[\"']|[\"']$/g, "");
  const url = new URL(value || localOrigin);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw Error("The local launcher requires a loopback HTTP BETTER_AUTH_URL.");
  localPort = url.port || "80";
  localOrigin = url.origin;
}
console.log(demo ? `Starting VITFind with local practice accounts. Open ${localOrigin}.` : `Starting VITFind with Google sign-in. Open ${localOrigin}.`);
// Check the configured port before doing any work. Vinext's project-wide lock
// can describe a different local port; strictPort still prevents duplicate binds.
try {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen({host:"127.0.0.1",port:Number(localPort)}, () => probe.close(resolve));
  });
} catch {
  console.error(`Port ${localPort} is already in use. Stop the existing VITFind server before restarting. Your app address is ${localOrigin}.`);
  process.exit(1);
}
const migration = spawnSync(process.execPath, ["--import", "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "DB", "--local", "--config", "wrangler.jsonc"],
  { stdio: "inherit" });
if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status || 1);
process.env.VITFIND_LOCAL_DEMO = demo ? "1" : "0";
process.env.VITFIND_FORCE_LOCAL_DEMO = process.argv.includes("--demo") ? "1" : "0";
process.env.VINEXT_NO_DEV_LOCK = "1";
const cli = new URL("../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), "dev", "--hostname", "127.0.0.1", "--port", localPort];
await import(cli.href);
