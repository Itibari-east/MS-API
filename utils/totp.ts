import crypto from 'crypto';

function base32ToBuffer(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.replace(/=+$/g, '').toUpperCase().replace(/\s+/g, '');

  let bits = '';
  for (const char of clean) {
    const value = alphabet.indexOf(char);
    if (value < 0) {
      throw new Error(`[TOTP] Invalid base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function counterToBuffer(counter: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

function normalizeSecret(secret: string): string {
  return secret.trim().replace(/\s+/g, '');
}

/**
 * Generates a current TOTP code from the provided base-32 secret.
 *
 * The secret should be stored as an environment variable:
 *   MS_TOTP_SECRET=<base32-secret-from-mfa-setup>
 *
 * Usage:
 *   const code = generateTotpCode(process.env.MS_TOTP_SECRET!);
 */
export function generateTotpCode(secret: string, epoch = Date.now()): string {
  const normalizedSecret = normalizeSecret(secret);
  if (!normalizedSecret) {
    throw new Error('[TOTP] Secret is required to generate a code.');
  }

  const key = base32ToBuffer(normalizedSecret);
  const counter = Math.floor(epoch / 30_000);
  const message = counterToBuffer(counter);
  const hmac = crypto.createHmac('sha1', key).update(message).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

export function generateTotpCandidates(secret: string): string[] {
  const now = Date.now();
  const step = 30_000;
  return [
    generateTotpCode(secret, now - step),
    generateTotpCode(secret, now),
    generateTotpCode(secret, now + step),
  ];
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

