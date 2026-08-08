import fs from 'fs';
import path from 'path';

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  email: string;
}

type GmailCredentialsFile = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  refresh_token?: string;
  access_token?: string;
  email?: string;
};

function readJsonIfExists(filePath: string): GmailCredentialsFile | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as GmailCredentialsFile;
  } catch {
    return null;
  }
}

export function loadGmailCredentials(): GmailCredentials | null {
  const localFile = readJsonIfExists(path.join(process.cwd(), 'auth', 'email.json'));
  const installed = localFile?.installed ?? {};

  const clientId = process.env.GMAIL_CLIENT_ID?.trim() || installed.client_id?.trim() || '';
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim() || installed.client_secret?.trim() || '';
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim() || localFile?.refresh_token?.trim() || '';
  const accessToken = process.env.GMAIL_ACCESS_TOKEN?.trim() || localFile?.access_token?.trim() || '';
  const email = process.env.GMAIL_TEST_EMAIL?.trim() || localFile?.email?.trim() || '';

  if (!clientId || !clientSecret || !email) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    accessToken: accessToken || undefined,
    email,
  };
}

export function hasGmailRecoveryConfig(): boolean {
  const creds = loadGmailCredentials();
  return Boolean(creds?.clientId && creds.clientSecret && creds.email && (creds.accessToken || creds.refreshToken));
}

export function extractOneTimePassword(text: string): string | null {
  const patterns = [
    /one-time password is\s+([A-Za-z0-9-]+)/i,
    /password is\s+([A-Za-z0-9-]+)\.\s*please log in and reset your password/i,
    /otp[:\s]+([A-Za-z0-9-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export function shouldAttemptPasswordRecovery(text: string): boolean {
  return /one-time password|reset your password|password has been reset|please log in and reset your password/i.test(text);
}

