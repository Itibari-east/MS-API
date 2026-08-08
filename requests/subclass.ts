import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _SubClassRequests = {
  subclasses: {
    list: () => `${base}/subclasses`,
    create: () => `${base}/subclasses`,
    byId: (publicId: string) => `${base}/subclasses/${publicId}`,
    status: (publicId: string) => `${base}/subclasses/${publicId}/status`,
  },
};
