import vinext from "vinext";
import { defineConfig } from "vite";
import { localVisionAssets } from "./scripts/local-vision-assets";
import { buildVisionWorker } from "./scripts/build-vision-worker.mjs";
import { stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { useLocalPracticeAccounts } from "./scripts/local-auth-mode.mjs";

async function currentVisionWorker() {
  try {
    const output = await stat("public/vision-worker.js");
    const inputs = await Promise.all([
      "lib/vision.worker.ts", "lib/vision-config.ts",
      "scripts/build-vision-worker.mjs", "package-lock.json",
    ].map(path => stat(path)));
    return output.size > 0 && inputs.every(input => input.mtimeMs <= output.mtimeMs);
  } catch { return false; }
}

export default defineConfig(async ({ command }) => {
  // Reuse an up-to-date local worker on restart; production always rebuilds.
  if (command !== "serve" || !await currentVisionWorker()) await buildVisionWorker();
  // This literal is ALWAYS false in builds, even with NODE_ENV=development.
  const credentials = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : "";
  const localDemo = useLocalPracticeAccounts(command, process.env.VITFIND_LOCAL_DEMO,
    process.env.VITFIND_FORCE_LOCAL_DEMO, credentials);
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    // Each dev process owns its optimizer files. A failed second startup must
    // not overwrite the browser dependencies of the server already in use.
    cacheDir: command === "serve" ? `node_modules/.vite-vitfind-${process.pid}` : "node_modules/.vite-vitfind-build",
    define: { __VITFIND_LOCAL_DEMO__: JSON.stringify(localDemo) },
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    plugins: [
      localVisionAssets(),
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        configPath: process.env.VITFIND_WRANGLER_CONFIG || "wrangler.jsonc",
        config: (config) => ({ vars: { ...config.vars, LOCAL_DEMO_ENABLED: localDemo ? "true" : "false" } }),
      }),
    ],
  };
});
