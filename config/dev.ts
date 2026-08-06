export const DEV_BASE_URL = process.env.MS_DEV_BASE_URL || 'https://api-micro-dev.itibari.io';

export const SERVICE_ENDPOINTS = {
  userManagement: `${DEV_BASE_URL}/user-management-service`,
  inventoryManagement: `${DEV_BASE_URL}/inventory-management-service`,
  accountingService: `${DEV_BASE_URL}/api/v1`,
  commercials: `${DEV_BASE_URL}/commercials-service`,
};

export const ENDPOINTS = {
  health: {
    status: () => `${DEV_BASE_URL}/health`,
  },
  auth: {
    login: () => `${DEV_BASE_URL}/login`,
    forgotPassword: (username: string) =>
      `${DEV_BASE_URL}/login/forgetPassword?username=${encodeURIComponent(username)}`,
    mfa: {
      setup: () => `${DEV_BASE_URL}/auth/mfa/setup`,
      setupConfirm: () => `${DEV_BASE_URL}/auth/mfa/setup/confirm`,
      verify: () => `${DEV_BASE_URL}/auth/mfa/verify`,
    },
  },
};
