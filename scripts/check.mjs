import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['.', 'zh-cn', 'zh-hant', 'en-us'];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) await walk(path);
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

console.log(`Checked ${files.length} HTML/JS/TS files and all locale assets.`);
