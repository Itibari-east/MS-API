import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';

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

    test.beforeEach(async ({ inventoryManagementFlows }) => {
      const token = getTokenOrSkip();
      await inventoryManagementFlows.prepareGeofenceBranchSetup(token);
    });

    test.afterEach(async ({ inventoryManagementFlows }) => {
      const token = getTokenOrSkip();
      await inventoryManagementFlows.cleanupGeofenceBranchSetup(token);
    });

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

    test('deletes a geofence using a replacement geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.deleteGeofenceWithReplacement();
    });

    test('deactivates a geofence using a replacement geofence', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.deactivateGeofenceWithReplacement();
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

    test('allows adjacent non-overlapping geofences in the same warehouse', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceAdjacentNonOverlapping();
    });

    test('rejects geofence creation for inactive warehouses', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceInactiveWarehouse();
    });

    test('rejects malformed geofence polygons', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceMalformedPolygon();
    });

    test('rejects geofence creation with invalid coordinates', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.geofenceInvalidCoordinates();
    });

    test('returns 4xx when resolving location with out-of-range coordinates', async ({ inventoryManagementFlows }) => {
      await inventoryManagementFlows.resolveLocationOutOfRange();
    });
  });

  test.describe('Yet to be implemented - customer auto-assignment coverage gaps', () => {
    test.skip('assigns a customer to a geofence and warehouse when the customer is inside a fence', async () => {});

    test.skip('assigns customers inside different fences to the same warehouse when fences share a warehouse', async () => {});

    test.skip('assigns a customer to the correct geofence and warehouse across different warehouses', async () => {});

    test.skip('does not randomly assign a customer when the customer is outside all active geofences', async () => {});

    test.skip('does not assign customers to inactive geofences', async () => {});

    test.skip('handles boundary coordinate cases consistently for customer assignment', async () => {});
  });
});
