import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import { expectStatuses } from '../../utils/accountingTestHelpers';
import { createCompleteSupplier } from '../../helpers/supplierFactory';

test.describe('@accounting Accounting Service - Supplier Bank Accounts', () => {
  test('replaces supplier bank accounts with valid supplier, bank, and branch data', async ({
    accountingService,
    supplierApi,
  }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Bank Accounts');
    expect(supplier.bank).toBeTruthy();
    expect(supplier.branch).toBeTruthy();

    const response = await expectStatuses(
      accountingService.replaceSupplierBankAccounts(token, supplier.publicId, {
        accounts: [
          {
            bankCode: supplier.bank!.code,
            branchCode: supplier.branch!.code,
            accountName: supplier.name,
            accountNumber: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
            swiftCode: supplier.bank!.swiftCode ?? 'CORUTZTZ',
          },
        ],
      }),
      [200],
    );

    const body = await response.json();
    expect(body).toBeTruthy();
    expect(body.publicId ?? body.supplierPublicId).toBe(supplier.publicId);
    expect(body.supplierCode ?? body.code).toBeTruthy();
    expect(body.name).toBe(supplier.name);
  });
});
