import _config from '../config/config';

const base = _config.serviceEndpoints.userManagement;

export const _UserManagementRequests = {
  users: {
    list: () => `${base}/users`,
    create: () => `${base}/users`,
    byId: (publicId: string) => `${base}/users/${publicId}`,
    current: () => `${base}/users/currentUser`,
    roles: (publicId: string) => `${base}/users/${publicId}/roles`,
    resetPassword: (publicId: string) => `${base}/users/${publicId}/resetPassword`,
    lock: (publicId: string) => `${base}/users/${publicId}/lock`,
  },
  userActivityLogs: {
    byUser: (userPublicId: string) => `${base}/userActivityLogs/${userPublicId}`,
  },
  roles: {
    list: () => `${base}/roles`,
    create: () => `${base}/roles`,
    byId: (publicId: string) => `${base}/roles/${publicId}`,
    privileges: (publicId: string) => `${base}/roles/${publicId}/privileges`,
  },
  rejectionCodes: {
    list: () => `${base}/rejection-codes`,
    create: () => `${base}/rejection-codes`,
    byId: (publicId: string) => `${base}/rejection-codes/${publicId}`,
  },
  permissions: {
    groups: {
      list: () => `${base}/permissions/groups`,
      create: () => `${base}/permissions/groups`,
      byId: (publicId: string) => `${base}/permissions/groups/${publicId}`,
    },
    privileges: {
      list: () => `${base}/permissions/privileges`,
      create: () => `${base}/permissions/privileges`,
      byId: (publicId: string) => `${base}/permissions/privileges/${publicId}`,
    },
  },
  locations: {
    countries: {
      list: () => `${base}/countries`,
      create: () => `${base}/countries`,
      byId: (publicId: string) => `${base}/countries/${publicId}`,
    },
    regions: {
      list: () => `${base}/regions`,
      byId: (publicId: string) => `${base}/regions/${publicId}`,
    },
    cities: {
      list: () => `${base}/cities`,
      create: () => `${base}/cities`,
      byId: (publicId: string) => `${base}/cities/${publicId}`,
    },
    branches: {
      list: () => `${base}/branches`,
      create: () => `${base}/branches`,
      byId: (publicId: string) => `${base}/branches/${publicId}`,
    },
    departments: {
      list: () => `${base}/departments`,
      create: () => `${base}/departments`,
      byId: (publicId: string) => `${base}/departments/${publicId}`,
    },
  },
};
