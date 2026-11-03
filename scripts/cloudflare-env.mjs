import "./sites-env.mjs";
import { resolve } from "node:path";

// Keep the deployment login inside this ignored checkout-local runtime folder.
// This changes only the current process, never Windows or global CLI settings.
process.env.XDG_CONFIG_HOME = resolve(".sites-runtime/cloudflare-config");
