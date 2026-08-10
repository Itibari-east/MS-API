import { joinUrl, normalizeBaseUrl } from '../utils/url';

export const DEV_BASE_URL = normalizeBaseUrl(process.env.MS_DEV_BASE_URL || 'https://api-micro-dev.itibari.io');

export const SERVICE_ENDPOINTS = {
  userManagement: joinUrl(DEV_BASE_URL, 'user-management-service'),
  inventoryManagement: joinUrl(DEV_BASE_URL, 'inventory-management-service'),
  accountingService: joinUrl(DEV_BASE_URL, 'api/v1'),
  commercials: joinUrl(DEV_BASE_URL, 'commercials-service'),
  documentService: joinUrl(DEV_BASE_URL),
};

export const ENDPOINTS = {
  health: {
    status: () => joinUrl(DEV_BASE_URL, 'health'),
  },
  auth: {
    login: () => joinUrl(DEV_BASE_URL, 'api/v1', 'login'),
    forgotPassword: (username: string) =>
      `${joinUrl(DEV_BASE_URL, 'api/v1', 'login/forgetPassword')}?username=${encodeURIComponent(username)}`,
    mfa: {
      setup: () => joinUrl(DEV_BASE_URL, 'api/v1', 'auth/mfa/setup'),
      setupConfirm: () => joinUrl(DEV_BASE_URL, 'api/v1', 'auth/mfa/setup/confirm'),
      verify: () => joinUrl(DEV_BASE_URL, 'api/v1', 'auth/mfa/verify'),
    },
  },
};
