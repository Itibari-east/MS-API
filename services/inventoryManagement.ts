import { APIResponse } from '@playwright/test';
import { _InventoryManagementRequests } from '../requests/inventoryManagement';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export class _InventoryManagementService {
  listWarehouses(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_InventoryManagementRequests.warehouses.list(), params), undefined, authHeaders(token));
  }

  createWarehouse(token: string, payload: unknown) {
    return common.postResponse(_InventoryManagementRequests.warehouses.create(), payload, authHeaders(token));
  }

  getWarehouse(token: string, publicId: string) {
    return common.getResponse(_InventoryManagementRequests.warehouses.byId(publicId), undefined, authHeaders(token));
  }

  updateWarehouse(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_InventoryManagementRequests.warehouses.byId(publicId), payload, authHeaders(token));
  }

  deleteWarehouse(token: string, publicId: string) {
    return common.deleteResponse(_InventoryManagementRequests.warehouses.byId(publicId), undefined, authHeaders(token));
  }

  listGeofences(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_InventoryManagementRequests.geofences.list(), params), undefined, authHeaders(token));
  }

  createGeofence(token: string, payload: unknown) {
    return common.postResponse(_InventoryManagementRequests.geofences.create(), payload, authHeaders(token));
  }

  getGeofence(token: string, publicId: string) {
    return common.getResponse(_InventoryManagementRequests.geofences.byId(publicId), undefined, authHeaders(token));
  }

  updateGeofence(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_InventoryManagementRequests.geofences.byId(publicId), payload, authHeaders(token));
  }

  deleteGeofence(token: string, publicId: string, replacementGeofencePublicId?: string) {
    const url = _InventoryManagementRequests.geofences.byId(publicId);
    const params = replacementGeofencePublicId ? ({ replacementGeofencePublicId } as QueryParams) : undefined;
    return common.deleteResponse(withQueryParams(url, params), undefined, authHeaders(token));
  }

  deactivateGeofence(token: string, publicId: string, replacementGeofencePublicId?: string) {
    return common.postResponse(
      _InventoryManagementRequests.geofences.deactivate(publicId),
      replacementGeofencePublicId ? { replacementGeofencePublicId } : undefined,
      authHeaders(token),
    );
  }

  resolveLocation(token: string, lat: number, lng: number) {
    return common.postResponse(_InventoryManagementRequests.geofences.resolveLocation(), { lat, lng }, authHeaders(token));
  }
}
