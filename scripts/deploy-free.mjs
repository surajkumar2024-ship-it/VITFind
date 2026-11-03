import './cloudflare-env.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const configPath = 'wrangler.free.jsonc';
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const settings = config.vars || {};
const origin = new URL(settings.BETTER_AUTH_URL);
if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.workers.dev') || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)
  throw Error('Set the actual Cloudflare workers.dev address before deployment.');
if (config.r2_buckets?.length || settings.MEDIA_STORAGE !== 'd1' || settings.LOCAL_DEMO_ENABLED !== 'false')
  throw Error('Free deployment requires D1 photo storage and disabled dummy accounts.');
if (!config.d1_databases?.[0]?.database_id || config.d1_databases[0].database_id.startsWith('11111111-'))
  throw Error('Configure the real free D1 database first.');
if (!settings.GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com'))
  throw Error('Configure a real Google OAuth client first.');

process.env.VITFIND_WRANGLER_CONFIG = configPath;
process.env.VITFIND_LOCAL_DEMO = '0';
process.env.VITFIND_FORCE_LOCAL_DEMO = '0';
const wrangler = ['--import', './scripts/cloudflare-env.mjs', './node_modules/wrangler/bin/wrangler.js'];
function run(args, { capture = false, input } = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8', windowsHide: true,
    stdio: capture ? ['pipe','pipe','pipe'] : ['pipe','inherit','inherit'], input,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // Secret upload callers deliberately suppress command output.
    if (capture && !input) console.error(result.stderr || 'Cloudflare command failed.');
    throw Error('Deployment command failed. No paid plan was activated.');
  }
  return result.stdout;
}
function credentials() {
  if (!existsSync('.dev.vars')) throw Error('The local Google credentials file is missing.');
  const text = readFileSync('.dev.vars', 'utf8');
  const value = name => text.match(new RegExp('^' + name + '=(.*)$', 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
  if (value('GOOGLE_CLIENT_ID') !== settings.GOOGLE_CLIENT_ID || !value('GOOGLE_CLIENT_SECRET'))
    throw Error('The configured Google client ID does not match the local credentials.');
  return value('GOOGLE_CLIENT_SECRET');
}
const googleSecret = credentials();
if (!process.argv.includes('--upload-built'))
  run(['--import','./scripts/cloudflare-env.mjs','./node_modules/vinext/dist/cli.js','build']);
const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
if (built.r2_buckets?.length || built.vars?.MEDIA_STORAGE !== 'd1' || built.vars?.LOCAL_DEMO_ENABLED !== 'false' || built.vars?.BETTER_AUTH_URL !== origin.origin)
  throw Error('The build does not match the free deployment configuration.');
if (process.argv.includes('--build-only')) { console.log('Free production build prepared.'); process.exit(0); }
run([...wrangler,'d1','migrations','apply','DB','--remote','--config',configPath]);
if (process.platform === 'win32' || process.argv.includes('--api')) {
  // Vite has already bundled these modules. Direct multipart upload avoids
  // Wrangler's native esbuild entrypoint scan on restricted Windows machines.
  const {uploadFreeWorker}=await import('./upload-free-worker.mjs');
  await uploadFreeWorker(config,built,googleSecret);
} else {
  run([...wrangler,'deploy','--config','dist/server/wrangler.json']);
  const secrets = JSON.parse(run([...wrangler,'secret','list','--config',configPath], {capture:true}));
  const missing = {};
  if (!secrets.some(secret => secret.name === 'BETTER_AUTH_SECRET')) missing.BETTER_AUTH_SECRET = randomBytes(48).toString('base64url');
  if (!secrets.some(secret => secret.name === 'GOOGLE_CLIENT_SECRET')) missing.GOOGLE_CLIENT_SECRET = googleSecret;
  if (Object.keys(missing).length)
    run([...wrangler,'secret','bulk','--config',configPath], {capture:true,input:JSON.stringify(missing)});
}
console.log(`Deployment complete: ${origin.origin}`);
console.log(`Google must authorize this redirect URI: ${origin.origin}/api/auth/callback/google`);
