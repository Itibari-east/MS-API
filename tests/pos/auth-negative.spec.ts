import { expect } from '@playwright/test';
import test from '../../pos/helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { common } from '../../utils/common';
import { _PosRequests } from '../../pos/requests/auth';

function getPosAdminCredentials() {
  return {
    username: (process.env.POS_ADMIN_USERNAME || '').trim(),
    password: (process.env.POS_ADMIN_PASSWORD || '').trim(),
  };
}

function expectClientError(status: number, label: string, allowed: number[] = [400, 401, 403, 404, 422]) {
  expect(allowed, `${label} should fail with a client error, got ${status}`).toContain(status);
}

test.describe.configure({ mode: 'serial' });

test.describe('@pos POS auth negative scenarios', () => {
  test('rejects invalid POS login credentials', async ({ posService }) => {
    const response = await posService.login('invalid-user@example.com', 'bad-password', serviceConstants.auth.channel.pos);
    expectClientError(response.status(), 'invalid POS login');
  });

  test('rejects login requests with missing required fields', async ({ posService }) => {
    const response = await posService.login('', '', serviceConstants.auth.channel.pos);
    expectClientError(response.status(), 'missing login fields');
  });

  test('rejects unauthenticated access to the users endpoint', async () => {
    const response = await common.getResponse(_PosRequests.users.list());
    expectClientError(response.status(), 'unauthenticated users list');
  });

  test('rejects invalid google login tokens', async ({ posService }) => {
    const response = await posService.loginWithGoogle('invalid-google-token');
    expectClientError(response.status(), 'invalid google login');
  });

  test('rejects malformed reset password requests', async ({ posService }) => {
    const response = await posService.resetPassword('', '', '', '');
    expectClientError(response.status(), 'malformed reset password request');
  });

  test('rejects malformed user creation payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createUser(adminToken, {
      firstName: '',
      lastName: '',
      userName: '',
      contactEmail: '',
      contactPhoneNumber: '',
      password: '',
      confirmPassword: '',
    });
    expectClientError(response.status(), 'malformed create user payload');
  });
});

