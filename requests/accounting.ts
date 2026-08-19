import _config from '../config/config';

const base = _config.serviceEndpoints.accountingService;

export const _AccountingRequests = {
  taxes: {
    kinds: () => `${base}/taxes/tax-code-kinds`,
    list: () => `${base}/taxes/tax-codes`,
    create: () => `${base}/taxes/tax-codes`,
    byId: (publicId: string) => `${base}/taxes/tax-codes/${publicId}`,
  },
  banks: {
    list: () => `${base}/banks`,
    create: () => `${base}/banks`,
    byId: (publicId: string) => `${base}/banks/${publicId}`,
    status: (publicId: string) => `${base}/banks/${publicId}/status`,
    branches: (publicId: string) => `${base}/banks/${publicId}/branches`,
    branchById: (publicId: string, branchPublicId: string) => `${base}/banks/${publicId}/branches/${branchPublicId}`,
  },
  supplierBankAccounts: {
    replace: (supplierPublicId: string) => `${base}/suppliers/${supplierPublicId}/bank-accounts`,
  },
};
