import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';

const authFilePath = path.join(__dirname, '../auth/auth.json');

export function readToken(): string {
  const authData = JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));
  return authData.default?.token || '';
}

export function getTokenOrSkip(): string {
  const token = readToken();
  test.skip(!token, 'auth/auth.json must contain a bearer token');
  return token;
}

export function unique(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function json(response: { json(): Promise<any> }): Promise<any> {
  return response.json();
}

export function publicIdFrom(body: any): string {
  const value = Array.isArray(body) ? body[0] : body;
  const publicId = value?.publicId;
  expect(publicId, `response body should include publicId: ${JSON.stringify(body)}`).toBeTruthy();
  return publicId;
}

export function firstContentPublicId(body: any): string {
  const publicId = body?.content?.[0]?.publicId;
  expect(publicId, `response body should include a content[0].publicId: ${JSON.stringify(body)}`).toBeTruthy();
  return publicId;
}
