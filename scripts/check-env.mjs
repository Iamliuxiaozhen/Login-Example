import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: false });

const required = [
  'VITE_TURNSTILE_SITE_KEY', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_REDIRECT_URI',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
  'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_REDIRECT_URI',
  'TURNSTILE_SECRET_KEY', 'TURNSTILE_SESSION_SECRET'
];
const missing = required.filter((name) => !process.env[name]);

if (!fs.existsSync(path.resolve(process.cwd(), '.env')) && missing.length) {
  console.error('Missing .env and required exported environment variables.');
}
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Environment validated for ${process.env.NODE_ENV || 'development'} mode.`);
