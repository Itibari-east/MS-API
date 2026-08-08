import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _CategoryRequests = {
  categories: {
    list: () => `${base}/categories`,
    create: () => `${base}/categories`,
    byId: (publicId: string) => `${base}/categories/${publicId}`,
    status: (publicId: string) => `${base}/categories/${publicId}/status`,
  },
};
