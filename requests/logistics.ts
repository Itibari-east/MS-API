import _config from '../config/config';

const base = _config.serviceEndpoints.logistics;

export const _LogisticsRequests = {
  deliveryAgents: {
    list: () => `${base}/deliveryAgents`,
    create: () => `${base}/deliveryAgents`,
    byId: (publicId: string) => `${base}/deliveryAgents/${publicId}`,
  },
  vehicleOwners: {
    list: () => `${base}/vehicles/owners`,
    create: () => `${base}/vehicles/owners`,
    byId: (publicId: string) => `${base}/vehicles/owners/${publicId}`,
  },
  vehicles: {
    list: () => `${base}/vehicles`,
    create: () => `${base}/vehicles`,
    byId: (publicId: string) => `${base}/vehicles/${publicId}`,
  },
};
