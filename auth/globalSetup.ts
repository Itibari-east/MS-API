import path from 'path';
import fs from 'fs/promises';
import _config from '../config/config';
import { _AuthService } from '../services/authservice';
import { isJwtExpired } from '../services/requestHelpers';

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

  if (!_config.email || !_config.password) {
    await fs.writeFile(
      authFilePath,
      JSON.stringify({ default: { token: '', username: _config.email } }, null, 2),
      'utf-8',
    );
    console.warn(
      '[globalSetup] Skipping token generation. Set the configured email and password to enable authenticated setup.',
    );
    return;
  }

  if (!totpSecret) {
    await fs.writeFile(
      authFilePath,
      JSON.stringify({ default: { token: '', username: _config.email } }, null, 2),
      'utf-8',
    );
    console.warn('[globalSetup] Skipping token generation. MS_TOTP_SECRET is required to complete MFA login.');
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
 
