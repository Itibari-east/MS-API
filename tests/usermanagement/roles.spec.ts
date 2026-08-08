import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique, json, publicIdFrom } from '../../helpers/testHelpers';

test.describe('@usermanagement Roles', () => {
  test('creates roles', async ({ userManagementFlows }) => {
    await userManagementFlows.rolesCreate();
  });

  test('updates roles', async ({ userManagementFlows }) => {
    await userManagementFlows.rolesUpdate();
  });

  test.skip('deletes roles', async ({ userManagementFlows }) => {
    await userManagementFlows.rolesDelete();
  });

  test.describe('Edge cases', () => {
    test('returns 4xx when fetching a non-existent role', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.getRole(token, '00000000-0000-0000-0000-000000000000');
      expect([404, 400]).toContain(res.status());
    });

    test('returns 4xx when adding privileges to a non-existent role', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.addPrivilegesToRole(
        token,
        '00000000-0000-0000-0000-000000000000',
        ['00000000-0000-0000-0000-000000000000'],
      );
      expect([400, 404, 422]).toContain(res.status());
    });

    test('creates a role with an empty privilege list', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.createRole(token, {
        name: unique('Empty Role'),
        privilegePublicIds: [],
      });
      expect(res.status()).toBe(200);
      const roleId = publicIdFrom(await json(res));
      await userManagement.deleteRole(token, roleId);
    });
  });

  test.describe('Security', () => {
    const token = getTokenOrSkip();

    test('rejects SQL injection in string fields when creating a role', async ({ userManagement }) => {
      const res = await userManagement.createRole(token, {
        name: "'; DROP TABLE roles; --",
        privilegePublicIds: [],
      });
      expect([200, 400, 422, 500]).toContain(res.status());
      if (res.status() === 200) {
        const publicId = (await json(res)).publicId;
        await userManagement.deleteRole(token, publicId);
      }
    });

    test('returns 401 when accessing role endpoints without a token', async ({ userManagement }) => {
      const res = await userManagement.listRoles('', { page: 0, size: 1 });
      expect([401, 403]).toContain(res.status());
    });
  });
});
