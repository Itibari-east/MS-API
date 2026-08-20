import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, json } from '../../helpers/testHelpers';
import { _AccountingService } from '../../services/accounting';
import { expectStatuses } from '../../utils/accountingTestHelpers';

type TaxCodeItem = {
  publicId?: string;
  codeName?: string;
  codeValue?: number;
  applicableTo?: Array<'PRODUCT' | 'SUPPLIER'>;
  rateMutable?: boolean;
  [key: string]: unknown;
};

test.describe.configure({ mode: 'serial' });

function listItems(body: unknown): TaxCodeItem[] {
  if (Array.isArray(body)) {
    return body as TaxCodeItem[];
  }

  return Array.isArray((body as { content?: unknown } | null | undefined)?.content)
    ? ((body as { content: TaxCodeItem[] }).content ?? [])
    : [];
}

function itemNames(items: TaxCodeItem[]) {
  return items.map((item) => String(item.codeName ?? ''));
}

async function getTaxCodeByName(
  accountingService: _AccountingService,
  token: string,
  codeName: string,
  applicableTo?: 'PRODUCT' | 'SUPPLIER',
) {
  const response = await expectStatuses(
    accountingService.listTaxCodes(token, {
      search: codeName,
      applicableTo,
      page: 0,
      size: 50,
      sort: 'codeName,ASC',
    }),
    [200],
  );
  const items = listItems(await json(response));
  const tax = items.find((item) => String(item.codeName ?? '').toUpperCase() === codeName.toUpperCase());
  expect(tax, `could not find tax code ${codeName} in ${JSON.stringify(items)}`).toBeTruthy();
  return tax as TaxCodeItem;
}

test.describe('@accounting Accounting Service - Taxes', () => {
  test('lists tax code kinds', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const response = await expectStatuses(accountingService.listTaxCodeKinds(token), [200]);
    const kinds = listItems(await json(response));

    expect(kinds.length, 'expected tax code kinds in the response').toBeGreaterThan(0);
    expect(kinds.some((kind) => String(kind.codeName ?? '').toUpperCase() === 'VAT')).toBeTruthy();
  });

  test('lists tax codes with pagination, sort, and records the search/applicable-to gap', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const searchName = 'SPECIAL_RATE';
    const response = await expectStatuses(
      accountingService.listTaxCodes(token, {
        search: searchName,
        applicableTo: 'PRODUCT',
        page: 0,
        size: 2,
        sort: 'codeName,ASC',
      }),
      [200],
    );
    const body = await json(response);
    const items = listItems(body);

    expect(items.length, `expected filtered tax codes in ${JSON.stringify(body)}`).toBeGreaterThan(0);
    expect(body).toHaveProperty('pageSize', 2);
    expect(itemNames(items)).toEqual([...itemNames(items)].sort((a, b) => a.localeCompare(b)));
    expect(items.some((item) => String(item.codeName ?? '').toUpperCase() === searchName)).toBeTruthy();

    const gapItems = items.filter(
      (item) =>
        !String(item.codeName ?? '').toUpperCase().includes(searchName) ||
        !Array.isArray(item.applicableTo) ||
        !item.applicableTo.includes('PRODUCT'),
    );
    if (gapItems.length > 0) {
      console.warn(
        `[Accounting][Taxes] search/applicableTo filter gap: the endpoint returned items outside the requested filter set: ${JSON.stringify(
          gapItems,
        )}`,
      );
    }
  });

  test('updates a mutable tax code and restores the original value', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const tax = await getTaxCodeByName(accountingService, token, 'SPECIAL_RATE', 'PRODUCT');
    expect(tax.publicId, 'SPECIAL_RATE tax code should have a publicId').toBeTruthy();
    expect(tax.rateMutable).toBeTruthy();

    const originalCodeValue = Number(tax.codeValue ?? 23);
    const nextCodeValue = originalCodeValue === 23 ? 24 : 23;

    const updateResponse = await expectStatuses(
      accountingService.updateTaxCode(token, String(tax.publicId), {
        codeName: String(tax.codeName ?? 'SPECIAL_RATE'),
        codeValue: nextCodeValue,
        applicableTo: Array.isArray(tax.applicableTo) && tax.applicableTo.length > 0 ? tax.applicableTo : ['PRODUCT'],
      }),
      [200],
    );
    const updated = await json(updateResponse);
    expect(updated).toHaveProperty('publicId', tax.publicId);
    expect(updated).toHaveProperty('codeName', tax.codeName);
    expect(updated).toHaveProperty('codeValue', nextCodeValue);

    await expectStatuses(
      accountingService.updateTaxCode(token, String(tax.publicId), {
        codeName: String(tax.codeName ?? 'SPECIAL_RATE'),
        codeValue: originalCodeValue,
        applicableTo: Array.isArray(tax.applicableTo) && tax.applicableTo.length > 0 ? tax.applicableTo : ['PRODUCT'],
      }),
      [200],
    );
  });

  test('rejects duplicate tax code creation for an existing kind', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const existing = await getTaxCodeByName(accountingService, token, 'VAT');

    const duplicate = await accountingService.createTaxCode(token, {
      codeName: String(existing.codeName ?? 'VAT'),
      codeValue: Number(existing.codeValue ?? 18),
      applicableTo: Array.isArray(existing.applicableTo) && existing.applicableTo.length > 0 ? existing.applicableTo : ['PRODUCT'],
    });

    expect([400, 409]).toContain(duplicate.status());
  });

  test('rejects malformed tax code payloads', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const response = await accountingService.createTaxCode(token, {
      codeName: '',
      codeValue: 0,
      applicableTo: [],
    } as never);

    expect([400, 422]).toContain(response.status());
  });

  test('rejects tax code requests without authentication and invalid ids', async ({ accountingService }) => {
    const missingAuth = await accountingService.listTaxCodes('', { page: 0, size: 1 });
    expect([401, 403]).toContain(missingAuth.status());

    const token = getTokenOrSkip();
    const invalidId = await accountingService.getTaxCode(token, '00000000-0000-0000-0000-000000000000');
    expect([404, 400]).toContain(invalidId.status());
  });
});
