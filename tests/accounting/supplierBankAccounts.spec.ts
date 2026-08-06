import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import { expectStatuses, requireSupplierPublicId } from '../../utils/accountingTestHelpers';

test.describe('Accounting Service - Supplier Bank Accounts', () => {
  test('replaces supplier bank accounts', async ({ accountingService }) => {
    const token = getTokenOrSkip();
    const supplierPublicId = requireSupplierPublicId();

    const response = await expectStatuses(
      accountingService.replaceSupplierBankAccounts(token, supplierPublicId, {
        accounts: [
          {
            bankCode: 'CRDB',
            branchCode: 'CRDB_ARU',
            accountName: 'Acme Supplies Ltd',
            accountNumber: '0150123456789',
            swiftCode: 'CORUTZTZ',
          },
        ],
      }),
      [200],
    );

    const text = await response.text();
    expect(text).toBeTruthy();

    try {
      const body = JSON.parse(text);
      if (Array.isArray(body)) {
        expect(body[0]).toMatchObject({
          bankCode: 'CRDB',
          branchCode: 'CRDB_ARU',
        });
      }
    } catch {
      expect(text).toContain('CRDB');
    }
  });
});
