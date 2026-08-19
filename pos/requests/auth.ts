import _config from '../../config/config';

const base = _config.serviceEndpoints.pos;

export const _PosRequests = {
  authentication: {
    login: () => `${base}/login`,
    resetPassword: () => `${base}/login/resetPassword`,
    googleLogin: () => `${base}/login/google`,
    forgotPassword: (username: string) =>
      `${base}/login/forgetPassword?username=${encodeURIComponent(username)}`,
  },
  users: {
    list: () => `${base}/users`,
    create: () => `${base}/users`,
    byId: (publicId: string) => `${base}/users/${publicId}`,
    byChildShop: (parentTenantId: string, childShopId: string) =>
      `${base}/users/${parentTenantId}/${childShopId}`,
    roles: (userId: string) => `${base}/users/${userId}/roles`,
    privileges: (userId: string) => `${base}/users/${userId}/privileges`,
  },
  subscriptions: {
    list: () => `${base}/subscription`,
    create: () => `${base}/subscription`,
  },
  roles: {
    list: () => `${base}/roles`,
    create: () => `${base}/roles`,
    privilegeGroups: (rolePublicId: string) => `${base}/roles/${rolePublicId}/privilege-groups`,
    assignPrivileges: (rolePublicId: string) => `${base}/roles/assignPrivilegeToRole/${rolePublicId}`,
  },
  privileges: {
    list: () => `${base}/privileges`,
    create: () => `${base}/privileges`,
    groups: (groupPublicId: string) => `${base}/privilege-groups/${groupPublicId}/privileges`,
  },
  privilegeGroups: {
    list: () => `${base}/privilege-groups`,
    create: () => `${base}/privilege-groups`,
  },
  institutions: {
    list: () => `${base}/institutions`,
    createProfile: () => `${base}/institutions`,
    myShop: () => `${base}/institutions/myShop`,
    childShop: (parentTenantId: string) => `${base}/institutions/${parentTenantId}/childShop`,
    addNotification: (institutionPublicId: string) => `${base}/institutions/${institutionPublicId}/addNotification`,
    notificationPreference: (institutionId: string) => `${base}/institutions/${institutionId}/notification-preference`,
    updatePaymentAndSubscription: (subscriptionId: string) =>
      `${base}/institutions/updatePaymentAndSubscription/${subscriptionId}`,
  },
};
