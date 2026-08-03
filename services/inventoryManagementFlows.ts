import { expect, test } from '@playwright/test';
import { _InventoryManagementService } from './inventoryManagement';
import { _UserManagementService } from './userManagement';
import { getTokenOrSkip, unique, json, publicIdFrom, firstContentPublicId } from '../helpers/testHelpers';

type CreatedEntity = {
  name: string;
  publicId: string;
};

export class _InventoryManagementFlows {
  constructor(
    private readonly inventoryManagement: _InventoryManagementService,
    private readonly userManagement: _UserManagementService,
  ) {}

  private async getFreeRegionPublicId(token: string): Promise<string> {
    const warehousesRes = await this.inventoryManagement.listWarehouses(token, { page: 0, size: 50 });
    expect(warehousesRes.status()).toBe(200);
    const usedRegions: string[] = (await json(warehousesRes)).content.map(
      (warehouse: { region?: string }) => warehouse.region ?? '',
    );

    const regionsRes = await this.userManagement.listRegions(token, { page: 0, size: 50 });
    expect(regionsRes.status()).toBe(200);
    const regions = (await json(regionsRes)).content as { publicId: string; name: string }[];
    const freeRegion = regions.find((region) => !usedRegions.includes(region.name));
    test.skip(!freeRegion, 'requires at least one region without a warehouse');
    return freeRegion!.publicId;
  }

  private async getFirstRegionPublicId(token: string): Promise<string> {
    const regionsRes = await this.userManagement.listRegions(token, { page: 0, size: 1 });
    expect(regionsRes.status()).toBe(200);
    const regionPublicId = firstContentPublicId(await json(regionsRes));
    test.skip(!regionPublicId, 'requires at least one region');
    return regionPublicId;
  }

  private async getFirstWarehousePublicId(token: string): Promise<string> {
    const warehousesRes = await this.inventoryManagement.listWarehouses(token, { page: 0, size: 1 });
    expect(warehousesRes.status()).toBe(200);
    const warehousePublicId = firstContentPublicId(await json(warehousesRes));
    test.skip(!warehousePublicId, 'requires at least one warehouse');
    return warehousePublicId;
  }

  private async createWarehouse(token: string, regionPublicId: string, prefix: string): Promise<CreatedEntity> {
    const name = unique(prefix);
    const response = await this.inventoryManagement.createWarehouse(token, {
      warehouseName: name,
      warehouseType: 'Main',
      regionPublicId,
      lat: '-6.1667',
      lon: '39.2000',
    });
    expect([200, 201]).toContain(response.status());
    return { name, publicId: publicIdFrom(await json(response)) };
  }

  private async createGeofence(token: string, regionPublicId: string, warehousePublicId: string): Promise<CreatedEntity | null> {
    const name = unique('QA Geofence');
    const lon = 39.0 + Math.random() * 0.3;
    const lat = -6.3 + Math.random() * 0.3;
    const response = await this.inventoryManagement.createGeofence(token, {
      name,
      description: 'Created by API automation',
      geoJson: {
        type: 'Polygon',
        coordinates: [[[lon, lat], [lon + 0.01, lat], [lon + 0.01, lat + 0.01], [lon, lat + 0.01], [lon, lat]]],
      },
      priority: 1,
      regionPublicId,
      warehousePublicId,
    });
    expect([200, 201, 400]).toContain(response.status());
    if (response.status() === 400) {
      test.skip(true, 'geofence overlaps with existing — skipping remainder');
      return null;
    }
    return { name, publicId: publicIdFrom(await json(response)) };
  }

  async warehouseCrud() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse');

    const getRes = await this.inventoryManagement.getWarehouse(token, warehouse.publicId);
    expect(getRes.status()).toBe(200);
    expect(await json(getRes)).toHaveProperty('publicId', warehouse.publicId);

    const updateRes = await this.inventoryManagement.updateWarehouse(token, warehouse.publicId, {
      warehouseName: unique('QA Warehouse Updated'),
      warehouseType: 'Main',
      regionPublicId,
      lat: '-6.1667',
      lon: '39.2000',
    });
    expect(updateRes.status()).toBe(200);

    const listRes = await this.inventoryManagement.listWarehouses(token, { page: 0, size: 10 });
    expect(listRes.status()).toBe(200);
    expect(await json(listRes)).toHaveProperty('content');

    const deleteRes = await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
    expect([200, 204, 404]).toContain(deleteRes.status());
  }

  async listWarehouses() {
    const token = getTokenOrSkip();
    const listRes = await this.inventoryManagement.listWarehouses(token, { page: 0, size: 5 });
    expect(listRes.status()).toBe(200);
    const body = await json(listRes);
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
  }

  async warehouseMissingFields() {
    const token = getTokenOrSkip();
    const res = await this.inventoryManagement.createWarehouse(token, {
      warehouseName: '',
      warehouseType: '',
      regionPublicId: '',
      lat: '',
      lon: '',
    });
    expect([400, 422]).toContain(res.status());
  }

  async geofenceCrud() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFirstRegionPublicId(token);
    const warehousePublicId = await this.getFirstWarehousePublicId(token);
    const geofence = await this.createGeofence(token, regionPublicId, warehousePublicId);
    if (!geofence) {
      return;
    }

    const getRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect(getRes.status()).toBe(200);
    expect(await json(getRes)).toHaveProperty('publicId', geofence.publicId);

    const deleteRes = await this.inventoryManagement.deleteGeofence(token, geofence.publicId);
    expect([200, 204, 400, 404]).toContain(deleteRes.status());
  }

  async resolveLocation() {
    const token = getTokenOrSkip();
    const resolveRes = await this.inventoryManagement.resolveLocation(token, -1.2864, 36.8172);
    expect(resolveRes.status()).toBe(200);

    const body = await json(resolveRes);
    expect(body).toHaveProperty('matched');
  }

  async resolveLocationOutOfRange() {
    const token = getTokenOrSkip();
    const res = await this.inventoryManagement.resolveLocation(token, 999, 999);
    expect([400, 422, 404, 200]).toContain(res.status());
  }
}
