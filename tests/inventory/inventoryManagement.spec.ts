import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';

test.describe('Inventory Management API', () => {
  test.describe('Warehouses', () => {
    test('creates, updates, fetches and deletes a warehouse', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.warehouseCrud();
    });

    test('lists warehouses with pagination', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.listWarehouses();
    });

    test('returns 401 without auth token', async ({ inventoryManagement }) => {
      const res = await inventoryManagement.listWarehouses('');
      expect(res.status()).toBe(401);
    });
  });

  test.describe('Geofences', () => {
    test('creates, fetches and deletes a geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceCrud();
    });
  });

  test.describe('Location Resolution', () => {
    test('resolves valid coordinates to a geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.resolveLocation();
    });
  });

  test.describe('Edge cases', () => {
    test('returns 4xx when creating a warehouse with missing fields', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.warehouseMissingFields();
    });

    test('returns 4xx when resolving location with out-of-range coordinates', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.resolveLocationOutOfRange();
    });
  });
});
