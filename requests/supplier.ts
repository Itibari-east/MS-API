import _config from '../config/config';

const base = _config.serviceEndpoints.commercials;

export const _SupplierRequests = {
  suppliers: {
    list: () => `${base}/suppliers`,
    createDraft: () => `${base}/suppliers`,
    byId: (publicId: string) => `${base}/suppliers/${publicId}`,
    confirm: (publicId: string) => `${base}/suppliers/${publicId}/confirm`,
    portalAccess: (publicId: string) => `${base}/suppliers/${publicId}/portal-access`,
    deactivate: (publicId: string) => `${base}/suppliers/${publicId}/deactivate`,
    bulkDeactivate: () => `${base}/suppliers/deactivate`,
    contact: (publicId: string) => `${base}/suppliers/${publicId}/contact`,
    pointsOfContact: (publicId: string) => `${base}/suppliers/${publicId}/points-of-contact`,
    secondaryContact: (publicId: string) => `${base}/suppliers/${publicId}/points-of-contact/secondary`,
    businessTerms: (publicId: string) => `${base}/suppliers/${publicId}/business-terms`,
    bankAccounts: (publicId: string) => `${base}/suppliers/${publicId}/bank-accounts`,
    mobileMoneyAccounts: (publicId: string) => `${base}/suppliers/${publicId}/mobile-money-accounts`,
    additional: (publicId: string) => `${base}/suppliers/${publicId}/additional`,
    documents: (publicId: string) => `${base}/suppliers/${publicId}/documents`,
    activities: (publicId: string) => `${base}/suppliers/${publicId}/activities`,
  },
};
