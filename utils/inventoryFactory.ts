import { expect, test } from '@playwright/test';
import { _InventoryManagementService } from '../services/inventoryManagement';
import { _UserManagementService } from '../services/userManagement';
import { firstContentPublicId, json, publicIdFrom, unique } from '../helpers/testHelpers';

export type CreatedEntity = {
  name: string;
  publicId: string;
};

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type GeofenceInput = {
  name?: string;
  description?: string;
  geoJson?: GeoJsonPolygon;
  priority?: number;
  active?: boolean;
  maxAreaSqKm?: number;
};

export type BranchSetup = {
  regionPublicId: string;
  country: CreatedEntity;
  city: CreatedEntity;
  branch: CreatedEntity;
};

export type GeofencePair = {
  regionPublicId: string;
  warehouse: CreatedEntity;
  source: CreatedEntity;
  replacement: CreatedEntity;
};

export type WarehousePayload = {
  warehouseName: string;
  warehouseType: string;
  regionId?: string;
  regionPublicId?: string;
  lat: string | number;
  lon: string | number;
  regions?: string[];
  active?: boolean;
};

export function buildSquareGeoJson(centerLat: number, centerLon: number, delta = 0.01): GeoJsonPolygon {
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

export function shiftGeoJson(geoJson: GeoJsonPolygon, deltaLat: number, deltaLon: number): GeoJsonPolygon {
  return {
    type: 'Polygon',
    coordinates: geoJson.coordinates.map((ring) =>
      ring.map(([lon, lat]) => [lon + deltaLon, lat + deltaLat]),
    ),
  };
}

export class InventoryFactory {
  private branchSetup?: BranchSetup;
  private regionCache?: { token: string; regions: { publicId: string; name: string }[] };

  constructor(
    private readonly inventoryManagement: _InventoryManagementService,
    private readonly userManagement: _UserManagementService,
  ) {}

  async getAllRegions(token: string): Promise<{ publicId: string; name: string }[]> {
    if (this.regionCache?.token === token) {
      return this.regionCache.regions;
    }

    const regions: { publicId: string; name: string }[] = [];
    for (let page = 0; ; page += 1) {
      const regionsRes = await this.userManagement.listRegions(token, { page, size: 50 });
      expect(regionsRes.status()).toBe(200);
      const body = await json(regionsRes);
      regions.push(...(body.content as { publicId: string; name: string }[]));
      if (body.last || body.content.length === 0) {
        break;
      }
    }

    this.regionCache = { token, regions };
    return regions;
  }

  async getFreeRegionPublicId(token: string): Promise<string> {
    const cachedRegions = await this.getAllRegions(token);

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

    const freeRegion = cachedRegions.find(
      (region) => !usedRegions.includes(region.publicId) && !geofenceRegions.includes(region.publicId),
    );
    test.skip(!freeRegion, 'requires at least one region without a warehouse');
    return freeRegion!.publicId;
  }

  async getFirstRegionPublicId(token: string): Promise<string> {
    const regionPublicId = (await this.getAllRegions(token))[0]?.publicId ?? firstContentPublicId(await json(await this.userManagement.listRegions(token, { page: 0, size: 1 })));
    test.skip(!regionPublicId, 'requires at least one region');
    return regionPublicId;
  }

  async getFirstWarehousePublicId(token: string): Promise<string> {
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

  async createBranchSetup(token: string): Promise<BranchSetup> {
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

  async createWarehouse(token: string, regionPublicId: string, prefix: string): Promise<CreatedEntity> {
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

      console.warn(`[Inventory] warehouse create fallback after 400 for ${name} using alternate payload shape`);
    }

    expect([200, 201]).toContain(lastResponse?.status());
    return { name, publicId: publicIdFrom(await json(lastResponse)) };
  }

  async deactivateWarehouse(token: string, publicId: string, regionPublicId: string, currentName: string) {
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

      console.warn(`[Inventory] warehouse update fallback after 400 for ${publicId} using alternate payload shape`);
    }

    expect([200, 201]).toContain(lastResponse?.status());
    return lastResponse;
  }

  async createGeofencePair(
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

  buildGeofencePayload(regionPublicId: string, warehousePublicId: string, input: GeofenceInput = {}) {
    const branchDescription = this.branchSetup
      ? `Created by API automation for branch ${this.branchSetup.branch.name}`
      : 'Created by API automation';

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

  async createGeofence(
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

  async updateGeofence(
    token: string,
    publicId: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    let payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.inventoryManagement.updateGeofence(token, publicId, payload);
      if ([200, 201].includes(response.status())) {
        return response;
      }

      const body = await json(response).catch(() => ({}));
      const overlapMessage = String((body as { userMessage?: string; developerMessage?: string }).userMessage ?? '')
        .concat(' ', String((body as { developerMessage?: string }).developerMessage ?? ''))
        .toLowerCase();
      const shouldRetry = response.status() === 400 && overlapMessage.includes('overlap');
      if (!shouldRetry || !payload.geoJson) {
        expect([200, 201]).toContain(response.status());
        return response;
      }

      const shift = 0.12 + Math.random() * 0.2;
      payload = {
        ...payload,
        geoJson: shiftGeoJson(payload.geoJson, shift, shift),
      };
    }

    expect(false).toBeTruthy();
    return undefined as never;
  }

  async attemptGeofenceCreate(
    token: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    return this.inventoryManagement.createGeofence(token, payload);
  }

  async attemptGeofenceUpdate(
    token: string,
    publicId: string,
    regionPublicId: string,
    warehousePublicId: string,
    input: GeofenceInput = {},
  ) {
    const payload = this.buildGeofencePayload(regionPublicId, warehousePublicId, input);
    return this.inventoryManagement.updateGeofence(token, publicId, payload);
  }

}
