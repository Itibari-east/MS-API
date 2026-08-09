import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';

test.describe('@inventory Inventory Management API', () => {
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
    test.describe.configure({ mode: 'serial' });

    test('creates, fetches, updates and deletes a geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceCrud();
    });

    test('lists and filters geofences', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.listGeofences();
    });

    test('rejects overlapping geofences within the same warehouse', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.overlapWithinWarehouse();
    });

    test('rejects overlapping geofences across warehouses', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.overlapAcrossWarehouses();
    });

    test('rejects overlapping geofence updates and preserves original state', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.overlapOnUpdate();
    });

    test('deactivates a geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.deactivateGeofence();
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

    test('returns 4xx when creating a geofence without a warehouse', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceMissingWarehouse();
    });

    test('returns 4xx when creating a geofence with an invalid warehouse', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceInvalidWarehouse();
    });

    test('returns 4xx when resolving location with out-of-range coordinates', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.resolveLocationOutOfRange();
    });
  });

  test.describe('Yet to be implemented - geofence coverage gaps', () => {
    test.skip('allows adjacent non-overlapping geofences in the same warehouse', async () => {});

    test.skip('rejects geofence creation for inactive warehouses', async () => {});

    test.skip('rejects malformed geofence polygons', async () => {});

    test.skip('rejects geofence creation with invalid coordinates', async () => {});

    test.skip('supports replacement geofences when deleting or deactivating', async () => {});

    test.skip('verifies customer auto-assignment side effects after geofence changes', async () => {});
  });
});
