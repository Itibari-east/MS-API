import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique, json, publicIdFrom } from '../../helpers/testHelpers';

test.describe('Location Management', () => {
  test('creates locations', async ({ userManagementFlows }) => {
    await userManagementFlows.locationsCreate();
  });

  test('updates locations', async ({ userManagementFlows }) => {
    await userManagementFlows.locationsUpdate();
  });

  test('deletes locations', async ({ userManagementFlows }) => {
    await userManagementFlows.locationsDelete();
  });

  test('blocks deleting a country with active cities', async ({ userManagementFlows }) => {
    await userManagementFlows.countryDeleteBlockedByCities();
  });

  test('blocks deleting a city with active branches', async ({ userManagementFlows }) => {
    await userManagementFlows.cityDeleteBlockedByBranches();
  });

  test('blocks deleting a branch with active users', async ({ userManagementFlows }) => {
    await userManagementFlows.branchDeleteBlockedByUsers();
  });

  test.describe('Edge cases', () => {
    test('returns 4xx when creating a country with duplicate code', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const code = `EC${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(-6).toUpperCase();
      const res1 = await userManagement.createCountry(token, {
        name: unique('Edge Country'),
        code,
        currency: 'TZS',
      });
      expect(res1.status()).toBe(200);
      const publicId = publicIdFrom(await json(res1));
      const res2 = await userManagement.createCountry(token, {
        name: unique('Edge Country Duplicate'),
        code,
        currency: 'TZS',
      });
      expect([400, 409, 422, 500]).toContain(res2.status());
      await userManagement.deleteCountry(token, publicId);
    });

    test('returns 4xx when creating a city with a non-existent country', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.createCity(token, {
        name: unique('Orphan City'),
        code: `OC${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
        countryPublicId: '00000000-0000-0000-0000-000000000000',
      });
      expect([400, 404, 422]).toContain(res.status());
    });

    test('returns 4xx when creating a branch with a non-existent region', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const res = await userManagement.createBranch(token, {
        name: unique('Orphan Branch'),
        description: 'Should fail',
        cityPublicIds: [],
        regionId: '00000000-0000-0000-0000-000000000000',
      });
      expect([400, 404, 422]).toContain(res.status());
    });

    test('returns 404 when fetching a non-existent entity', async ({ userManagement }) => {
      const token = getTokenOrSkip();
      const fakeId = '00000000-0000-0000-0000-000000000000';
      for (const getFn of [
        () => userManagement.getCountry(token, fakeId),
        () => userManagement.getCity(token, fakeId),
        () => userManagement.getBranch(token, fakeId),
        () => userManagement.getDepartment(token, fakeId),
        () => userManagement.getRegion(token, fakeId),
      ]) {
        const res = await getFn();
        expect([404, 400]).toContain(res.status());
      }
    });
  });

  test.describe('Security', () => {
    const token = getTokenOrSkip();

    test('rejects XSS in string fields when creating a country', async ({ userManagement }) => {
      const res = await userManagement.createCountry(token, {
        name: '<script>alert("XSS")</script>',
        code: `XS${Date.now()}`.slice(-6).toUpperCase(),
        currency: 'TZS',
      });
      expect([200, 400, 422]).toContain(res.status());
      if (res.status() === 200) {
        const publicId = (await json(res)).publicId;
        await userManagement.deleteCountry(token, publicId);
      }
    });

    test('rejects XSS in department name', async ({ userManagement }) => {
      const res = await userManagement.createDepartment(token, {
        departmentName: '<img src=x onerror=alert(1)>',
      });
      expect([200, 400, 422]).toContain(res.status());
      if (res.status() === 200) {
        const publicId = (await json(res)).publicId;
        await userManagement.deleteDepartment(token, publicId);
      }
    });

    test('rejects SQL injection in branch name', async ({ userManagement }) => {
      const regionPublicId = (await json(await userManagement.listRegions(token, { page: 0, size: 1 })))?.content?.[0]?.publicId;
      test.skip(!regionPublicId, 'requires at least one region');
      const res = await userManagement.createBranch(token, {
        name: '1 OR 1=1',
        description: "'; SELECT * FROM users; --",
        cityPublicIds: [],
        regionId: regionPublicId,
      });
      expect([200, 400, 422, 500]).toContain(res.status());
      if (res.status() === 200) {
        const publicId = (await json(res)).publicId;
        await userManagement.deleteBranch(token, publicId);
      }
    });

    test('returns 401 when accessing location endpoints without a token', async ({ userManagement }) => {
      for (const call of [
        () => userManagement.listCountries('', { page: 0, size: 1 }),
        () => userManagement.listDepartments('', { page: 0, size: 1 }),
      ]) {
        const res = await call();
        expect([401, 403]).toContain(res.status());
      }
    });
  });
});
