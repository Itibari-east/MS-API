import _config from '../config/config';

const base = _config.serviceEndpoints.orderService;

export const _OrderServiceRequests = {
  salesAgents: {
    list: () => `${base}/salesAgents`,
    create: () => `${base}/salesAgents`,
    byId: (publicId: string) => `${base}/salesAgents/${publicId}`,
    status: (publicId: string) => `${base}/salesAgents/${publicId}/actions`,
    visits: (publicId: string) => `${base}/salesAgents/${publicId}/visits`,
    visitsExport: (publicId: string) => `${base}/salesAgents/${publicId}/visits/export`,
    visitKpis: (publicId: string) => `${base}/salesAgents/${publicId}/visit-kpis`,
    visitSummaries: () => `${base}/salesAgents/visits`,
    visitSummariesExport: () => `${base}/salesAgents/visits/export`,
    profile: () => `${base}/salesAgents/myProfile`,
  },
};
