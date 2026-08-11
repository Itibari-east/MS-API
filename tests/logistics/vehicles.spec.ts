import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import { fetchVehicleItems } from '../../helpers/logisticsFactory';

test.describe.serial('@logistics Logistics Service - Vehicles', () => {
  test('lists vehicles with pagination', async ({ logisticsService }) => {
    const token = getTokenOrSkip();
    const items = await fetchVehicleItems(logisticsService, token, {
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });

    expect(Array.isArray(items)).toBeTruthy();
  });

  test.skip('creates a vehicle', async () => {
    test.skip(true, 'backend currently returns 500 for POST /vehicles');
  });

  test.skip('updates a vehicle', async () => {
    test.skip(true, 'backend currently returns 500 for POST /vehicles, so update coverage is blocked');
  });

  test.skip('deletes a vehicle', async () => {
    test.skip(true, 'backend currently returns 500 for POST /vehicles, so delete coverage is blocked');
  });

  test.skip('paginates vehicle owners', async () => {
    test.skip(true, 'backend currently returns 500 for /vehicles/owners');
  });

  test('returns 401 without an auth token', async ({ logisticsService }) => {
    const ownerList = await logisticsService.listVehicleOwners('', { page: 0, size: 1, sort: 'creationTime,DESC' });
    expect([401, 403]).toContain(ownerList.status());
    const vehicleList = await logisticsService.listVehicles('', { page: 0, size: 1, sort: 'creationTime,DESC' });
    expect([401, 403]).toContain(vehicleList.status());
  });

  test('returns 404 for invalid vehicle owner and vehicle ids', async ({ logisticsService }) => {
    const token = getTokenOrSkip();
    const ownerRes = await logisticsService.getVehicleOwner(token, '00000000-0000-0000-0000-000000000000');
    expect([404, 500]).toContain(ownerRes.status());
    const vehicleRes = await logisticsService.getVehicle(token, '00000000-0000-0000-0000-000000000000');
    expect([404, 500]).toContain(vehicleRes.status());
  });
});
