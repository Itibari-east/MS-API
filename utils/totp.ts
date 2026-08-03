import { createGuardrails, generateSync } from 'otplib';

/**
 * Generates a current TOTP code from the provided base-32 secret.
 *
 * The secret should be stored as an environment variable:
 *   MS_TOTP_SECRET=<base32-secret-from-mfa-setup>
 *
 * Usage:
 *   const code = generateTotpCode(process.env.MS_TOTP_SECRET!);
 */
export function generateTotpCode(secret: string): string {
  return generateSync({
    secret,
    guardrails: createGuardrails({ MIN_SECRET_BYTES: 10 }),
  });
}

/**
 * Validates that a TOTP secret is present, throwing early with a clear
 * message rather than a cryptic otplib error.
 */
export function requireTotpSecret(): string {
  const secret = process.env.MS_TOTP_SECRET;
  if (!secret) {
    throw new Error(
      '[TOTP] MS_TOTP_SECRET env var is not set. ' +
        'Run the MFA setup flow once to obtain the secret, then add it to your .env file.',
    );
  }
  return secret;
}