test.describe('@pos POS resource negative scenarios', () => {
  test('rejects invalid bearer tokens on the users listing endpoint', async ({ posService }) => {
    const response = await posService.listUsers('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on users list', [401, 403]);
  });

  test('rejects invalid bearer tokens on the roles listing endpoint', async ({ posService }) => {
    const response = await posService.listRoles('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on roles list', [401, 403]);
  });

  test('rejects invalid bearer tokens on the privilege listing endpoint', async ({ posService }) => {
    const response = await posService.listPrivileges('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on privileges list', [401, 403]);
  });

  test('rejects invalid bearer tokens on the institutions listing endpoint', async ({ posService }) => {
    const response = await posService.listInstitutions('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on institutions list', [401, 403]);
  });

  test('rejects invalid bearer tokens on the subscriptions listing endpoint', async ({ posService }) => {
    const response = await posService.listSubscriptions('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on subscriptions list', [401, 403]);
  });

  test('rejects invalid bearer tokens on my shop lookup', async ({ posService }) => {
    const response = await posService.getMyShop('bad-token');
    expectClientError(response.status(), 'invalid bearer token on my shop lookup', [401, 403]);
  });

  test('rejects invalid bearer tokens on the user roles endpoint', async ({ posService }) => {
    const response = await posService.getUserRoles('bad-token', '00000000-0000-0000-0000-000000000000', {
      page: 0,
      size: 10,
    });
    expectClientError(response.status(), 'invalid bearer token on user roles lookup', [401, 403]);
  });

  test('rejects invalid bearer tokens on the user privileges endpoint', async ({ posService }) => {
    const response = await posService.getUserPrivileges('bad-token', '00000000-0000-0000-0000-000000000000', {
      page: 0,
      size: 10,
    });
    expectClientError(response.status(), 'invalid bearer token on user privileges lookup', [401, 403]);
  });

  test('rejects invalid bearer tokens on the privilege groups listing endpoint', async ({ posService }) => {
    const response = await posService.listPrivilegeGroups('bad-token', { page: 0, size: 10 });
    expectClientError(response.status(), 'invalid bearer token on privilege groups list', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create user endpoint', async ({ posService }) => {
    const response = await posService.createUser('bad-token', {
      firstName: 'Bad',
      lastName: 'Token',
      userName: 'badtokenuser',
      contactEmail: 'badtokenuser@itibari.io',
      contactPhoneNumber: '+255700000001',
      password: 'Pos@12345',
      confirmPassword: 'Pos@12345',
      userNationalId: 'BAD-TOKEN-USER',
    });
    expectClientError(response.status(), 'invalid bearer token on create user', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create role endpoint', async ({ posService }) => {
    const response = await posService.createRole('bad-token', { name: 'BAD_ROLE' });
    expectClientError(response.status(), 'invalid bearer token on create role', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create privilege group endpoint', async ({ posService }) => {
    const response = await posService.createPrivilegeGroup('bad-token', { name: 'BAD_GROUP' });
    expectClientError(response.status(), 'invalid bearer token on create privilege group', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create privilege endpoint', async ({ posService }) => {
    const response = await posService.createPrivilege('bad-token', {
      name: 'BAD_PRIVILEGE',
      privilegeGroupPublicId: '00000000-0000-0000-0000-000000000000',
    });
    expectClientError(response.status(), 'invalid bearer token on create privilege', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create subscription endpoint', async ({ posService }) => {
    const response = await posService.createSubscription('bad-token', {
      name: 'Bad Subscription',
      description: 'negative test',
      price: 1,
      subscriptionDefinitionList: [{ description: 'basic' }],
    });
    expectClientError(response.status(), 'invalid bearer token on create subscription', [401, 403]);
  });

  test('rejects invalid bearer tokens on the create profile endpoint', async ({ posService }) => {
    const response = await posService.createProfile('bad-token', {
      userPublicId: '00000000-0000-0000-0000-000000000000',
      name: 'Bad Profile',
      country: 'TZ',
      traPin: 'TRA-NEGATIVE',
      timeZone: 'Africa/Dar_es_Salaam',
      baseCurrency: 'TZS',
    });
    expectClientError(response.status(), 'invalid bearer token on create profile', [401, 403]);
  });

  test('rejects invalid bearer tokens on the child shop endpoint', async ({ posService }) => {
    const response = await posService.createChildShop('bad-token', '00000000-0000-0000-0000-000000000000', {
      name: 'Bad Child Shop',
      country: 'TZ',
      traPin: 'TRA-NEGATIVE',
      timeZone: 'Africa/Dar_es_Salaam',
      baseCurrency: 'TZS',
    });
    expectClientError(response.status(), 'invalid bearer token on child shop creation', [401, 403]);
  });

  test('rejects invalid bearer tokens on the notification update endpoint', async ({ posService }) => {
    const response = await posService.addNotification('bad-token', '00000000-0000-0000-0000-000000000000', {
      subscriptionPaymentList: [],
      marketingList: [],
    });
    expectClientError(response.status(), 'invalid bearer token on notification update', [401, 403]);
  });

  test('rejects invalid bearer tokens on the notification preferences endpoint', async ({ posService }) => {
    const response = await posService.listNotificationPreferences('bad-token', '00000000-0000-0000-0000-000000000000');
    expectClientError(response.status(), 'invalid bearer token on notification preferences', [401, 403]);
  });

  test('rejects invalid bearer tokens on the payment and subscription update endpoint', async ({ posService }) => {
    const response = await posService.updatePaymentAndSubscription('bad-token', '00000000-0000-0000-0000-000000000000');
    expectClientError(response.status(), 'invalid bearer token on payment and subscription update', [401, 403]);
  });

  test('rejects invalid user ids when fetching a user by public id', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.getUserByPublicId(adminToken, '00000000-0000-0000-0000-000000000000');
    expectClientError(response.status(), 'invalid user public id lookup');
  });

  test('rejects malformed role creation payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createRole(adminToken, { name: '' });
    expectClientError(response.status(), 'malformed role creation payload');
  });

  test('rejects malformed privilege group creation payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createPrivilegeGroup(adminToken, { name: '' });
    expectClientError(response.status(), 'malformed privilege group creation payload');
  });

  test('rejects malformed privilege creation payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createPrivilege(adminToken, { name: '' });
    expectClientError(response.status(), 'malformed privilege creation payload');
  });

  test('rejects malformed create profile payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createProfile(adminToken, {
      userPublicId: '',
      name: '',
    });
    expectClientError(response.status(), 'malformed create profile payload');
  });

  test('rejects malformed child shop payloads for an invalid parent tenant', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createChildShop(adminToken, '00000000-0000-0000-0000-000000000000', {
      name: '',
      country: '',
      traPin: '',
      timeZone: '',
      baseCurrency: '',
    });
    expectClientError(response.status(), 'malformed child shop payload');
  });

  test('rejects malformed create user under child shop payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.getUsersByChildShop(
      adminToken,
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000000',
    );
    expectClientError(response.status(), 'invalid child shop user creation');
  });

  test('rejects invalid user-role assignments for missing users', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.assignRolesToUser(adminToken, '00000000-0000-0000-0000-000000000000', {
      rolePublicIds: ['00000000-0000-0000-0000-000000000000'],
    });
    expectClientError(response.status(), 'invalid user-role assignment');
  });

  test('rejects invalid privilege group assignments for missing groups', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.assignPrivilegesToGroup(adminToken, '00000000-0000-0000-0000-000000000000', {
      privilegePublicIds: ['00000000-0000-0000-0000-000000000000'],
    });
    expectClientError(response.status(), 'invalid privilege group assignment');
  });

  test('rejects invalid privilege-to-role assignments for missing roles', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.assignPrivilegesToRole(adminToken, '00000000-0000-0000-0000-000000000000', {
      privilegeUUIDs: ['00000000-0000-0000-0000-000000000000'],
    });
    expectClientError(response.status(), 'invalid privilege-to-role assignment');
  });

  test('rejects malformed privilege-group assignment payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.assignPrivilegeGroupsToRole(adminToken, '00000000-0000-0000-0000-000000000000', {
      privilegeGroupPublicIds: [],
    });
    expectClientError(response.status(), 'malformed privilege-group assignment payload');
  });

  test('rejects invalid notification updates for missing institutions', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.addNotification(adminToken, '00000000-0000-0000-0000-000000000000', {
      subscriptionPaymentList: [],
      marketingList: [],
    });
    expectClientError(response.status(), 'invalid notification update');
  });

  test('rejects invalid notification preference lookups for missing institutions', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.listNotificationPreferences(adminToken, '00000000-0000-0000-0000-000000000000');
    expectClientError(response.status(), 'invalid notification preference lookup');
  });

  test('rejects invalid payment and subscription updates for missing subscription ids', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.updatePaymentAndSubscription(adminToken, '00000000-0000-0000-0000-000000000000');
    expectClientError(response.status(), 'invalid payment and subscription update');
  });

  test('rejects malformed subscription creation payloads', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run admin-gated POS negatives.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const response = await posService.createSubscription(adminToken, {
      name: '',
      description: '',
      price: -1,
      subscriptionDefinitionList: [],
    });
    expectClientError(response.status(), 'malformed subscription creation payload');
  });
});
