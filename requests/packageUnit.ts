import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _PackageUnitRequests = {
  packageUnits: {
    list: () => `${base}/packaging-units`,
    create: () => `${base}/packaging-units`,
    byId: (publicId: string) => `${base}/packaging-units/${publicId}`,
    status: (publicId: string) => `${base}/packaging-units/${publicId}/status`,
  },
};
