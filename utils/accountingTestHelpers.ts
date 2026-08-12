import { expect, test } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _AccountingService } from '../services/accounting';
import { firstContentPublicId, json } from '../helpers/testHelpers';

export type CreatedEntity = {
  name: string;
  code: string;
  publicId: string;
  swiftCode?: string;
};

export async function expectStatuses<T extends { status(): number }>(
  responsePromise: Promise<T>,
  allowedStatuses: number[],
) {
  const response = await responsePromise;
  const status = response.status();
  if (!allowedStatuses.includes(status)) {
    const bodyText = 'text' in response ? await (response as { text(): Promise<string> }).text() : '';
    expect(
      allowedStatuses,
      `Unexpected status ${status}${bodyText ? ` with body: ${bodyText}` : ''}`,
    ).toContain(status);
  }
  return response;
}

export function bankCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `BK${suffix}`;
}

export function branchCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `BR${suffix}`;
}

export function swiftCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 8 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
}

export const accountingConstants = serviceConstants.accounting;

function contentItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function findEntityByCode(body: any, code: string, name?: string) {
  return contentItems(body).find((item) => item?.code === code || (name ? item?.name === name : false));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveBankPublicId(accounting: _AccountingService, token: string, code: string, name: string) {
  const response = await expectStatuses(accounting.listBanks(token, { search: code, page: 0, size: 50 }), [200]);
  const body = await json(response);
  const entity = findEntityByCode(body, code, name);
  expect(entity, `could not find bank with code ${code} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = entity?.publicId;
  expect(publicId, `bank response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return String(publicId);
}

async function resolveBranchPublicId(
  accounting: _AccountingService,
  token: string,
  bankPublicId: string,
  code: string,
  name: string,
) {
  const response = await expectStatuses(accounting.listBranches(token, bankPublicId, { page: 0, size: 50 }), [200]);
  const body = await json(response);
  const entity = findEntityByCode(body, code, name);
  expect(entity, `could not find branch with code ${code} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = entity?.publicId;
  expect(publicId, `branch response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return String(publicId);
}

export async function createBank(
  accounting: _AccountingService,
  token: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // Bank creation is a plain JSON request; there is no document upload in this flow.
  let lastError: unknown;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const code = bankCode();
    const swift = swiftCode();

    try {
      const response = await expectStatuses(
        accounting.createBank(token, {
          name: attempt === 1 ? name : `${name}-retry-${attempt}`,
          code,
          country: accountingConstants.bank.country,
          swiftCode: swift,
          status: accountingConstants.bank.status.active,
        }),
        [201],
      );

      const body = await json(response);
      const bodyPublicId = Array.isArray(body) ? body[0]?.publicId : body?.publicId;
      const publicId = bodyPublicId || (await resolveBankPublicId(accounting, token, code, name));

      return { name: attempt === 1 ? name : `${name}-retry-${attempt}`, code, publicId, swiftCode: swift };
    } catch (error) {
      lastError = error;
      const errorText = String(error);
      if (!errorText.includes('already exists') || attempt === 4) {
        throw error;
      }

      console.warn(`[Accounting] retrying bank creation after duplicate code collision (attempt ${attempt}/4)`);
      await sleep(200 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to create bank');
}

export async function createBranch(
  accounting: _AccountingService,
  token: string,
  bankPublicId: string,
  prefix: string,
) {
  const name = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const code = branchCode();

    try {
      const response = await expectStatuses(
        accounting.createBranch(token, bankPublicId, {
          name: attempt === 1 ? name : `${name}-retry-${attempt}`,
          code,
          city: accountingConstants.branch.city.arusha,
          bankPublicId,
        }),
        [201],
      );

      const body = await json(response);
      const bodyPublicId = Array.isArray(body) ? body[0]?.publicId : body?.publicId;
      const publicId = bodyPublicId || (await resolveBranchPublicId(accounting, token, bankPublicId, code, name));

      return { name: attempt === 1 ? name : `${name}-retry-${attempt}`, code, publicId };
    } catch (error) {
      lastError = error;
      const errorText = String(error);
      if (!errorText.includes('already exists') || attempt === 3) {
        throw error;
      }

      console.warn(`[Accounting] retrying branch creation after duplicate code collision (attempt ${attempt}/3)`);
      await sleep(200 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to create branch');
}

export async function expectBankDetails(
  accounting: _AccountingService,
  token: string,
  bank: CreatedEntity,
) {
  const response = await expectStatuses(accounting.getBank(token, bank.publicId), [200]);
  const body = await json(response);
  expect(body).toHaveProperty('publicId', bank.publicId);
  expect(body).toHaveProperty('code', bank.code);
  expect(body).toHaveProperty('name', bank.name);
  expect(body).toHaveProperty('status');
  expect(body).toHaveProperty('branchCount');
}

export async function expectBranchListed(
  accounting: _AccountingService,
  token: string,
  bankPublicId: string,
  branchPublicId: string,
) {
  const response = await expectStatuses(accounting.listBranches(token, bankPublicId, { page: 0, size: 10 }), [200]);
  const body = await json(response);
  expect(body).toHaveProperty('content');
  expect(firstContentPublicId(body)).toBeTruthy();
  const branch = (body.content as Array<Record<string, unknown>>).find((item) => item.publicId === branchPublicId);
  expect(branch, `could not find branch ${branchPublicId} in ${JSON.stringify(body)}`).toBeTruthy();
  expect(branch).toMatchObject({
    publicId: branchPublicId,
    bankPublicId,
  });
}
