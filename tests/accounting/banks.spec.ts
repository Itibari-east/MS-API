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

test.describe('Accounting Service', () => {
  test('creates, updates, fetches and deletes a bank (JSON-only create)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'QA Bank');

    await expectBankDetails(accountingService, token, bank);

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

    const statusRes = await expectStatuses(
      accountingService.updateBankStatus(token, bank.publicId, { status: serviceConstants.accounting.bank.status.inactive }),
      [200],
    );
    expect(await json(statusRes)).toHaveProperty('status', serviceConstants.accounting.bank.status.inactive);

    const listRes = await expectStatuses(accountingService.listBanks(token, { search: bank.code, page: 0, size: 10 }), [200]);
    const listBody = await json(listRes);
    expect(listBody).toHaveProperty('content');
    expect((listBody.content as Array<Record<string, unknown>>).find((item) => item.publicId === bank.publicId)).toMatchObject({
      publicId: bank.publicId,
      name: updatedName,
      code: bank.code,
      country: serviceConstants.accounting.bank.country,
      swiftCode: updatedSwiftCode,
    });

    await expectStatuses(accountingService.deleteBank(token, bank.publicId), [204]);
  });

  test('creates, updates, fetches and deletes bank branches (JSON-only create)', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const bank = await createBank(accountingService, token, 'Branch Bank');
    const branch = await createBranch(accountingService, token, bank.publicId, 'QA Branch');

    await expectBankDetails(accountingService, token, bank);
    await expectBranchListed(accountingService, token, bank.publicId, branch.publicId);

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

  test('creates a branch under the sample bank', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const sampleBankPublicId = serviceConstants.accounting.samples.bankPublicId;
    const branch = await createBranch(accountingService, token, sampleBankPublicId, 'Sample Branch');

    await expectBranchListed(accountingService, token, sampleBankPublicId, branch.publicId);
    await expectStatuses(accountingService.deleteBranch(token, sampleBankPublicId, branch.publicId), [204]);
  });

  test('lists banks with pagination', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const response = await expectStatuses(accountingService.listBanks(token, { page: 0, size: 5 }), [200]);
    const body = await json(response);
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
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
