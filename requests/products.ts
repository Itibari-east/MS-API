import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _ProductRequests = {
  products: {
    list: () => `${base}/products`,
    create: () => `${base}/products`,
    byId: (publicId: string) => `${base}/products/${publicId}`,
    approve: (publicId: string) => `${base}/products/${publicId}/approve`,
    bestSeller: (publicId: string) => `${base}/products/${publicId}/best-seller`,
    status: (publicId: string) => `${base}/products/${publicId}/status`,
    approvals: () => `${base}/products/approvals`,
    export: () => `${base}/products/export`,
  },
};
