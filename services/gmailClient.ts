import { extractOneTimePassword, loadGmailCredentials } from '../utils/email';

type GmailMessageRef = {
  id: string;
  threadId?: string;
};

type GmailListResponse = {
  messages?: GmailMessageRef[];
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
  headers?: GmailHeader[];
};

type GmailMessage = {
  id?: string;
  snippet?: string;
  payload?: GmailMessagePart;
};

function decodeBase64Url(value?: string): string {
  if (!value) {
    return '';
  }

  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function collectTextFromPart(part?: GmailMessagePart, bucket: string[] = []): string[] {
  if (!part) {
    return bucket;
  }

  const bodyText = decodeBase64Url(part.body?.data);
  if (bodyText) {
    bucket.push(bodyText);
  }

  for (const nested of part.parts || []) {
    collectTextFromPart(nested, bucket);
  }

  return bucket;
}

export class GmailClient {
  private readonly creds = loadGmailCredentials();

  private requireCredentials() {
    if (!this.creds) {
      throw new Error(
        '[gmail] Gmail recovery is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_TEST_EMAIL, and either GMAIL_REFRESH_TOKEN or GMAIL_ACCESS_TOKEN.',
      );
    }

    return this.creds;
  }

  private async getAccessToken(): Promise<string> {
    const creds = this.requireCredentials();

    if (creds.accessToken) {
      return creds.accessToken;
    }

    if (!creds.refreshToken) {
      throw new Error('[gmail] Missing GMAIL_REFRESH_TOKEN or GMAIL_ACCESS_TOKEN.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`[gmail] Failed to refresh access token: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as { access_token?: string };
    const accessToken = String(body.access_token ?? '').trim();
    if (!accessToken) {
      throw new Error('[gmail] Gmail token refresh did not return an access token.');
    }

    return accessToken;
  }

  private async gmailGet<T>(endpoint: string): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`[gmail] ${endpoint} request failed with ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private messageText(message: GmailMessage): string {
    const parts = collectTextFromPart(message.payload);
    if (parts.length) {
      return parts.join('\n');
    }

    return message.snippet ?? '';
  }

  async findLatestOneTimePassword(query?: string, timeoutMs = 120_000, pollMs = 5_000): Promise<string> {
    const creds = this.requireCredentials();
    const gmailQuery =
      query ||
      `to:${creds.email} from:system@itibari.io newer_than:1d ("one-time password" OR "reset your password")`;
    const deadline = Date.now() + timeoutMs;
    let lastSeenMessage = '';

    while (Date.now() < deadline) {
      const list = await this.gmailGet<GmailListResponse>(`messages?q=${encodeURIComponent(gmailQuery)}&maxResults=10`);
      for (const messageRef of list.messages || []) {
        const message = await this.gmailGet<GmailMessage>(`messages/${messageRef.id}?format=full`);
        const text = this.messageText(message);
        lastSeenMessage = text || lastSeenMessage;
        const password = extractOneTimePassword(text);
        if (password) {
          return password;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }

    throw new Error(
      `[gmail] Timed out waiting for a one-time password email${lastSeenMessage ? `.\nLast message:\n${lastSeenMessage}` : ''}`,
    );
  }
}
