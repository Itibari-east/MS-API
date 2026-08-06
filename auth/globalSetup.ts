import path from 'path';
import fs from 'fs/promises';
import _config from '../config/config';
import { _AuthService } from '../services/authservice';
import { isJwtExpired } from '../services/requestHelpers';

async function writeAuthToken(authFilePath: string, token: string, username: string) {
  await fs.writeFile(
    authFilePath,
    JSON.stringify({ default: { token, username } }, null, 2),
    'utf-8',
  );
}

async function globalSetup(): Promise<void> {
  const authFilePath = path.join(__dirname, 'auth.json');

  // Skip re-auth if a valid token was injected manually via auth/setToken.ts
  try {
    const existing = JSON.parse(await fs.readFile(authFilePath, 'utf-8'));
    const existingToken = String(existing.default?.token ?? '');
    if (existingToken.length > 20 && !isJwtExpired(existingToken)) {
      console.log(`[globalSetup] ✓ Using existing token from auth/auth.json`);
      return;
    }
  } catch {
    // file missing or invalid — proceed to login
  }

  const totpSecret = process.env.MS_TOTP_SECRET;
  const manualToken = process.env.MS_WEB_BEARER_TOKEN?.trim() ?? '';

  if (!_config.email || !_config.password) {
    await writeAuthToken(authFilePath, manualToken, _config.email);
    console.warn(
      manualToken
        ? '[globalSetup] Using MS_WEB_BEARER_TOKEN because configured email/password are missing.'
        : '[globalSetup] Skipping token generation. Set the configured email and password to enable authenticated setup.',
    );
    return;
  }

  if (manualToken) {
    await writeAuthToken(authFilePath, manualToken, _config.email);
    console.log('[globalSetup] ✓ Using bearer token from MS_WEB_BEARER_TOKEN');
    return;
  }

  if (!totpSecret) {
    await writeAuthToken(authFilePath, '', _config.email);
    console.warn(
      '[globalSetup] Skipping token generation. Set MS_TOTP_SECRET or MS_WEB_BEARER_TOKEN to enable authenticated setup.',
    );
    return;
  }

  console.log(`\n[globalSetup] Logging in as: ${_config.email}`);

  const authService = new _AuthService();
  const body = await authService.loginWithMfaSetup(
    _config.email,
    _config.password,
    totpSecret,
  );

  const authData = {
    default: {
      token: String(body.accessToken ?? body.token ?? ''),
      username: body.username ?? _config.email,
    },
  };

  await fs.writeFile(authFilePath, JSON.stringify(authData, null, 2), 'utf-8');

  console.log(`[globalSetup] ✓ Token saved to auth/auth.json`);
}

export default globalSetup;
 
