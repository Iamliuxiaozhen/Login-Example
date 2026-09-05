import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, NODE_ENV: 'development' };
const viteArgs = ['exec', 'vite', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'];
const pagesArgs = ['exec', 'wrangler', '--', 'pages', 'dev', 'dist', '--proxy', '5173', '--port', '8788', '--local-protocol', 'https', '--env-file', '.env'];

const check = spawnSync(npm, ['run', 'check:env'], { env, stdio: 'inherit' });
if (check.status !== 0) process.exit(check.status || 1);

const build = spawnSync(npm, ['run', 'build', '--', '--mode', 'development'], { env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status || 1);

const processes = [
  spawn(npm, viteArgs, { env, stdio: 'inherit' }),
  spawn(npm, pagesArgs, { env, stdio: 'inherit' })
];

function stop(signal = 'SIGTERM') {
  for (const child of processes) if (!child.killed) child.kill(signal);
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stop(signal); process.exit(0); });
for (const child of processes) child.on('exit', (code) => {
  if (code && code !== 0) { stop(); process.exit(code); }
});
