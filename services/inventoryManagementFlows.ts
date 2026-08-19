import { expect } from '@playwright/test';
import { _InventoryManagementService } from './inventoryManagement';
import { _UserManagementService } from './userManagement';
import { getTokenOrSkip, json, unique } from '../helpers/testHelpers';
import { InventoryFactory, buildSquareGeoJson, WarehouseType } from '../utils/inventoryFactory';

export class _InventoryManagementFlows {
  private readonly factory: InventoryFactory;

  constructor(
    private readonly inventoryManagement: _InventoryManagementService,
    private readonly userManagement: _UserManagementService,
  ) {
    this.factory = new InventoryFactory(inventoryManagement, userManagement);
  }

  async prepareGeofenceBranchSetup(token: string) {
    return this.factory.prepareGeofenceBranchSetup(token);
  }

  async cleanupGeofenceBranchSetup(token: string) {
    return this.factory.cleanupGeofenceBranchSetup(token);
  }

  async warehouseCrud(warehouseType: WarehouseType = 'Main') {
    const token = getTokenOrSkip();
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouseOfType(token, regionPublicId, 'QA Warehouse', warehouseType);

    const getRes = await this.inventoryManagement.getWarehouse(token, warehouse.publicId);
    expect(getRes.status()).toBe(200);
    expect(await json(getRes)).toHaveProperty('publicId', warehouse.publicId);

    const updatedRegionPublicId = await this.factory.getFreeRegionPublicId(token);
    const updatedWarehouseType: WarehouseType = warehouseType === 'Main' ? 'Quarantine' : 'Main';
    const updateRes = await this.inventoryManagement.updateWarehouse(token, warehouse.publicId, {
      warehouseName: unique('QA Warehouse Updated'),
      warehouseType: updatedWarehouseType,
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const baseLat = -12.1 - Math.random() * 0.6;
    const baseLon = 30.0 + Math.random() * 0.6;
    const geofence = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
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

    const updateRes = await this.factory.updateGeofence(token, geofence.publicId, regionPublicId, warehouse.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const baseLat = -12.05 - Math.random() * 0.7;
    const baseLon = 30.0 + Math.random() * 0.7;
    const geofence = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const baseLat = -12.15 - Math.random() * 0.5;
    const baseLon = 30.05 + Math.random() * 0.5;
    const geofence = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouseA = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse A');
    const warehouseBRegionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouseB = await this.factory.createWarehouse(token, warehouseBRegionPublicId, 'QA Warehouse B');
    const baseLat = -12.2 - Math.random() * 0.4;
    const baseLon = 30.1 + Math.random() * 0.4;
    const geofence = await this.factory.createGeofence(token, regionPublicId, warehouseA.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouseB.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const baseLat = -12.1 - Math.random() * 0.6;
    const baseLon = 30.05 + Math.random() * 0.6;
    const fenceA = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence A'),
      geoJson: buildSquareGeoJson(baseLat, baseLon, 0.02),
    });
    const fenceB = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence B'),
      geoJson: buildSquareGeoJson(baseLat + 0.06, baseLon + 0.06, 0.02),
    });

    const response = await this.factory.attemptGeofenceUpdate(token, fenceA.publicId, regionPublicId, warehouse.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const baseLat = -12.15 - Math.random() * 0.5;
    const baseLon = 30.05 + Math.random() * 0.5;
    const geofence = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
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
    const { warehouse, source, replacement } = await this.factory.createGeofencePair(
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
    const { warehouse, source, replacement } = await this.factory.createGeofencePair(
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Adjacent');
    const baseLat = -12.8 - Math.random() * 0.4;
    const baseLon = 31.0 + Math.random() * 0.3;
    const first = await this.factory.createGeofence(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Adjacent A'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[baseLon, baseLat], [baseLon + 0.015, baseLat], [baseLon + 0.015, baseLat + 0.015], [baseLon, baseLat + 0.015], [baseLon, baseLat]]],
      },
    });

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Adjacent B'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[baseLon + 0.015, baseLat], [baseLon + 0.03, baseLat], [baseLon + 0.03, baseLat + 0.015], [baseLon + 0.015, baseLat + 0.015], [baseLon + 0.015, baseLat]]],
      },
    });
    expect([200, 201]).toContain(response.status());

    const second = { name: unique('QA Geofence Adjacent B'), publicId: String((await json(response))?.publicId ?? '') };
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Inactive');
    await this.factory.deactivateWarehouse(token, warehouse.publicId, regionPublicId, warehouse.name);

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Inactive Warehouse'),
    });
    expect([400, 409, 422]).toContain(response.status());

    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceMalformedPolygon() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Malformed');

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Malformed'),
      geoJson: {
        type: 'Polygon',
        coordinates: [[[30.0, -12.3], [30.02, -12.3], [30.02, -12.28], [30.0, -12.28]]],
      } as { type: 'Polygon'; coordinates: number[][][] },
    });
    expect([400, 422]).toContain(response.status());

    await this.inventoryManagement.deleteWarehouse(token, warehouse.publicId);
  }

  async geofenceInvalidCoordinates() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Invalid Coords');

    const response = await this.factory.attemptGeofenceCreate(token, regionPublicId, warehouse.publicId, {
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
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const warehouse = await this.factory.createWarehouse(token, regionPublicId, 'QA Warehouse Geofence');
    const payload = this.factory.buildGeofencePayload(regionPublicId, warehouse.publicId, {
      name: unique('QA Geofence Missing Warehouse'),
    }) as Record<string, unknown>;
    delete payload.warehousePublicId;

    const res = await this.inventoryManagement.createGeofence(token, payload);
    expect([400, 422]).toContain(res.status());
  }

  async geofenceInvalidWarehouse() {
    const token = getTokenOrSkip();
    const regionPublicId = await this.factory.getFreeRegionPublicId(token);
    const payload = this.factory.buildGeofencePayload(regionPublicId, '00000000-0000-0000-0000-000000000000', {
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
