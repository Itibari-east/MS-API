import { expect, type APIRequestContext } from '@playwright/test';
import _config from '../config/config';
import { serviceConstants } from '../constants/endpoints';
import { _AuthService } from './authservice';
import { readToken } from '../helpers/testHelpers';
import { joinUrl } from '../utils/url';
import { shouldAttemptPasswordRecovery } from '../utils/email';

type LoginResult = {
  challengeToken: string;
};

type MfaResult = {
  accessToken: string;
};

export class _AuthFlows {
  constructor(private readonly auth: _AuthService) {}

  private credentials() {
    return {
      email: _config.email,
      password: process.env.MS_USER_PASSWORD || _config.password,
    };
  }

  private async loginAsConfiguredUser(): Promise<LoginResult> {
    const { email, password } = this.credentials();
    const response = await this.auth.login(email, password);
    if (!response.ok()) {
      const failureText = await response.text();
      if (!shouldAttemptPasswordRecovery(failureText)) {
        expect(response.status()).toBe(200);
      }

      console.warn('[auth] Login is asking for password recovery. Running forgot-password flow and restoring the configured password.');
      await this.auth.loginWithMfaSetup(email, password, process.env.MS_TOTP_SECRET || '');

      const retryRes = await this.auth.login(email, password);
      expect(retryRes.status()).toBe(200);

      const retryBody = await retryRes.json();
      const retryChallengeToken = String(retryBody.challengeToken ?? '');
      expect(retryChallengeToken).toBeTruthy();

      return { challengeToken: retryChallengeToken };
    }

    const body = await response.json();
    const challengeToken = String(body.challengeToken ?? '');
    expect(challengeToken).toBeTruthy();

    return { challengeToken };
  }

  private async loginWithMfaChallenge(): Promise<MfaResult> {
    const { email, password } = this.credentials();
    const { accessToken } = await this.auth.loginWithMfaSetup(email, password, process.env.MS_TOTP_SECRET || '');
    expect(accessToken).toBeTruthy();

    return { accessToken };
  }

  async loginValid() {
    await this.loginAsConfiguredUser();
  }

  async loginInvalid() {
    const response = await this.auth.login('invalid@example.com', 'wrongpassword');
    expect([400, 401, 500]).toContain(response.status());
  }

  async loginMissingRequiredFields(request: APIRequestContext) {
    const response = await request.post(joinUrl(_config.baseEndpoint, 'api/v1', 'login'), {
      headers: { 'Content-Type': 'application/json', accept: '*/*' },
      data: { channel: serviceConstants.auth.channel.web },
    });
    expect([400, 401, 422, 500]).toContain(response.status());
  }

  async verifyMfaValid() {
    const { accessToken } = await this.loginWithMfaChallenge();
    expect(accessToken).toBeTruthy();
  }

  async verifyMfaInvalid() {
    const { challengeToken } = await this.loginAsConfiguredUser();
    const verifyRes = await this.auth.mfaVerify('000000', challengeToken);
    expect([400, 401]).toContain(verifyRes.status());
  }

  async fullLoginFlow() {
    const { accessToken } = await this.loginWithMfaChallenge();
    expect(accessToken).toBeDefined();
    expect(typeof accessToken).toBe('string');
  }

  async setupMfa() {
    const { challengeToken } = await this.loginAsConfiguredUser();
    const response = await this.auth.mfaSetup(challengeToken);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('secret');
    expect(typeof body.secret).toBe('string');
  }

  async authJsonHasToken() {
    const token = readToken();
    expect(token).toBeTruthy();
  }

  async forgotPasswordValid() {
    const response = await this.auth.forgotPassword(_config.email);
    expect([200, 401, 201]).toContain(response.status());
  }

  async forgotPasswordInvalid() {
    const response = await this.auth.forgotPassword('nobody@unknown.com');
    expect([400, 401, 404]).toContain(response.status());
  }
}
