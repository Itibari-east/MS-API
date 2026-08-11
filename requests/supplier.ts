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
    documents: {
      list: (publicId: string) => `${base}/suppliers/${publicId}/documents`,
      upload: (publicId: string) => `${base}/suppliers/${publicId}/documents`,
      renewalReminder: (publicId: string, documentPublicId: string) =>
        `${base}/suppliers/${publicId}/documents/${documentPublicId}/renewal-reminder`,
      view: (publicId: string, documentPublicId: string) =>
        `${base}/suppliers/${publicId}/documents/${documentPublicId}/view`,
      download: (publicId: string, documentPublicId: string) =>
        `${base}/suppliers/${publicId}/documents/${documentPublicId}/download`,
      export: (publicId: string) => `${base}/suppliers/${publicId}/documents/export`,
    },
    activities: (publicId: string) => `${base}/suppliers/${publicId}/activities`,
    products: {
      list: (publicId: string) => `${base}/suppliers/${publicId}/products`,
      summary: (publicId: string) => `${base}/suppliers/${publicId}/products/summary`,
    },
    documentLibrary: {
      list: (publicId: string) => `${base}/suppliers/${publicId}/documents`,
    },
    rebates: {
      list: (publicId: string) => `${base}/suppliers/${publicId}/rebates`,
      agreement: (publicId: string, rebatePublicId: string) =>
        `${base}/suppliers/${publicId}/rebates/${rebatePublicId}/agreement`,
      export: (publicId: string) => `${base}/suppliers/${publicId}/rebates/export`,
      summary: (publicId: string) => `${base}/suppliers/${publicId}/rebates/summary`,
    },
    purchaseOrders: {
      list: (publicId: string) => `${base}/suppliers/${publicId}/purchase-orders`,
      summary: (publicId: string) => `${base}/suppliers/${publicId}/purchase-orders/summary`,
      export: (publicId: string) => `${base}/suppliers/${publicId}/purchase-orders/export`,
    },
    performance: {
      summary: (publicId: string) => `${base}/suppliers/${publicId}/performance/summary`,
      responsiveness: (publicId: string) => `${base}/suppliers/${publicId}/performance/responsiveness`,
      quality: (publicId: string) => `${base}/suppliers/${publicId}/performance/quality`,
      orderStatus: (publicId: string) => `${base}/suppliers/${publicId}/performance/order-status`,
      leadDays: (publicId: string) => `${base}/suppliers/${publicId}/performance/lead-days`,
      deliverySeries: (publicId: string) => `${base}/suppliers/${publicId}/performance/delivery-series`,
      deliveries: (publicId: string) => `${base}/suppliers/${publicId}/performance/deliveries`,
    },
    reports: {
      export: () => `${base}/supplierReports/export`,
      dashboard: {
        summary: () => `${base}/supplier-reports/performance/summary`,
        suppliers: () => `${base}/supplier-reports/performance/suppliers`,
        categories: () => `${base}/supplier-reports/performance/categories`,
        ranking: () => `${base}/supplier-reports/performance/ranking`,
        trend: () => `${base}/supplier-reports/performance/trend`,
        export: () => `${base}/supplier-reports/performance/export`,
      },
    },
  },
};
