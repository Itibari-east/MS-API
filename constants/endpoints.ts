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
} as const;
