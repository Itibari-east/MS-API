import { APIResponse } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { serviceConstants } from '../constants/endpoints';
import { _AuthRequests, Channel } from '../requests/auth';
import { common } from '../utils/common';
import { extractAuthToken } from './requestHelpers';
import { generateTotpCandidates, generateTotpCode } from '../utils/totp';
import _config  from '../config/config';
import { GmailClient } from './gmailClient';
import { shouldAttemptPasswordRecovery } from '../utils/email';
import { _UserManagementService } from './userManagement';

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

function readStoredAuthToken(): string {
  const authFilePath = path.join(process.cwd(), 'auth', 'auth.json');
  if (!fs.existsSync(authFilePath)) {
    return '';
  }

  try {
    const authData = JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));
    return String(authData?.default?.token ?? '').trim();
  } catch {
    return '';
  }
}

function isInvalidAuthenticatorCode(message: string): boolean {
  return /invalid authenticator code|bad credentials|code does not match|please try again/i.test(message);
}

function readChallengeToken(body: LoginResponse & { challengeToken?: string }): string {
  return String(body.challengeToken ?? '');
}

function readCurrentUserPublicId(body: any): string {
  const candidates = [
    body?.publicId,
    body?.data?.publicId,
    body?.content?.publicId,
    body?.user?.publicId,
    body?.default?.publicId,
  ];

  return String(candidates.find((value) => typeof value === 'string' && value.trim()) ?? '').trim();
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
  private readonly gmail = new GmailClient();
  private readonly userManagement = new _UserManagementService();

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
  async forgotPassword(username: string, token?: string): Promise<APIResponse> {
    const { url } = _AuthRequests.forgotPassword(username);
    return common.postResponse(url, undefined, authenticatedJsonHeaders(token ?? process.env.MS_WEB_BEARER_TOKEN ?? readStoredAuthToken()));
  }

  private async loginOrRecoverPassword(
    username: string,
    password: string,
    channel: Channel,
  ): Promise<{ challengeToken: string; usedPassword: string; recoveredFromEmail: boolean }> {
    const loginRes = await this.login(username, password, channel);
    if (loginRes.ok()) {
      const loginBody = (await loginRes.json().catch(() => ({} as LoginResponse & { challengeToken?: string }))) as LoginResponse & { challengeToken?: string };
      const challengeToken = readChallengeToken(loginBody);
      if (!challengeToken) {
        throw new Error('[login] Missing challenge token in response');
      }

      return {
        challengeToken,
        usedPassword: password,
        recoveredFromEmail: false,
      };
    }

    const failureText = await loginRes.text();
    if (!shouldAttemptPasswordRecovery(failureText)) {
      throw new Error(`[login] ${loginRes.status()}: ${failureText}`);
    }

    console.warn('[login] Password reset flow detected. Waiting for one-time password email...');
    await this.forgotPassword(username).catch(() => undefined);
    const recoveryPassword = await this.gmail.findLatestOneTimePassword();
    console.log('[login] One-time password email received. Retrying login with the recovery password.');

    const retryRes = await this.login(username, recoveryPassword, channel);
    if (!retryRes.ok()) {
      throw new Error(`[login-recovery] ${retryRes.status()}: ${await retryRes.text()}`);
    }

    const retryBody = (await retryRes.json().catch(() => ({} as LoginResponse & { challengeToken?: string }))) as LoginResponse & { challengeToken?: string };
    const challengeToken = readChallengeToken(retryBody);
    if (!challengeToken) {
      throw new Error('[login-recovery] Missing challenge token in response');
    }

    return {
      challengeToken,
      usedPassword: recoveryPassword,
      recoveredFromEmail: true,
    };
  }

  private async restoreConfiguredPassword(token: string, desiredPassword: string): Promise<void> {
    const currentUserRes = await this.userManagement.getCurrentUser(token);
    if (!currentUserRes.ok()) {
      throw new Error(`[user/currentUser] ${currentUserRes.status()}: ${await currentUserRes.text()}`);
    }

    const currentUser = await currentUserRes.json().catch(() => ({} as Record<string, unknown>));
    const publicId = readCurrentUserPublicId(currentUser);
    if (!publicId) {
      throw new Error('[user/currentUser] Missing publicId in response');
    }

    const resetRes = await this.userManagement.resetUserPassword(token, publicId, desiredPassword);
    if (!resetRes.ok()) {
      throw new Error(`[user/resetPassword] ${resetRes.status()}: ${await resetRes.text()}`);
    }

    console.log('[user/resetPassword] Restored the configured password after recovery login.');
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
    const loginResult = await this.loginOrRecoverPassword(username, password, channel);
    const challengeToken = String(loginResult.challengeToken ?? seedToken ?? '');

    if (!challengeToken) {
      throw new Error('[login] Missing challenge token for MFA setup');
    }

    const setupRes = await this.mfaSetup(challengeToken);
    if (!setupRes.ok()) {
      throw new Error(`[mfa/setup] ${setupRes.status()}: ${await setupRes.text()}`);
    }

    const setupBody = await setupRes.json().catch(() => ({} as MfaSetupResponse));
    const setupSecret = String((setupBody as MfaSetupResponse).secret ?? totpSecret);
    const confirmCandidates = generateTotpCandidates(setupSecret);
    let confirmRes: APIResponse | undefined;
    let confirmErrorText = '';

    for (const candidate of confirmCandidates) {
      const response = await this.mfaSetupConfirm(setupSecret, candidate, challengeToken);
      if (response.ok()) {
        confirmRes = response;
        break;
      }

      confirmErrorText = await response.text();
      if (!isInvalidAuthenticatorCode(confirmErrorText)) {
        break;
      }
    }

    if (!confirmRes) {
      throw new Error(`[mfa/setup/confirm] Failed to verify authenticator code: ${confirmErrorText || 'unknown error'}`);
    }

    const confirmAccessToken = await extractAuthToken(confirmRes);
    if (confirmAccessToken) {
      if (loginResult.recoveredFromEmail) {
        await this.restoreConfiguredPassword(confirmAccessToken, password);
      }
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

        if (loginResult.recoveredFromEmail) {
          await this.restoreConfiguredPassword(finalAccessToken, password);
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
