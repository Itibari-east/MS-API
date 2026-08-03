import test from '../../helpers/baseTests';

test.describe('Rejection Codes', () => {
  test('creates rejection codes', async ({ userManagementFlows }) => {
    await userManagementFlows.rejectionCodeCreate();
  });

  test('updates rejection codes', async ({ userManagementFlows }) => {
    await userManagementFlows.rejectionCodeUpdate();
  });

  test.skip('deletes rejection codes', async ({ userManagementFlows }) => {
    await userManagementFlows.rejectionCodeDelete();
  });
});
