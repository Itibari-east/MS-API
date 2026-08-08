import test from '../../helpers/baseTests';

test.describe('@usermanagement Permission Management', () => {
  test('creates permission groups and permissions', async ({ userManagementFlows }) => {
    await userManagementFlows.permissionGroupsCreate();
  });

  test('updates permission groups and permissions', async ({ userManagementFlows }) => {
    await userManagementFlows.permissionGroupsUpdate();
  });

  test('deletes permission groups and permissions', async ({ userManagementFlows }) => {
    await userManagementFlows.permissionGroupsDelete();
  });

  test('rejects reusing privilege names in different permission groups', async ({ userManagementFlows }) => {
    await userManagementFlows.permissionGroupsRejectReusePrivilegeNames();
  });
});
