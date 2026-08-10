import _config from '../config/config';

const base = _config.serviceEndpoints.documentService;

export const _DocumentRequests = {
  files: {
    upload: () => `${base}/files/upload`,
    list: () => `${base}/files`,
    byId: (publicId: string) => `${base}/files/${publicId}`,
  },
  documentRules: {
    list: () => `${base}/documentRules`,
    create: () => `${base}/documentRules`,
    byPublicId: (publicId: string) => `${base}/documentRules/publicId?publicId=${encodeURIComponent(publicId)}`,
  },
  events: {
    byReferenceId: (referenceId: string) => `${base}/events/${referenceId}`,
  },
};
