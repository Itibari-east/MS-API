import test from '../helpers/baseTests';

test.describe.configure({ mode: 'serial' });

// ─── Login ────────────────────────────────────────────────────────────────────

test.describe('POST /login', () => {
  test('returns 200 with valid credentials', async ({ authFlows }) => {
    await authFlows.loginValid();
  });

  test('returns 401 with invalid credentials', async ({ authFlows }) => {
    await authFlows.loginInvalid();
  });

  test('returns 400 when required fields are missing', async ({ authFlows, request }) => {
    await authFlows.loginMissingRequiredFields(request);
  });
});

// ─── MFA Verify (authenticator flow — Step 2 of login) ───────────────────────

test.describe('POST /auth/mfa/verify', () => {
  test('returns 200 with a valid TOTP code and response contains token', async ({ authFlows }) => {
    await authFlows.verifyMfaValid();
  });

  test('returns 401 with an invalid TOTP code', async ({ authFlows }) => {
    await authFlows.verifyMfaInvalid();
  });
});

// ─── Full authenticator flow ──────────────────────────────────────────────────

test.describe('Full authenticator login flow', () => {
  test('login → mfa/verify returns a valid token', async ({ authFlows }) => {
    await authFlows.fullLoginFlow();
  });

  test('token from auth.json matches a fresh login', async ({ authFlows }) => {
    await authFlows.authJsonHasToken();
    await authFlows.fullLoginFlow();
  });
});

// ─── MFA Setup (one-time onboarding — not part of daily login) ───────────────

test.describe('POST /auth/mfa/setup', () => {
  test('returns 200 and a secret', async ({ authFlows }) => {
    await authFlows.setupMfa();
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

test.describe.skip('POST /login/forgetPassword', () => {
  test('returns 200 for a valid username', async ({ authFlows }) => {
    await authFlows.forgotPasswordValid();
  });

  test('returns 400 or 404 for an unknown username', async ({ authFlows }) => {
    await authFlows.forgotPasswordInvalid();
  });
});
