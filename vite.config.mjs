import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

const root = process.cwd();
const htmlInputs = [];
const staticDirectories = ['js', 'me', 'css', 'i18n'];

function collectHtml(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.wrangler'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtml(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlInputs.push(fullPath);
  }
}

collectHtml(root);

function copyStaticDirectories() {
  return {
    name: 'copy-static-directories',
    closeBundle() {
      const outputDirectory = path.resolve(root, 'dist');
      for (const directory of staticDirectories) {
        fs.cpSync(path.resolve(root, directory), path.join(outputDirectory, directory), { recursive: true });
      }
    }
  };
}

function useStableProfileStylesheet() {
  return {
    name: 'use-stable-profile-stylesheet',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        if (!context.path.includes('/me/')) return html;
        return html.replace(
          /<link rel="stylesheet" crossorigin href="\/assets\/style-[^"]+\.css">/g,
          '<link href="/css/me/style.css" rel="stylesheet">'
        );
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, root, ''), ...process.env };
  if (mode === 'production' && !env.VITE_TURNSTILE_SITE_KEY) {
    throw new Error('Missing required environment variable: VITE_TURNSTILE_SITE_KEY');
  }

  return {
    root,
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      hmr: { host: 'localhost', clientPort: 8788, protocol: 'wss' }
    },
    build: {
      outDir: path.resolve(root, 'dist'),
      emptyOutDir: true,
      rollupOptions: { input: htmlInputs }
    },
    plugins: [useStableProfileStylesheet(), copyStaticDirectories()]
  };
});
