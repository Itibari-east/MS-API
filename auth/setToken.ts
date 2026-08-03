/**
 * Manual token injection script.
 *
 * Usage:
 *   npx ts-node auth/setToken.ts <your-bearer-token>
 *
 * Get a token by logging into the web app, then copying it from:
 *   - Browser DevTools → Application → Local Storage → itibari_t
 *   - Or any API response header that contains "Authorization: Bearer <token>"
 *   - Or from the /auth/mfa/verify response in DevTools Network tab
 */

import path from 'path';
import fs from 'fs';

const authFilePath = path.join(__dirname, 'auth.json');
const token = process.argv[2];

if (!token || token.length < 10) {
  console.error(`
Usage: npx ts-node auth/setToken.ts <your-bearer-token>

How to get a token:
  1. Open the web app (https://micro-dev.itibari.io) in your browser
  2. Log in with your credentials
  3. Open DevTools (F12) → Application tab → Local Storage
  4. Find the key "itibari_t" and copy its value
  5. Run: npx ts-node auth/setToken.ts <paste-token-here>

Or from the Network tab:
  1. Log in and look for a request to /auth/mfa/verify
  2. In the Response tab, find the "accessToken" field
  3. Copy that value and run the command above
`);
  process.exit(1);
}

const authData = {
  default: {
    token,
    username: process.env.MS_USER_EMAIL || 'manual-setup',
  },
};

fs.writeFileSync(authFilePath, JSON.stringify(authData, null, 2), 'utf-8');
console.log(`✓ Token written to ${authFilePath}`);
console.log(`  Token starts with: ${token.substring(0, 20)}...`);
console.log(`  Length: ${token.length} characters`);
