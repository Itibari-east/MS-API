import { expect, test } from '@playwright/test';
import { _InventoryManagementService } from './inventoryManagement';
import { _UserManagementService } from './userManagement';
import { getTokenOrSkip, unique, json, publicIdFrom, firstContentPublicId } from '../helpers/testHelpers';

type CreatedEntity = {
  name: string;
  publicId: string;
};

type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

type GeofenceInput = {
  name?: string;
  description?: string;
  geoJson?: GeoJsonPolygon;
  priority?: number;
  active?: boolean;
  maxAreaSqKm?: number;
};

function buildSquareGeoJson(centerLat: number, centerLon: number, delta = 0.01): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [centerLon, centerLat],
        [centerLon + delta, centerLat],
        [centerLon + delta, centerLat + delta],
        [centerLon, centerLat + delta],
        [centerLon, centerLat],
      ],
    ],
  };
}

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

  private buildGeofencePayload(regionPublicId: string, warehousePublicId: string, input: GeofenceInput = {}) {
    return {
      name: input.name ?? unique('QA Geofence'),
      description: input.description ?? 'Created by API automation',
      geoJson: input.geoJson ?? buildSquareGeoJson(-6.3 + Math.random() * 0.3, 39.0 + Math.random() * 0.3),
      priority: input.priority ?? 1,
      regionPublicId,
      warehousePublicId,
      maxAreaSqKm: input.maxAreaSqKm ?? 10,
      ...(typeof input.active === 'boolean' ? { active: input.active } : {}),
    };
  }

  private async createGeofence(
    token: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ): Promise<CreatedEntity> {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    const response = await this.inventoryManagement.createGeofence(token, payload);
    expect([200, 201]).toContain(response.status());
    return { name: payload.name, publicId: publicIdFrom(await json(response)) };
  }

  private async updateGeofence(
    token: string,
    publicId: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    const response = await this.inventoryManagement.updateGeofence(token, publicId, payload);
    expect([200, 201]).toContain(response.status());
    return response;
  }

  private async attemptGeofenceCreate(
    token: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    return this.inventoryManagement.createGeofence(token, payload);
  }

  private async attemptGeofenceUpdate(
    token: string,
    publicId: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    return this.inventoryManagement.updateGeofence(token, publicId, payload);
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
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence'),
      geoJson: buildSquareGeoJson(-6.3, 39.0, 0.02),
    });

    const getRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect(getRes.status()).toBe(200);
    const detail = await json(getRes);
    expect(detail).toMatchObject({
      publicId: geofence.publicId,
      name: geofence.name,
    });

    const updateRes = await this.updateGeofence(token, geofence.publicId, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Updated'),
      description: 'Updated by API automation',
      geoJson: buildSquareGeoJson(-6.32, 39.12, 0.02),
    });
    expect([200, 201]).toContain(updateRes.status());
    const updated = await json(updateRes);
    expect(updated).toHaveProperty('publicId', geofence.publicId);
    expect(updated).toHaveProperty('name');

    const deleteRes = await this.inventoryManagement.deleteGeofence(token, geofence.publicId);
    expect([200, 204, 400, 404]).toContain(deleteRes.status());
  }

  async listGeofences() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence List'),
    });

    const listRes = await this.inventoryManagement.listGeofences(token, {
      page: 0,
      size: 10,
      sort: 'creationTime,DESC',
      search: geofence.name,
      active: true,
    });
    expect(listRes.status()).toBe(200);
    const body = await json(listRes);
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
    expect(Array.isArray(body.content)).toBeTruthy();
    expect(body.content.some((item: { publicId?: string }) => item.publicId === geofence.publicId)).toBeTruthy();
  }

  async overlapWithinWarehouse() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(-6.3, 39.0, 0.02),
    });

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(-6.295, 39.005, 0.02),
    });
    expect([400, 409, 422]).toContain(response.status());

    const detailRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect(detailRes.status()).toBe(200);
    expect(await json(detailRes)).toHaveProperty('publicId', geofence.publicId);
  }

  async overlapAcrossWarehouses() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouseA = await this.createWarehouse(token, regionPublicId, 'QA Warehouse A');
    const warehouseB = await this.createWarehouse(token, regionPublicId, 'QA Warehouse B');
    const geofence = await this.createGeofence(token, regionPublicId, warehouseA.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(-6.31, 39.02, 0.02),
    });

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouseB.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(-6.315, 39.025, 0.02),
    });
    expect([400, 409, 422]).toContain(response.status());

    const detailRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect(detailRes.status()).toBe(200);
    expect(await json(detailRes)).toHaveProperty('publicId', geofence.publicId);
  }

  async overlapOnUpdate() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const fenceA = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(-6.33, 39.03, 0.02),
    });
    const fenceB = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(-6.31, 39.05, 0.02),
    });

    const response = await this.attemptGeofenceUpdate(token, fenceA.publicId, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A Updated'),
      geoJson: buildSquareGeoJson(-6.31, 39.05, 0.02),
    });
    expect([400, 409, 422]).toContain(response.status());

    const detailRes = await this.inventoryManagement.getGeofence(token, fenceA.publicId);
    expect(detailRes.status()).toBe(200);
    const detail = await json(detailRes);
    expect(detail).toHaveProperty('publicId', fenceA.publicId);
    expect(detail).toHaveProperty('name', fenceA.name);
    expect(detail).not.toHaveProperty('name', fenceB.name);
  }

  async deactivateGeofence() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Deactivate'),
      geoJson: buildSquareGeoJson(-6.34, 39.04, 0.02),
    });

    const deactivateRes = await this.inventoryManagement.deactivateGeofence(token, geofence.publicId);
    expect([200, 204]).toContain(deactivateRes.status());

    const detailRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect(detailRes.status()).toBe(200);
    const detail = await json(detailRes);
    expect(detail).toHaveProperty('publicId', geofence.publicId);
    expect(detail).toHaveProperty('name', geofence.name);
    if (Object.prototype.hasOwnProperty.call(detail, 'active')) {
      expect(detail.active).toBeFalsy();
    }
    if (Object.prototype.hasOwnProperty.call(detail, 'status')) {
      expect(String(detail.status).toLowerCase()).toContain('inactive');
    }
  }

  async geofenceMissingWarehouse() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const payload = this.buildGeofencePayload(regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Missing Warehouse'),
    }) as Record<string, unknown>;
    delete payload.warehousePublicId;

    const res = await this.inventoryManagement.createGeofence(token, payload);
    expect([400, 422]).toContain(res.status());
  }

  async geofenceInvalidWarehouse() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const payload = this.buildGeofencePayload(regionPublicId, '00000000-0000-0000-0000-000000000000', {
      name: unique('QA Geofence Invalid Warehouse'),
    });

    const res = await this.inventoryManagement.createGeofence(token, payload);
    expect([400, 404, 422]).toContain(res.status());
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
