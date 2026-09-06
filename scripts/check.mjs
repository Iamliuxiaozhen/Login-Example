import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['.', 'zh-cn', 'zh-hant', 'en-us'];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git', 'dist', '.wrangler'].includes(entry.name)) await walk(path);
    else if (entry.isFile() && ['.html', '.js', '.ts'].includes(extname(path))) files.push(path);
  }
}

for (const root of roots) await walk(root);
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (extname(file) === '.html' && file !== '404.html' && (!content.includes('<html') || !content.includes('</html>'))) throw new Error(`${file}: malformed HTML shell`);
}

for (const locale of ['zh-cn', 'zh-hant', 'en-us']) {
  for (const file of [`${locale}/index.html`, `i18n/legal/${locale}/terms.md`, `i18n/legal/${locale}/privacy.md`]) {
    await readFile(file);
  }
}

for (const file of ['vite.config.mjs', '.env.example']) {
  await readFile(file);
}

const envExample = await readFile('.env.example', 'utf8');
for (const name of [
  'VITE_TURNSTILE_SITE_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_REDIRECT_URI',
  'TURNSTILE_SECRET_KEY', 'TURNSTILE_SESSION_SECRET'
]) {
  if (!new RegExp(`^${name}=`, 'm').test(envExample)) throw new Error(`.env.example: missing ${name}`);
}

console.log(`Checked ${files.length} HTML/JS/TS files and all locale assets.`);
