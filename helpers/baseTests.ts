import { test as baseTest } from '@playwright/test';
import { _common } from '../utils/common';
import { _HealthService } from '../services/health';
import { _AuthService } from '../services/authservice';
import { _AuthFlows } from '../services/authFlows';
import { _UserManagementService } from '../services/userManagement';
import { _UserManagementFlows } from '../services/userManagementFlows';
import { _InventoryManagementService } from '../services/inventoryManagement';
import { _InventoryManagementFlows } from '../services/inventoryManagementFlows';
import { SupplierApi } from '../services/supplier';

const test = baseTest.extend<{
  common: _common;
  healthService: _HealthService;
  auth: _AuthService;
  authFlows: _AuthFlows;
  userManagement: _UserManagementService;
  userManagementFlows: _UserManagementFlows;
  inventoryManagement: _InventoryManagementService;
  inventoryManagementFlows: _InventoryManagementFlows;
  supplierApi: SupplierApi;
}>({
  common: async ({}, use) => {
    await use(new _common());
  },
  healthService: async ({ request }, use) => {
    await use(new _HealthService(request));
  },
  auth: async ({}, use) => {
    await use(new _AuthService());
  },
  authFlows: async ({ auth }, use) => {
    await use(new _AuthFlows(auth));
  },
  userManagement: async ({}, use) => {
    await use(new _UserManagementService());
  },
  userManagementFlows: async ({ userManagement }, use) => {
    await use(new _UserManagementFlows(userManagement));
  },
  inventoryManagement: async ({}, use) => {
    await use(new _InventoryManagementService());
  },
  inventoryManagementFlows: async ({ inventoryManagement, userManagement }, use) => {
    await use(new _InventoryManagementFlows(inventoryManagement, userManagement));
  },
  supplierApi: async ({}, use) => {
    await use(new SupplierApi());
  },
});

export default test;
