import _config from '../config/config';

const base = _config.serviceEndpoints.logistics;

export const _LogisticsRequests = {
  deliveryAgents: {
    list: () => `${base}/deliveryAgents`,
    create: () => `${base}/deliveryAgents`,
    byId: (publicId: string) => `${base}/deliveryAgents/${publicId}`,
  },
};
