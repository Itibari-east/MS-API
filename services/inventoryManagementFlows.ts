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

type BranchSetup = {
  regionPublicId: string;
  country: CreatedEntity;
  city: CreatedEntity;
  branch: CreatedEntity;
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

function shiftGeoJson(geoJson: GeoJsonPolygon, deltaLat: number, deltaLon: number): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: geoJson.coordinates.map((ring) =>
      ring.map(([lon, lat]) => [lon + deltaLon, lat + deltaLat]),
    ),
  };
}

type GeofencePair = {
  regionPublicId: string;
  warehouse: CreatedEntity;
  source: CreatedEntity;
  replacement: CreatedEntity;
};

type WarehousePayload = {
  warehouseName: string;
  warehouseType: string;
  regionId?: string;
  regionPublicId?: string;
  lat: string | number;
  lon: string | number;
  regions?: string[];
  active?: boolean;
};

export class _InventoryManagementFlows {
  private branchSetup?: BranchSetup;

  constructor(
    private readonly inventoryManagement: _InventoryManagementService,
    private readonly userManagement: _UserManagementService,
  ) {}

  private async getFreeRegionPublicId(token: string): Promise<string> {
    const warehousesRes = await this.inventoryManagement.listWarehouses(token, { page: 0, size: 500 });
    expect(warehousesRes.status()).toBe(200);
    const usedRegions: string[] = (await json(warehousesRes)).content.flatMap(
      (warehouse: {
        region?: string;
        regionPublicId?: string;
        responseList?: Array<{ publicId?: string }>;
        regions?: Array<string | { publicId?: string }>;
      }) => [
        warehouse.region ?? '',
        warehouse.regionPublicId ?? '',
        ...(warehouse.responseList ?? []).map((region) => region.publicId ?? ''),
        ...(warehouse.regions ?? []).map((region) => (typeof region === 'string' ? region : region.publicId ?? '')),
      ],
    );

    const geofencesRes = await this.inventoryManagement.listGeofences(token, { page: 0, size: 500 });
    expect(geofencesRes.status()).toBe(200);
    const geofenceRegions = (await json(geofencesRes)).content.flatMap((geofence: { regionPublicId?: string }) => [
      geofence.regionPublicId ?? '',
    ]);

    const regionsRes = await this.userManagement.listRegions(token, { page: 0, size: 50 });
    expect(regionsRes.status()).toBe(200);
    const regions = (await json(regionsRes)).content as { publicId: string; name: string }[];
    const freeRegion = regions.find((region) => !usedRegions.includes(region.publicId) && !geofenceRegions.includes(region.publicId));
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

  private async createCountry(token: string, prefix: string): Promise<CreatedEntity> {
    const name = unique(prefix);
    const response = await this.userManagement.createCountry(token, {
      name,
      code: `AC${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
      currency: 'TZS',
    });
    expect([200, 201]).toContain(response.status());
    return { name, publicId: publicIdFrom(await json(response)) };
  }

  private async createCity(token: string, countryPublicId: string, prefix: string): Promise<CreatedEntity> {
    const name = unique(prefix);
    const response = await this.userManagement.createCity(token, {
      name,
      code: `CT${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
      countryPublicId,
    });
    expect([200, 201]).toContain(response.status());
    return { name, publicId: publicIdFrom(await json(response)) };
  }

  private async createBranch(token: string, cityPublicId: string, regionPublicId: string, prefix: string): Promise<CreatedEntity> {
    const name = unique(prefix);
    const response = await this.userManagement.createBranch(token, {
      name,
      description: 'Created by API automation',
      cityPublicIds: [cityPublicId],
      regionId: regionPublicId,
    });
    expect([200, 201]).toContain(response.status());
    return { name, publicId: publicIdFrom(await json(response)) };
  }

  private async deleteAllowed(responsePromise: Promise<{ status(): number }>, allowedStatuses: number[]) {
    const response = await responsePromise;
    expect(allowedStatuses).toContain(response.status());
  }

  private async createBranchSetup(token: string): Promise<BranchSetup> {
    const regionPublicId = await this.getFirstRegionPublicId(token);
    const country = await this.createCountry(token, 'Geofence Country');
    const city = await this.createCity(token, country.publicId, 'Geofence City');
    const branch = await this.createBranch(token, city.publicId, regionPublicId, 'Geofence Branch');
    return { regionPublicId, country, city, branch };
  }

  async prepareGeofenceBranchSetup(token: string) {
    this.branchSetup = await this.createBranchSetup(token);
    return this.branchSetup;
  }

  async cleanupGeofenceBranchSetup(token: string) {
    if (!this.branchSetup) {
      return;
    }

    await this.deleteAllowed(this.userManagement.deleteBranch(token, this.branchSetup.branch.publicId), [204, 404]);
    await this.deleteAllowed(this.userManagement.deleteCity(token, this.branchSetup.city.publicId), [204, 404]);
    await this.deleteAllowed(this.userManagement.deleteCountry(token, this.branchSetup.country.publicId), [204, 404]);
    this.branchSetup = undefined;
  }

  private async createWarehouse(token: string, regionPublicId: string, prefix: string): Promise<CreatedEntity> {
    const name = unique(prefix);
    const payloads: WarehousePayload[] = [
      {
        warehouseName: name,
        warehouseType: 'Main',
        regionPublicId,
        regions: [regionPublicId],
        lat: '-6.1667',
        lon: '39.2000',
      },
      {
        warehouseName: name,
        warehouseType: 'Quarantine',
        regionPublicId,
        regions: [regionPublicId],
        lat: '-6.1667',
        lon: '39.2000',
      },
    ];

    let lastResponse;
    for (const [index, payload] of payloads.entries()) {
      lastResponse = await this.inventoryManagement.createWarehouse(token, payload);
      if ([200, 201].includes(lastResponse.status())) {
        return { name, publicId: publicIdFrom(await json(lastResponse)) };
      }

      if (lastResponse.status() !== 400 || index === payloads.length - 1) {
        break;
      }

      console.warn(
        `[Inventory] warehouse create fallback after 400 for ${name} using alternate payload shape`,
      );
    }

    expect([200, 201]).toContain(lastResponse?.status());
    return { name, publicId: publicIdFrom(await json(lastResponse)) };
  }

  private async deactivateWarehouse(token: string, publicId: string, regionPublicId: string, currentName: string) {
    const payloads: WarehousePayload[] = [
      {
        warehouseName: `${currentName}-inactive`,
        warehouseType: 'Main',
        regionPublicId,
        regions: [regionPublicId],
        lat: '-6.1667',
        lon: '39.2000',
        active: false,
      },
      {
        warehouseName: `${currentName}-inactive`,
        warehouseType: 'Quarantine',
        regionPublicId,
        regions: [regionPublicId],
        lat: '-6.1667',
        lon: '39.2000',
        active: false,
      },
    ];

    let lastResponse;
    for (const [index, payload] of payloads.entries()) {
      lastResponse = await this.inventoryManagement.updateWarehouse(token, publicId, payload);
      if ([200, 201].includes(lastResponse.status())) {
        return lastResponse;
      }

      if (lastResponse.status() !== 400 || index === payloads.length - 1) {
        break;
      }

      console.warn(
        `[Inventory] warehouse update fallback after 400 for ${publicId} using alternate payload shape`,
      );
    }

    expect([200, 201]).toContain(lastResponse?.status());
    return lastResponse;
  }

  private async createGeofencePair(
    token: string,
    warehousePrefix: string,
    sourcePrefix: string,
    replacementPrefix: string,
  ): Promise<GeofencePair> {
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, warehousePrefix);
    const baseLat = -12.2 - Math.random() * 0.4;
    const baseLon = 30.1 + Math.random() * 0.4;
    const source = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique(sourcePrefix),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });
    const replacement = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique(replacementPrefix),
      geoJson: buildSquareGeoJson(baseLat + 0.06, baseLon + 0.08, 0.02),
    });

    return { regionPublicId, warehouse, source, replacement };
  }

  private buildGeofencePayload(regionPublicId: string, warehousePublicId: string, input: GeofenceInput = {}) {
    const branchDescription =
      this.branchSetup ? `Created by API automation for branch ${this.branchSetup.branch.name}` : 'Created by API automation';

    return {
      name: input.name ?? unique('QA Geofence'),
      description: input.description ?? branchDescription,
      geoJson: input.geoJson ?? buildSquareGeoJson(-12 + Math.random() * 0.2, 30 + Math.random() * 0.2),
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
    const basePayload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);

    let payload = basePayload;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.inventoryManagement.createGeofence(token, payload);
      if ([200, 201].includes(response.status())) {
        return { name: payload.name, publicId: publicIdFrom(await json(response)) };
      }

      const body = await json(response).catch(() => ({}));
      const overlapMessage = String((body as { userMessage?: string; developerMessage?: string }).userMessage ?? '')
        .concat(' ', String((body as { developerMessage?: string }).developerMessage ?? ''))
        .toLowerCase();
      const shouldRetry = response.status() === 400 && overlapMessage.includes('overlap');
      if (!shouldRetry || !payload.geoJson) {
        expect([200, 201]).toContain(response.status());
        return { name: payload.name, publicId: publicIdFrom(body) };
      }

      const shift = 0.12 + Math.random() * 0.2;
      payload = {
        ...payload,
        geoJson: shiftGeoJson(payload.geoJson, shift, shift),
      };
    }

    expect(false).toBeTruthy();
    return { name: basePayload.name, publicId: '' };
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

    const updatedRegionPublicId = await this.getFreeRegionPublicId(token);
    const updateRes = await this.inventoryManagement.updateWarehouse(token, warehouse.publicId, {
      warehouseName: unique('QA Warehouse Updated'),
      warehouseType: 'Quarantine',
      regionPublicId: updatedRegionPublicId,
      regions: [updatedRegionPublicId],
      lat: '-6.1667',
      lon: '39.2000',
      active: true,
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
    const baseLat = -12.1 - Math.random() * 0.6;
    const baseLon = 30.0 + Math.random() * 0.6;
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
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
      geoJson: buildSquareGeoJson(baseLat + 0.02, baseLon + 0.12, 0.02),
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
    const baseLat = -12.05 - Math.random() * 0.7;
    const baseLon = 30.0 + Math.random() * 0.7;
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence List'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
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
    const baseLat = -12.15 - Math.random() * 0.5;
    const baseLon = 30.05 + Math.random() * 0.5;
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(baseLat + 0.005, baseLon + 0.005, 0.02),
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
    const warehouseBRegionPublicId = await this.getFreeRegionPublicId(token);
    const warehouseB = await this.createWarehouse(token, warehouseBRegionPublicId, 'QA Warehouse B');
    const baseLat = -12.2 - Math.random() * 0.4;
    const baseLon = 30.1 + Math.random() * 0.4;
    const geofence = await this.createGeofence(token, regionPublicId, warehouseA.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouseB.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(baseLat + 0.005, baseLon + 0.005, 0.02),
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
    const baseLat = -12.1 - Math.random() * 0.6;
    const baseLon = 30.05 + Math.random() * 0.6;
    const fenceA = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });
    const fenceB = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(baseLat + 0.06, baseLon + 0.06, 0.02),
    });

    const response = await this.attemptGeofenceUpdate(token, fenceA.publicId, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A Updated'),
      geoJson: buildSquareGeoJson(baseLat + 0.06, baseLon + 0.06, 0.02),
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
    const baseLat = -12.15 - Math.random() * 0.5;
    const baseLon = 30.05 + Math.random() * 0.5;
    const geofence = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Deactivate'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });

    const deactivateRes = await this.inventoryManagement.deactivateGeofence(token, geofence.publicId);
    expect([200, 204]).toContain(deactivateRes.status());

    const detailRes = await this.inventoryManagement.getGeofence(token, geofence.publicId);
    expect([200, 404]).toContain(detailRes.status());
    if (detailRes.status() === 200) {
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
  }

  async deleteGeofenceWithReplacement() {
    const token = getTokenOrSkip();
    const { warehouse, source, replacement } = await this.createGeofencePair(
      token,
      'QA Warehouse Replacement Delete',
      'QA Geofence Delete Source',
      'QA Geofence Delete Replacement',
    );

    const deleteRes = await this.inventoryManagement.deleteGeofence(token, source.publicId, replacement.publicId);
    expect([200, 204]).toContain(deleteRes.status());

    const sourceRes = await this.inventoryManagement.getGeofence(token, source.publicId);
    expect([400, 404]).toContain(sourceRes.status());

    const replacementRes = await this.inventoryManagement.getGeofence(token, replacement.publicId);
    expect(replacementRes.status()).toBe(200);
    expect(await json(replacementRes)).toHaveProperty('publicId', replacement.publicId);

    await this.inventoryManagement.deleteGeofence(token, replacement.publicId);
    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async deactivateGeofenceWithReplacement() {
    const token = getTokenOrSkip();
    const { warehouse, source, replacement } = await this.createGeofencePair(
      token,
      'QA Warehouse Replacement Deactivate',
      'QA Geofence Deactivate Source',
      'QA Geofence Deactivate Replacement',
    );

    const deactivateRes = await this.inventoryManagement.deactivateGeofence(token, source.publicId, replacement.publicId);
    expect([200, 204]).toContain(deactivateRes.status());

    const sourceRes = await this.inventoryManagement.getGeofence(token, source.publicId);
    expect([200, 404]).toContain(sourceRes.status());
    if (sourceRes.status() === 200) {
      const sourceBody = await json(sourceRes);
      if (Object.prototype.hasOwnProperty.call(sourceBody, 'active')) {
        expect(sourceBody.active).toBeFalsy();
      }
      if (Object.prototype.hasOwnProperty.call(sourceBody, 'status')) {
        expect(String(sourceBody.status).toLowerCase()).toContain('inactive');
      }
    }

    const replacementRes = await this.inventoryManagement.getGeofence(token, replacement.publicId);
    expect(replacementRes.status()).toBe(200);
    expect(await json(replacementRes)).toHaveProperty('publicId', replacement.publicId);

    await this.inventoryManagement.deleteGeofence(token, replacement.publicId);
    await this.inventoryManagement.deleteGeofence(token, source.publicId);
    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceAdjacentNonOverlapping() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Adjacent');
    const baseLat = -12.8 - Math.random() * 0.4;
    const baseLon = 31.0 + Math.random() * 0.3;
    const first = await this.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Adjacent A'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[baseLon, baseLat], [baseLon + 0.015, baseLat], [baseLon + 0.015, baseLat + 0.015], [baseLon, baseLat + 0.015], [baseLon, baseLat]]],
      },
    });

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Adjacent B'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[baseLon + 0.015, baseLat], [baseLon + 0.03, baseLat], [baseLon + 0.03, baseLat + 0.015], [baseLon + 0.015, baseLat + 0.015], [baseLon + 0.015, baseLat]]],
      },
    });
    expect([200, 201]).toContain(response.status());

    const second = { name: unique('QA Geofence Adjacent B'), publicId: publicIdFrom(await json(response)) };
    const firstDetailRes = await this.inventoryManagement.getGeofence(token, first.publicId);
    const secondDetailRes = await this.inventoryManagement.getGeofence(token, second.publicId);
    expect(firstDetailRes.status()).toBe(200);
    expect(secondDetailRes.status()).toBe(200);

    await this.inventoryManagement.deleteGeofence(token, second.publicId);
    await this.inventoryManagement.deleteGeofence(token, first.publicId);
    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceInactiveWarehouse() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Inactive');
    await this.deactivateWarehouse(token, warehouse.publicId, regionPublicId, warehouse.name);

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Inactive Warehouse'),
    });
    expect([400, 409, 422]).toContain(response.status());

    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceMalformedPolygon() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Malformed');

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Malformed'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[30.0, -12.3], [30.02, -12.3], [30.02, -12.28], [30.0, -12.28]]],
      } as GeoJsonPolygon,
    });
    expect([400, 422]).toContain(response.status());

    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceInvalidCoordinates() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.getFreeRegionPublicId(token);
    const warehouse = await this.createWarehouse(token, regionPublicId, 'QA Warehouse Invalid Coords');

    const response = await this.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Invalid Coords'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[999, -999], [1000, -999], [1000, -998], [999, -998], [999, -999]]],
      },
    });
    expect([400, 422]).toContain(response.status());

    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
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
