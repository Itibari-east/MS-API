import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique, json, publicIdFrom, firstContentPublicId } from '../../helpers/testHelpers';

test.describe('User Management', () => {
  test('creates users', async ({ userManagementFlows }) => {
    await userManagementFlows.usersCreate();
  });

  test('updates users', async ({ userManagementFlows }) => {
    await userManagementFlows.usersUpdate();
  });

  test.skip('deletes users', async ({ userManagementFlows }) => {
    await userManagementFlows.usersDelete();
  });

  test('lists users with pagination', async ({ userManagementFlows }) => {
    await userManagementFlows.listUsers();
  });

  test.skip('resets user password', async ({ userManagementFlows }) => {
    await userManagementFlows.resetUserPassword();
  });

  test('locks a user', async ({ userManagementFlows }) => {
    await userManagementFlows.lockUser();
  });

  test('fetches current user and activity logs', async ({ userManagementFlows }) => {
    await userManagementFlows.currentUserActivity();
  });

  test.describe('Edge cases', () => {
    test('returns 4xx when creating a user with a duplicate email', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const email = `${unique('edge.dup')}@itibari.test`;
      const regionPublicId = firstContentPublicId(await json(await userManagement.listRegions(token, { page: 0, size: 1 })));
      test.skip(!regionPublicId, 'requires at least one region');

      const countryRes = await userManagement.createCountry(token, { name: unique('EC'), code: `EC${Date.now()}${Math.random()}`.slice(-6).toUpperCase(), currency: 'TZS' });
      expect(countryRes.status()).toBe(200);
      const countryPublicId = publicIdFrom(await json(countryRes));
      const roleRes = await userManagement.createRole(token, { name: unique('ER'), privilegePublicIds: [] });
      expect(roleRes.status()).toBe(200);
      const rolePublicId = publicIdFrom(await json(roleRes));

      const cityRes = await userManagement.createCity(token, { name: unique('ECity'), code: `CT${Date.now()}${Math.random()}`.slice(-6).toUpperCase(), countryPublicId });
      expect(cityRes.status()).toBe(200);
      const cityPublicId = publicIdFrom(await json(cityRes));

      const branchRes = await userManagement.createBranch(token, { name: unique('EBranch'), description: '', cityPublicIds: [cityPublicId], regionId: regionPublicId });
      expect(branchRes.status()).toBe(200);
      const branchPublicId = publicIdFrom(await json(branchRes));

      const depRes = await userManagement.createDepartment(token, { departmentName: unique('EDep') });
      expect(depRes.status()).toBe(200);
      const depPublicId = publicIdFrom(await json(depRes));

      const userRes1 = await userManagement.createUser(token, {
        firstName: 'First', lastName: 'User', email,
        phoneNumber: `2557${Math.floor(10000000 + Math.random() * 89999999)}`,
        rolePublicIds: [rolePublicId], branchPublicIds: [branchPublicId],
        departmentPublicIds: [depPublicId],
        identificationType: 'IdentificationNumber', identificationNumber: unique('IDN'),
        companyIdentificationNumber: unique('CO'),
      });
      expect(userRes1.status()).toBe(200);
      const userPublicId = publicIdFrom(await json(userRes1));

      const userRes2 = await userManagement.createUser(token, {
        firstName: 'Second', lastName: 'User', email,
        phoneNumber: `2556${Math.floor(10000000 + Math.random() * 89999999)}`,
        rolePublicIds: [rolePublicId], branchPublicIds: [branchPublicId],
        departmentPublicIds: [depPublicId],
        identificationType: 'IdentificationNumber', identificationNumber: unique('IDN'),
        companyIdentificationNumber: unique('CO'),
      });
      expect([400, 409, 422]).toContain(userRes2.status());

      await userManagement.deleteUser(token, userPublicId);
      await userManagement.deleteRole(token, rolePublicId);
      await userManagement.deleteCountry(token, countryPublicId);
    });

    test('returns 404 when fetching a non-existent user', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.getUser(token, '00000000-0000-0000-0000-000000000000');
      expect([404, 400]).toContain(res.status());
    });
  });

  test.describe('Security', () => {
    test('returns 401 when accessing user endpoints without a token', async ({ userManagement }) => {
      const res = await userManagement.listUsers('', { page: 0, size: 1 });
      expect([401, 403]).toContain(res.status());
    });

    test('returns 401 with an invalid token format', async ({ userManagement }) => {
      const badTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'undefined',
        'null',
      ];
      for (const token of badTokens) {
        const res = await userManagement.listUsers(token, { page: 0, size: 1 });
        expect([401, 403]).toContain(res.status());
      }
    });

    test('returns 401 with an expired or tampered JWT', async ({ userManagement }) => {
      const tamperedJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0YW1wZXJlZCJ9.tampered';
      const res = await userManagement.listUsers(tamperedJwt, { page: 0, size: 1 });
      expect([401, 403]).toContain(res.status());
    });

    test('returns 404 or 400 when accessing random UUIDs', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const fakeIds = [
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ];
      for (const fakeId of fakeIds) {
        const res = await userManagement.getUser(token, fakeId);
        expect([404, 400]).toContain(res.status());
      }
    });
  });
});
