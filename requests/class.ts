import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _ClassRequests = {
  classes: {
    list: () => `${base}/classes`,
    create: () => `${base}/classes`,
    byId: (publicId: string) => `${base}/classes/${publicId}`,
    status: (publicId: string) => `${base}/classes/${publicId}/status`,
  },
};
