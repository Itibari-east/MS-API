import path from 'path';
import fs from 'fs/promises';
import _config from '../config/config';
import { _AuthService } from '../services/authservice';
import { isJwtExpired } from '../services/requestHelpers';
import { closeDatabase, hasDatabaseConfig, initializeDatabase } from '../utils/database';

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

  if (!totpSecret) {
    if (manualToken) {
      await writeAuthToken(authFilePath, manualToken, _config.email);
      console.log('[globalSetup] ✓ Using bearer token from MS_WEB_BEARER_TOKEN');
      return;
    }

    await writeAuthToken(authFilePath, '', _config.email);
    console.warn(
      '[globalSetup] Skipping token generation. Set MS_TOTP_SECRET or MS_WEB_BEARER_TOKEN to enable authenticated setup.',
    );
    return;
  }

  console.log(`\n[globalSetup] Logging in as: ${_config.email}`);

  const authService = new _AuthService();
  let accessToken = '';
  let username = _config.email;

  try {
    const body = await authService.loginWithMfaSetup(
      _config.email,
      _config.password,
      totpSecret,
    );
    accessToken = String(body.accessToken ?? body.token ?? '').trim();
    username = String(body.username ?? _config.email);
  } catch (error) {
    if (manualToken) {
      console.warn('[globalSetup] MFA login failed; falling back to MS_WEB_BEARER_TOKEN.');
      accessToken = manualToken;
    } else {
      throw error;
    }
  }

  if (!accessToken) {
    throw new Error('[globalSetup] Authentication completed but no access token was returned.');
  }

  if (isJwtExpired(accessToken, 5_000)) {
    throw new Error('[globalSetup] Authentication returned an expired or malformed access token.');
  }

  const authData = {
    default: {
      token: accessToken,
      username,
    },
  };

  await fs.writeFile(authFilePath, JSON.stringify(authData, null, 2), 'utf-8');

  console.log(`[globalSetup] ✓ Token saved to auth/auth.json`);

  if (!hasDatabaseConfig()) {
    console.warn('[globalSetup] Skipping database initialization because database credentials are missing.');
    return;
  }

  console.log('[globalSetup] Initializing database connection...');
  try {
    await initializeDatabase();
    await closeDatabase();
    console.log('[globalSetup] ✓ Database connection ready');
  } catch (error) {
    console.warn(
      `[globalSetup] Skipping database initialization after connection failure: ${(error as Error).message}`,
    );
  }
}

export default globalSetup;
 
