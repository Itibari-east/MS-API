import { expect, test } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _AccountingService } from '../services/accounting';
import { _UserManagementService } from '../services/userManagement';
import { firstContentPublicId, json } from '../helpers/testHelpers';
import { TaxCodeRequest, TaxCodeResponse } from '../types/accounting';

export type CreatedEntity = {
  name: string;
  code: string;
  publicId: string;
  swiftCode?: string;
};

export type CreatedTaxCode = {
  publicId: string;
  codeName: string;
  codeValue: number;
  applicableTo: Array<'PRODUCT' | 'SUPPLIER'>;
  tax?: TaxCodeResponse;
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
const countryPublicIdCache = new Map<string, string>();
const cityPublicIdCache = new Map<string, string>();

function contentItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function findEntityByCode(body: any, code: string, name?: string) {
  return contentItems(body).find((item) => item?.code === code || (name ? item?.name === name : false));
}

function findTaxCodeByName(body: any, codeName: string) {
  return contentItems(body).find((item) => item?.codeName === codeName);
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

async function resolveTaxCodePublicId(accounting: _AccountingService, token: string, codeName: string) {
  const response = await expectStatuses(accounting.listTaxCodes(token, { search: codeName, page: 0, size: 50 }), [200]);
  const body = await json(response);
  const entity = findTaxCodeByName(body, codeName);
  expect(entity, `could not find tax code with name ${codeName} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = entity?.publicId;
  expect(publicId, `tax code response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return String(publicId);
}

async function resolveCountryPublicId(token: string, countryName: string) {
  const cached = countryPublicIdCache.get(countryName);
  if (cached) {
    return cached;
  }

  const userManagement = new _UserManagementService();
  const response = await expectStatuses(
    userManagement.listCountries(token, { search: countryName, page: 0, size: 50 }),
    [200],
  );
  const body = await json(response);
  const items = contentItems(body);
  const entity = items.find(
    (item) => String(item?.name ?? '') === countryName || String(item?.countryCode ?? item?.code ?? '') === 'TZ',
  );
  expect(entity, `could not find country ${countryName} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? entity?.countryPublicId ?? '');
  expect(publicId, `country response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  countryPublicIdCache.set(countryName, publicId);
  return publicId;
}

async function resolveCityPublicId(token: string, countryPublicId: string, cityName: string) {
  const cacheKey = `${countryPublicId}:${cityName}`;
  const cached = cityPublicIdCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const userManagement = new _UserManagementService();
  const response = await expectStatuses(
    userManagement.listCities(token, { search: cityName, countryPublicId, page: 0, size: 50 }),
    [200],
  );
  const body = await json(response);
  const items = contentItems(body);
  const entity = items.find(
    (item) => String(item?.name ?? '') === cityName || String(item?.cityCode ?? item?.code ?? '') === cityName,
  );
  expect(entity, `could not find city ${cityName} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? entity?.cityPublicId ?? '');
  expect(publicId, `city response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  cityPublicIdCache.set(cacheKey, publicId);
  return publicId;
}

export async function createBank(
  accounting: _AccountingService,
  token: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  // Bank creation is a plain JSON request; there is no document upload in this flow.
  let lastError: unknown;
  const countryPublicId = await resolveCountryPublicId(token, accountingConstants.bank.country);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const code = bankCode();
    const swift = swiftCode();

    try {
      const response = await expectStatuses(
        accounting.createBank(token, {
          name: attempt === 1 ? name : `${name}-retry-${attempt}`,
          code,
          countryPublicId,
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
  const countryPublicId = await resolveCountryPublicId(token, accountingConstants.bank.country);
  const cityPublicId = await resolveCityPublicId(token, countryPublicId, accountingConstants.branch.city.arusha);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const code = branchCode();

    try {
      const response = await expectStatuses(
        accounting.createBranch(token, bankPublicId, {
          name: attempt === 1 ? name : `${name}-retry-${attempt}`,
          code,
          cityPublicId,
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

export async function buildTaxCodeRequest(
  codeName: string,
  codeValue = 18,
  applicableTo: Array<'PRODUCT' | 'SUPPLIER'> = ['PRODUCT'],
): Promise<TaxCodeRequest> {
  return {
    codeName,
    codeValue,
    applicableTo,
  };
}

export async function createTaxCode(
  accounting: _AccountingService,
  token: string,
  codeNamePrefix = 'VAT',
  codeValue = 18,
  applicableTo: Array<'PRODUCT' | 'SUPPLIER'> = ['PRODUCT'],
): Promise<CreatedTaxCode> {
  const existingResponse = await accounting.listTaxCodes(token, {
    applicableTo: applicableTo[0],
    page: 0,
    size: 50,
    sort: 'codeName,ASC',
  });
  const existingBody = await json(existingResponse);
  const existingItems = Array.isArray(existingBody)
    ? existingBody
    : Array.isArray(existingBody?.content)
      ? existingBody.content
      : [];
  const existing = existingItems.find(
    (item) =>
      String(item?.codeName ?? '').toUpperCase() === codeNamePrefix.toUpperCase() &&
      (Array.isArray(item?.applicableTo) ? item.applicableTo.includes(applicableTo[0]) : true),
  );

  if (existing) {
    const publicId = String(existing?.publicId ?? '');
    expect(publicId, `Existing tax code should include publicId: ${JSON.stringify(existing)}`).toBeTruthy();
    return {
      publicId,
      codeName: String(existing?.codeName ?? codeNamePrefix),
      codeValue: Number(existing?.codeValue ?? codeValue),
      applicableTo,
      tax: existing,
    };
  }

  const codeName = codeNamePrefix;
  const response = await expectStatuses(
    accounting.createTaxCode(token, await buildTaxCodeRequest(codeName, codeValue, applicableTo)),
    [201],
  );

  const body = await json(response);
  const publicId = String(body?.publicId ?? '') || (await resolveTaxCodePublicId(accounting, token, codeName));

  return {
    publicId,
    codeName,
    codeValue,
    applicableTo,
    tax: body,
  };
}

export async function cleanupTaxCode(accounting: _AccountingService, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await accounting.deleteTaxCode(token, publicId).catch((error) => {
    console.warn(`[Accounting] cleanup skipped for tax ${publicId}: ${String(error)}`);
  });
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
