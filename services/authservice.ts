import { APIResponse } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _AuthRequests, Channel } from '../requests/auth';
import { common } from '../utils/common';
import { extractAuthToken } from './requestHelpers';
import { generateTotpCandidates, generateTotpCode } from '../utils/totp';
import _config  from '../config/config';

function jsonRequestHeaders() {
  return {
    accept: '*/*',
    'content-type': 'application/json',
  };
}

function authenticatedJsonHeaders(token?: string) {
  return {
    ...jsonRequestHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function isInvalidAuthenticatorCode(message: string): boolean {
  return /invalid authenticator code|bad credentials/i.test(message);
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface LoginResponse {
  /** Intermediate session identifier returned after credential check */
  sessionToken?: string;
  [key: string]: unknown;
}

export interface MfaSetupResponse {
  /** Base-32 secret to store and use for TOTP generation */
  secret: string;
  /** otpauth:// URI — encode as QR code in a real app */
  qrCodeUri?: string;
  [key: string]: unknown;
}

export interface MfaVerifyResponse {
  /** Final bearer token — store this in auth.json */
  accessToken: string;
  username?: string;
  [key: string]: unknown;
}

export interface MfaSetupConfirmResponse {
  accessToken?: string;
  token?: string;
  username?: string;
  [key: string]: unknown;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class _AuthService {
  // ── Step 1: Login ────────────────────────────────────────────────────────

  /** POST /login — raw response */
  async login(
    username: string,
    password: string,
    channel: Channel = serviceConstants.auth.channel.web,
  ): Promise<APIResponse> {
    const { url, body } = _AuthRequests.login(username, password, channel);
    return common.postResponse(url, body, jsonRequestHeaders());
  }

  // ── MFA Setup (one-time onboarding flow) ─────────────────────────────────

  /** POST /auth/mfa/setup — initiates MFA; returns secret + QR URL */
  async mfaSetup(token?: string): Promise<APIResponse> {
    const { url } = _AuthRequests.mfaSetup();
    return common.postResponse(url, undefined, authenticatedJsonHeaders(token ?? process.env.MS_WEB_BEARER_TOKEN));
  }

  /** POST /auth/mfa/setup/confirm — confirms MFA with first TOTP code */
  async mfaSetupConfirm(secret: string, totpCode: string, token?: string): Promise<APIResponse> {
    const { url, body } = _AuthRequests.mfaSetupConfirm(secret, totpCode);
    return common.postResponse(url, body, authenticatedJsonHeaders(token ?? process.env.MS_WEB_BEARER_TOKEN));
  }

  // ── Step 2: MFA Verify (part of every login after setup) ─────────────────

  /** POST /auth/mfa/verify — submits TOTP code; returns final bearer token */
  async mfaVerify(totpCode: string, token?: string): Promise<APIResponse> {
    const { url, body } = _AuthRequests.mfaVerify(totpCode);
    return common.postResponse(url, body, authenticatedJsonHeaders(token ?? process.env.MS_WEB_BEARER_TOKEN));
  }

  /** DELETE /auth/mfa/disable — disables MFA for the current user */
  async disableMfa(token?: string): Promise<APIResponse> {
    const { url } = _AuthRequests.mfaDisable();
    return common.deleteResponse(url, undefined, authenticatedJsonHeaders(token ?? process.env.MS_WEB_BEARER_TOKEN));
  }

  // ── Forgot Password ───────────────────────────────────────────────────────

  /** POST /login/forgetPassword?username=... */
  async forgotPassword(username: string): Promise<APIResponse> {
    const { url } = _AuthRequests.forgotPassword(username);
    return common.postResponse(url, undefined, jsonRequestHeaders());
  }

  // ── Convenience: full login + MFA verify in one call ─────────────────────

  /**
   * Runs the full authenticator flow:
   *   POST /login  →  POST /auth/mfa/verify (with a freshly generated TOTP)
   *
   * Returns the MFA verify response body containing the final token.
   * Throws on any non-2xx step.
   */
  async loginWithMfa(
    username: string,
    password: string,
    totpCode: string,
    channel: Channel = serviceConstants.auth.channel.web,
  ): Promise<MfaVerifyResponse> {
    // Step 1 — credential check
    const loginRes = await this.login(username, password, channel);
    if (!loginRes.ok()) {
      throw new Error(`[login] ${loginRes.status()}: ${await loginRes.text()}`);
    }

    const loginBody = (await loginRes.json().catch(() => ({} as LoginResponse & { challengeToken?: string }))) as LoginResponse & { challengeToken?: string };
    const challengeToken = String(loginBody.challengeToken ?? '');

    if (!challengeToken) {
      throw new Error('[login] Missing challenge token for MFA verification');
    }

    // Step 2 — TOTP verification
    const verifyRes = await this.mfaVerify(totpCode, challengeToken);
    if (!verifyRes.ok()) {
      throw new Error(`[mfa/verify] ${verifyRes.status()}: ${await verifyRes.text()}`);
    }

    const finalAccessToken = await extractAuthToken(verifyRes);
    if (!finalAccessToken) {
      throw new Error('[mfa/verify] Missing access token in response headers');
    }

    return {
      accessToken: finalAccessToken,
      username: _config.email,
    };
  }

  /**
   * Runs the full MFA onboarding flow:
   *   POST /login
   *   POST /auth/mfa/setup
   *   POST /auth/mfa/setup/confirm
   *   POST /auth/mfa/verify
   */
  async loginWithMfaSetup(
    username: string,
    password: string,
    totpSecret: string,
    channel: Channel = serviceConstants.auth.channel.web,
    seedToken = process.env.MS_WEB_BEARER_TOKEN,
  ): Promise<MfaVerifyResponse> {
    const loginRes = await this.login(username, password, channel);
    if (!loginRes.ok()) {
      throw new Error(`[login] ${loginRes.status()}: ${await loginRes.text()}`);
    }

    const loginBody = (await loginRes.json().catch(() => ({} as LoginResponse & { challengeToken?: string }))) as LoginResponse & { challengeToken?: string };
    const challengeToken = String(loginBody.challengeToken ?? seedToken ?? '');

    if (!challengeToken) {
      throw new Error('[login] Missing challenge token for MFA setup');
    }

    const setupRes = await this.mfaSetup(challengeToken);
    if (!setupRes.ok()) {
      throw new Error(`[mfa/setup] ${setupRes.status()}: ${await setupRes.text()}`);
    }

    const setupBody = await setupRes.json().catch(() => ({} as MfaSetupResponse));
    const setupSecret = String((setupBody as MfaSetupResponse).secret ?? totpSecret);
    const confirmCode = generateTotpCode(setupSecret);

    const confirmRes = await this.mfaSetupConfirm(setupSecret, confirmCode, challengeToken);
    if (!confirmRes.ok()) {
      throw new Error(`[mfa/setup/confirm] ${confirmRes.status()}: ${await confirmRes.text()}`);
    }

    const confirmAccessToken = await extractAuthToken(confirmRes);
    if (confirmAccessToken) {
      return {
        accessToken: confirmAccessToken,
        username: _config.email,
      };
    }

    const verifyCandidates = generateTotpCandidates(setupSecret);
    let verifyErrorText = '';

    for (const candidate of verifyCandidates) {
      const verifyRes = await this.mfaVerify(candidate, challengeToken);
      if (verifyRes.ok()) {
        const finalAccessToken = await extractAuthToken(verifyRes);
        if (!finalAccessToken) {
          throw new Error('[mfa/verify] Missing access token in response headers');
        }

        return {
          accessToken: finalAccessToken,
          username: _config.email,
        };
      }

      verifyErrorText = await verifyRes.text();
      if (!isInvalidAuthenticatorCode(verifyErrorText)) {
        break;
      }
    }

    throw new Error(`[mfa/verify] Failed to verify authenticator code: ${verifyErrorText || 'unknown error'}`);

  }
}
