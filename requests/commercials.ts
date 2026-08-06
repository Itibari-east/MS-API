import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _CommercialsRequests = {
  uoms: {
    list: () => `${base}/uoms`,
    create: () => `${base}/uoms`,
    byId: (publicId: string) => `${base}/uoms/${publicId}`,
    status: (publicId: string) => `${base}/uoms/${publicId}/status`,
    deactivate: (publicId: string) => `${base}/uoms/${publicId}/deactivate`,
  },
};
