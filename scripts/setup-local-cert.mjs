import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const script = isWindows ? 'setup-local-cert.bat' : 'setup-local-cert.sh';
const scriptPath = path.join(scriptDir, script);

const result = spawnSync(scriptPath, [], {
  stdio: 'inherit',
  cwd: root,
  shell: isWindows
});
process.exit(result.status ?? 1);
