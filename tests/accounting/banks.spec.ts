import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, json, unique } from '../../helpers/testHelpers';
import {
  createBank,
  createBranch,
  expectBankDetails,
  expectBranchListed,
  expectStatuses,
  swiftCode,
} from '../../utils/accountingTestHelpers';

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function names(items: Array<Record<string, unknown>>) {
  return items.map((item) => String(item?.name ?? ''));
}

test.describe('@accounting Accounting Service', () => {
  test('List banks (admin catalog + supplier bank dropdown)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const response = await expectStatuses(
      accountingService.listBanks(token, {
        search: '',
        country: serviceConstants.accounting.bank.country,
        status: serviceConstants.accounting.bank.status.active,
        page: 0,
        size: 20,
        sort: 'name,ASC',
      }),
      [200],
    );
    const body = await json(response);
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
  });

  test('filters banks by search, country, status, page, size, and sort', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const searchPrefix = `QA Filter Bank ${Date.now()}`;
    const activeAlpha = await createBank(accountingService, token, `${searchPrefix} Alpha`);
    const activeBeta = await createBank(accountingService, token, `${searchPrefix} Beta`);
    const inactiveGamma = await createBank(accountingService, token, `${searchPrefix} Gamma`);

    await expectStatuses(
      accountingService.updateBankStatus(token, inactiveGamma.publicId, {
        status: serviceConstants.accounting.bank.status.inactive,
      }),
      [200],
    );

    const response = await expectStatuses(
      accountingService.listBanks(token, {
        search: searchPrefix,
        country: serviceConstants.accounting.bank.country,
        status: serviceConstants.accounting.bank.status.active,
        page: 0,
        size: 10,
        sort: 'name,ASC',
      }),
      [200],
    );
    const body = await json(response);
    const items = listItems(body);

    expect(items.length, `expected filtered banks for ${searchPrefix} in ${JSON.stringify(body)}`).toBeGreaterThan(0);
    expect(items.every((item) => item?.country === serviceConstants.accounting.bank.country)).toBeTruthy();
    expect(items.every((item) => item?.status === serviceConstants.accounting.bank.status.active)).toBeTruthy();
    expect(items.every((item) => String(item?.name ?? '').includes(searchPrefix))).toBeTruthy();
    expect(items.some((item) => item?.publicId === activeAlpha.publicId)).toBeTruthy();
    expect(items.some((item) => item?.publicId === activeBeta.publicId)).toBeTruthy();
    expect(items.some((item) => item?.publicId === inactiveGamma.publicId)).toBeFalsy();
    expect(names(items)).toEqual([...names(items)].sort((a, b) => a.localeCompare(b)));

    await expectStatuses(accountingService.deleteBank(token, activeAlpha.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, activeBeta.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, inactiveGamma.publicId), [204]);
  });

  test('Create bank (admin)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Bank');

    await expectBankDetails(accountingService, token, bank);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Get bank by public id', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Bank Detail');

    await expectBankDetails(accountingService, token, bank);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Update bank name, country, and SWIFT code (code immutable)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Bank Update');

    const updatedName = unique('QA Bank Updated');
    const updatedSwiftCode = swiftCode();
    const updateRes = await expectStatuses(
      accountingService.updateBank(token, bank.publicId, {
        name: updatedName,
        country: serviceConstants.accounting.bank.country,
        swiftCode: updatedSwiftCode,
        status: serviceConstants.accounting.bank.status.active,
      }),
      [200],
    );
    const updatedBody = await json(updateRes);
    expect(updatedBody).toHaveProperty('publicId', bank.publicId);
    expect(updatedBody).toHaveProperty('name', updatedName);
    expect(updatedBody).toHaveProperty('country', serviceConstants.accounting.bank.country);
    expect(updatedBody).toHaveProperty('swiftCode', updatedSwiftCode);
    expect(updatedBody).toHaveProperty('branchCount');
    expect(updatedBody).toHaveProperty('status', serviceConstants.accounting.bank.status.active);

    await expectBankDetails(accountingService, token, { ...bank, name: updatedName });
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Update bank catalog status (Active toggle / Deactivate confirm). Distinct from soft-delete.', async ({
    accountingService,
  }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Bank Status');

    const statusRes = await expectStatuses(
      accountingService.updateBankStatus(token, bank.publicId, { status: serviceConstants.accounting.bank.status.inactive }),
      [200],
    );
    expect(await json(statusRes)).toHaveProperty('status', serviceConstants.accounting.bank.status.inactive);

    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Soft-delete bank and its branches (distinct from status INACTIVE)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'Soft Delete Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'Soft Delete Branch');

    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branch.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('List branches for a bank', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Branch List Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'QA Branch List');

    await expectBranchListed(accountingService, token, bank.publicId, branch.publicId);
    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branch.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('filters branches by search, city, page, size, and sort', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Branch Filter Bank');
    const branchAlpha = await createBranch(accountingService, token, bank.publicId, 'QA Branch Filter Alpha');
    const branchBeta = await createBranch(accountingService, token, bank.publicId, 'QA Branch Filter Beta');
    const branchGamma = await createBranch(accountingService, token, bank.publicId, 'QA Branch Filter Gamma');

    await expectStatuses(
      accountingService.updateBranch(token, bank.publicId, branchGamma.publicId, {
        name: branchGamma.name,
        city: serviceConstants.accounting.branch.city.darEsSalaam,
      }),
      [200],
    );

    const response = await expectStatuses(
      accountingService.listBranches(token, bank.publicId, {
        search: 'QA Branch Filter',
        city: serviceConstants.accounting.branch.city.arusha,
        page: 0,
        size: 20,
        sort: 'name,ASC',
      }),
      [200],
    );
    const body = await json(response);
    const items = listItems(body);

    expect(items.length, `expected filtered branches for ${bank.publicId} in ${JSON.stringify(body)}`).toBeGreaterThan(0);
    expect(items.every((item) => item?.bankPublicId === bank.publicId)).toBeTruthy();
    expect(items.every((item) => item?.city === serviceConstants.accounting.branch.city.arusha)).toBeTruthy();
    expect(items.every((item) => String(item?.name ?? '').includes('QA Branch Filter'))).toBeTruthy();
    expect(items.some((item) => item?.publicId === branchAlpha.publicId)).toBeTruthy();
    expect(items.some((item) => item?.publicId === branchBeta.publicId)).toBeTruthy();
    expect(items.some((item) => item?.publicId === branchGamma.publicId)).toBeFalsy();
    expect(names(items)).toEqual([...names(items)].sort((a, b) => a.localeCompare(b)));

    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branchAlpha.publicId), [204]);
    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branchBeta.publicId), [204]);
    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branchGamma.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Create branch under a bank', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Branch Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'QA Branch');

    await expectBranchListed(accountingService, token, bank.publicId, branch.publicId);
    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branch.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Update branch name and city', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Branch Update Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'QA Branch Update');

    const updateRes = await expectStatuses(
      accountingService.updateBranch(token, bank.publicId, branch.publicId, {
        name: unique('QA Branch Updated'),
        city: serviceConstants.accounting.branch.city.darEsSalaam,
      }),
      [200],
    );
    const updatedBody = await json(updateRes);
    expect(updatedBody).toHaveProperty('publicId', branch.publicId);
    expect(updatedBody).toHaveProperty('bankPublicId', bank.publicId);

    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branch.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('Soft-delete branch', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Branch Delete Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'QA Branch Delete');

    await expectStatuses(accountingService.deleteBranch(token, bank.publicId, branch.publicId), [204]);
    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('returns 4xx when creating a bank with missing fields', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const missing = await accountingService.createBank(token, {
      name: '',
      code: '',
      country: '',
      swiftCode: '',
      status: '',
    });
    expect([400, 422]).toContain(missing.status());
  });

  test('returns 401 without an auth token', async ({ accountingService }) => {
    const res = await accountingService.listBanks('', { page: 0, size: 1 });
    expect([401, 403]).toContain(res.status());
  });
});
