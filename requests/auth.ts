import _config from '../config/config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Channel =
  | 'WEB'
  | 'MOBILE_CUSTOMER'
  | 'SALES_AGENT'
  | 'DELIVERY_AGENT'
  | 'WAREHOUSE_STAFF_MOBILE'
  | 'BNPL_WEB'
  | 'CRM_WEB'
  | 'POS';

export interface LoginBody {
  username: string;
  password: string;
  channel: Channel;
}

export interface MfaSetupConfirmBody {
  secret: string;
  totpCode: string;
}

export interface MfaVerifyBody {
  totpCode: string;
}

// ─── Request builders ─────────────────────────────────────────────────────────

export const _AuthRequests = {
  /**
   * POST /login
   * Step 1 of the authenticator flow — credential check.
   */
  login: (
    username: string,
    password: string,
    channel: Channel = 'WEB',
  ): { url: string; body: LoginBody } => ({
    url: `${_config.baseEndpoint}/api/v1/login`,
    body: { username, password, channel },
  }),

  /**
   * POST /auth/mfa/setup
   * Initiates MFA setup — returns a TOTP secret + QR code URL.
   * No request body required.
   */
  mfaSetup: (): { url: string } => ({
    url: `${_config.baseEndpoint}/api/v1/auth/mfa/setup`,
  }),

  /**
   * POST /auth/mfa/setup/confirm
   * Confirms MFA setup by verifying the first TOTP code against the secret.
   */
  mfaSetupConfirm: (
    secret: string,
    totpCode: string,
  ): { url: string; body: MfaSetupConfirmBody } => ({
    url: `${_config.baseEndpoint}/api/v1/auth/mfa/setup/confirm`,
    body: { secret, totpCode },
  }),

  /**
   * POST /auth/mfa/verify
   * Step 2 of the authenticator flow — submits the TOTP code to get the final token.
   */
  mfaVerify: (totpCode: string): { url: string; body: MfaVerifyBody } => ({
    url: `${_config.baseEndpoint}/api/v1/auth/mfa/verify`,
    body: { totpCode },
  }),

  /**
   * DELETE /auth/mfa/disable
   * Disables MFA for the current user.
   */
  mfaDisable: (): { url: string } => ({
    url: `${_config.baseEndpoint}/api/v1/auth/mfa/disable`,
  }),

  /**
   * POST /login/forgetPassword?username=...
   * Triggers a password-reset email for the given username.
   */
  forgotPassword: (username: string): { url: string } => ({
    url: `${_config.baseEndpoint}/api/v1/login/forgetPassword?username=${encodeURIComponent(username)}`,
  }),
};
