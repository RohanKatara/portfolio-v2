// Build the standalone React demo without mixing its runtime into Astro.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const demo = resolve(root, 'demos/automation');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = args => {
  const result = spawnSync(npm, args, { cwd: demo, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// Clean CI installs use the demo's own lockfile; local installs can be reused.
if (process.env.CI || !existsSync(resolve(demo, 'node_modules/.package-lock.json'))) run(['ci', '--no-audit', '--no-fund']);
run(['run', 'build']);
// Astro already created a fresh dist. Copy last, so its generated sitemap and
// portfolio routes remain intact and no generated demo files enter source control.
mkdirSync(resolve(root, 'dist/automation-demos'), { recursive: true });
cpSync(resolve(demo, 'dist'), resolve(root, 'dist/automation-demos'), { recursive: true });
