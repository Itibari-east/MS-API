import 'dotenv/config';
import { DEV_BASE_URL, SERVICE_ENDPOINTS } from './dev';
import { _prod } from './prod';
import { _users } from './users';
import { joinUrl, normalizeBaseUrl } from '../utils/url';

interface Config {
  baseEndpoint: string;
  serviceEndpoints: {
    userManagement: string;
    inventoryManagement: string;
    accountingService: string;
    commercials: string;
    documentService: string;
  };
  email: string;
  password: string;
}
const DEV = 'DEV';
const PROD = 'PRODUCTION';
const ENV = process.env.ENVIRONMENT || DEV;

let _config: Config = {
  baseEndpoint: '',
  serviceEndpoints: {
    userManagement: '',
    inventoryManagement: '',
    accountingService: '',
    commercials: '',
    documentService: '',
  },
  email: '',
  password: '',
};
if (ENV.toUpperCase() === DEV) {
  _config = {
    baseEndpoint: DEV_BASE_URL,
    serviceEndpoints: SERVICE_ENDPOINTS,
    email: _users.common.email,
    password: _users.common.password,
  };
  } else if (ENV.toUpperCase() === PROD) {
  const prodBaseUrl = normalizeBaseUrl(_prod.common.BASE_URL);
  _config = {
      baseEndpoint: prodBaseUrl,
      serviceEndpoints: {
        userManagement: joinUrl(prodBaseUrl, 'user-management-service'),
        inventoryManagement: joinUrl(prodBaseUrl, 'inventory-management-service'),
        accountingService: joinUrl(prodBaseUrl, 'accounting-service'),
        commercials: joinUrl(prodBaseUrl, 'commercials-service'),
        documentService: joinUrl(prodBaseUrl),
      },
      email: process.env.MS_USER_EMAIL || 'd.chirchir@itibari.io',
      password: process.env.MS_USER_PASSWORD || 'Silot777@',
  };
} else {
  throw new Error(`Unknown ENVIRONMENT: ${ENV}`);
}

export default _config;
