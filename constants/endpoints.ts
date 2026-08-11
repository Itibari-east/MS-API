import {
  DocumentEntitySubTypes,
  DocumentEntityTypes,
  DocumentReferenceTypes,
  DocumentTypes,
} from './document';

export const endpoints = {
  auth: {
    login: '/login',
    forgotPassword: (username: string) =>
      `/login/forgetPassword?username=${encodeURIComponent(username)}`,
    mfa: {
      setup: '/auth/mfa/setup',
      setupConfirm: '/auth/mfa/setup/confirm',
      verify: '/auth/mfa/verify',
    },
  },
  health: '/health',
};

export const serviceConstants = {
  auth: {
    channel: {
      web: 'WEB',
    },
  },
  commercials: {
    uom: {
      status: {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      },
      type: {
        weight: 'Weight',
        volume: 'Volume',
        count: 'Count',
        length: 'Length',
        area: 'Area',
        other: 'Other',
      },
      allowedTypes: ['Weight', 'Volume', 'Count', 'Length', 'Area', 'Other'],
    },
    packageUnit: {
      status: {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      },
    },
    category: {
      status: {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      },
    },
  },
  document: {
    entityType: {
      user: DocumentEntityTypes.USER,
    },
    entitySubType: {
      profile: DocumentEntitySubTypes.PROFILE,
    },
    documentType: {
      kycDocument: DocumentTypes.KYC_DOCUMENT,
    },
    referenceType: {
      user: DocumentReferenceTypes.USER,
    },
  },
  accounting: {
    samples: {
      bankPublicId: '9c4c7e1e-613c-42df-b744-f60f20eb90d1',
    },
    bank: {
      country: 'Tanzania',
      status: {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      },
    },
    branch: {
      city: {
        arusha: 'Arusha',
        darEsSalaam: 'Dar es Salaam',
      },
    },
  },
  logistics: {
    deliveryAgent: {
      identificationType: {
        nationalId: 'NATIONAL_ID',
        passport: 'PASSPORT',
        tin: 'TIN',
      },
      status: {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
      },
    },
  },
} as const;
