import 'dotenv/config';
import { DEV_BASE_URL, SERVICE_ENDPOINTS } from './dev';
import { _prod } from './prod';
import { _users } from './users';

interface Config {
  baseEndpoint: string;
  serviceEndpoints: {
    userManagement: string;
    inventoryManagement: string;
    commercials: string;
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
    commercials: '',
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
  _config = {
    baseEndpoint: _prod.common.BASE_URL,
    serviceEndpoints: {
      userManagement: `${_prod.common.BASE_URL}/user-management-service`,
      inventoryManagement: `${_prod.common.BASE_URL}/inventory-management-service`,
      commercials: `${_prod.common.BASE_URL}/commercials-service`,
    },
    email: process.env.MS_USER_EMAIL || 'd.chirchir@itibari.io',
    password: process.env.MS_USER_PASSWORD || 'Silot777@',
  };
} else {
  throw new Error(`Unknown ENVIRONMENT: ${ENV}`);
}

export default _config;
