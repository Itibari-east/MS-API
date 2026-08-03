import _config from '../config/config';

const base = _config.serviceEndpoints.inventoryManagement;

export const _InventoryManagementRequests = {
  warehouses: {
    list: () => `${base}/warehouses`,
    create: () => `${base}/warehouses`,
    byId: (publicId: string) => `${base}/warehouses/${publicId}`,
  },
  geofences: {
    list: () => `${base}/geofencing`,
    create: () => `${base}/geofencing/geofences`,
    byId: (publicId: string) => `${base}/geofencing/${publicId}`,
    deactivate: (publicId: string) => `${base}/geofencing/${publicId}/deactivate`,
    resolveLocation: () => `${base}/geofencing/location`,
  },
};
