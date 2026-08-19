import { expect } from '@playwright/test';
import test from '../../pos/helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { json, unique } from '../../helpers/testHelpers';

test.describe.configure({ mode: 'serial' });

function getPosAdminCredentials() {
  return {
    username: (process.env.POS_ADMIN_USERNAME || '').trim(),
    password: (process.env.POS_ADMIN_PASSWORD || '').trim(),
  };
}

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  if (Array.isArray(body?.content)) {
    return body.content as Array<Record<string, unknown>>;
  }

  if (Array.isArray(body?.data)) {
    return body.data as Array<Record<string, unknown>>;
  }

  return [];
}

function findUser(items: Array<Record<string, unknown>>, userName: string, contactEmail: string) {
  return items.find((item) => {
    const value = {
      userName: String(item?.userName ?? item?.username ?? item?.contactEmail ?? item?.email ?? ''),
      contactEmail: String(item?.contactEmail ?? item?.email ?? ''),
    };

    return value.userName === userName || value.contactEmail === contactEmail;
  });
}

function requirePublicId(item: Record<string, unknown> | undefined, label: string): string {
  const publicId = String(item?.publicId ?? item?.id ?? '').trim();
  expect(publicId, `${label} should include a publicId: ${JSON.stringify(item)}`).toBeTruthy();
  return publicId;
}

test.describe('@pos POS auth service', () => {
  test('logs in with POS admin credentials', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run POS tests.');

    const token = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    expect(token).toBeTruthy();
  });

  test('registers a POS user and logs in with the new credentials', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run POS tests.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const marker = unique('POS User');
    const userName = marker.replace(/\s+/g, '').toLowerCase();
    const contactEmail = `${userName}@itibari.io`;
    const payload = {
      firstName: marker,
      lastName: 'Automation',
      userName,
      contactEmail,
      contactPhoneNumber: `+2557${Date.now().toString().slice(-8)}`,
      password: 'Pos@12345',
      confirmPassword: 'Pos@12345',
      userNationalId: `POS-${Date.now()}`,
    };

    const createRes = await posService.createUser(adminToken, payload);
    expect(createRes.ok(), `create user failed: ${await createRes.text()}`).toBeTruthy();

    const loginToken = await posService.loginAndGetToken(payload.userName, payload.password, serviceConstants.auth.channel.pos);
    expect(loginToken).toBeTruthy();

    const listRes = await posService.listUsers(adminToken, {
      searchParam: userName,
      page: 0,
      size: 20,
      sort: 'firstName,ASC',
    });
    expect(listRes.ok(), `list users failed: ${await listRes.text()}`).toBeTruthy();

    const listBody = await json(listRes);
    const createdUser = findUser(listItems(listBody), payload.userName, payload.contactEmail);
    expect(createdUser, `created user should appear in list response: ${JSON.stringify(listBody)}`).toBeTruthy();
  });

  test('creates a profile and exposes the POS shop catalog', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run POS tests.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const marker = unique('POS Profile');
    const userName = marker.replace(/\s+/g, '').toLowerCase();
    const contactEmail = `${userName}@itibari.io`;

    const createUserRes = await posService.createUser(adminToken, {
      firstName: marker,
      lastName: 'Profile',
      userName,
      contactEmail,
      contactPhoneNumber: `+2557${Date.now().toString().slice(-8)}`,
      password: 'Pos@12345',
      confirmPassword: 'Pos@12345',
      userNationalId: `POS-${Date.now()}`,
    });
    expect(createUserRes.ok(), `create user failed: ${await createUserRes.text()}`).toBeTruthy();

    const usersRes = await posService.listUsers(adminToken, {
      searchParam: userName,
      page: 0,
      size: 20,
      sort: 'firstName,ASC',
    });
    expect(usersRes.ok(), `list users failed: ${await usersRes.text()}`).toBeTruthy();
    const usersBody = await json(usersRes);
    const createdUser = findUser(listItems(usersBody), userName, contactEmail);
    const userPublicId = requirePublicId(createdUser, 'created POS user');

    const profileRes = await posService.createProfile(adminToken, {
      userPublicId,
      name: `${marker} Shop`,
      country: 'TZ',
      traPin: 'TRA-123',
      timeZone: 'Africa/Dar_es_Salaam',
      baseCurrency: 'TZS',
    });
    expect(profileRes.ok(), `create profile failed: ${await profileRes.text()}`).toBeTruthy();

    const myShopRes = await posService.getMyShop(adminToken);
    expect(myShopRes.ok(), `myShop failed: ${await myShopRes.text()}`).toBeTruthy();
    const myShopBody = await json(myShopRes);
    expect(myShopBody, `myShop response should not be empty: ${JSON.stringify(myShopBody)}`).toBeTruthy();
  });

  test('creates subscriptions, roles, privileges, and assigns them to a POS user', async ({ posService }) => {
    const { username, password } = getPosAdminCredentials();
    test.skip(!username || !password, 'Set POS_ADMIN_USERNAME and POS_ADMIN_PASSWORD to run POS tests.');

    const adminToken = await posService.loginAndGetToken(username, password, serviceConstants.auth.channel.pos);
    const marker = unique('POS Access');
    const userName = marker.replace(/\s+/g, '').toLowerCase();
    const contactEmail = `${userName}@itibari.io`;

    const userRes = await posService.createUser(adminToken, {
      firstName: marker,
      lastName: 'Access',
      userName,
      contactEmail,
      contactPhoneNumber: `+2557${Date.now().toString().slice(-8)}`,
      password: 'Pos@12345',
      confirmPassword: 'Pos@12345',
      userNationalId: `POS-${Date.now()}`,
    });
    expect(userRes.ok(), `create user failed: ${await userRes.text()}`).toBeTruthy();

    const usersRes = await posService.listUsers(adminToken, {
      searchParam: userName,
      page: 0,
      size: 20,
      sort: 'firstName,ASC',
    });
    expect(usersRes.ok(), `list users failed: ${await usersRes.text()}`).toBeTruthy();
    const usersBody = await json(usersRes);
    const createdUser = findUser(listItems(usersBody), userName, contactEmail);
    const userPublicId = requirePublicId(createdUser, 'created POS user');

    const subscriptionRes = await posService.createSubscription(adminToken, {
      name: `${marker} Subscription`,
      description: 'Automation POS subscription',
      price: 10,
      subscriptionDefinitionList: [{ description: 'basic access' }],
    });
    expect(subscriptionRes.ok(), `create subscription failed: ${await subscriptionRes.text()}`).toBeTruthy();

    const roleRes = await posService.createRole(adminToken, {
      name: `${marker.replace(/\s+/g, '_').toUpperCase()}_ROLE`,
      description: 'Automation POS role',
    });
    expect(roleRes.ok(), `create role failed: ${await roleRes.text()}`).toBeTruthy();
    const roleBody = await json(roleRes);
    const rolePublicId = requirePublicId(roleBody, 'created POS role');

    const groupRes = await posService.createPrivilegeGroup(adminToken, {
      name: `${marker.replace(/\s+/g, '_').toUpperCase()}_GROUP`,
    });
    expect(groupRes.ok(), `create privilege group failed: ${await groupRes.text()}`).toBeTruthy();
    const groupBody = await json(groupRes);
    const privilegeGroupPublicId = requirePublicId(groupBody, 'created POS privilege group');

    const privilegeRes = await posService.createPrivilege(adminToken, {
      name: `${marker.replace(/\s+/g, '_').toUpperCase()}_VIEW`,
      privilegeGroupPublicId,
    });
    expect(privilegeRes.ok(), `create privilege failed: ${await privilegeRes.text()}`).toBeTruthy();
    const privilegeBody = await json(privilegeRes);
    const privilegePublicId = requirePublicId(privilegeBody, 'created POS privilege');

    const assignPrivilegeGroupRes = await posService.assignPrivilegesToGroup(adminToken, privilegeGroupPublicId, {
      privilegePublicIds: [privilegePublicId],
    });
    expect(assignPrivilegeGroupRes.ok(), `assign privileges to group failed: ${await assignPrivilegeGroupRes.text()}`).toBeTruthy();

    const assignRoleGroupRes = await posService.assignPrivilegeGroupsToRole(adminToken, rolePublicId, {
      privilegeGroupPublicIds: [privilegeGroupPublicId],
    });
    expect(assignRoleGroupRes.ok(), `assign privilege groups to role failed: ${await assignRoleGroupRes.text()}`).toBeTruthy();

    const assignRolePrivilegeRes = await posService.assignPrivilegesToRole(adminToken, rolePublicId, {
      privilegeUUIDs: [privilegePublicId],
    });
    expect(assignRolePrivilegeRes.ok(), `assign privileges to role failed: ${await assignRolePrivilegeRes.text()}`).toBeTruthy();

    const assignUserRolesRes = await posService.assignRolesToUser(adminToken, userPublicId, {
      rolePublicIds: [rolePublicId],
    });
    expect(assignUserRolesRes.ok(), `assign roles to user failed: ${await assignUserRolesRes.text()}`).toBeTruthy();

    const userRolesRes = await posService.getUserRoles(adminToken, userPublicId, {
      page: 0,
      size: 20,
      sort: 'name,ASC',
    });
    expect(userRolesRes.ok(), `get user roles failed: ${await userRolesRes.text()}`).toBeTruthy();

    const userPrivilegesRes = await posService.getUserPrivileges(adminToken, userPublicId, {
      page: 0,
      size: 20,
      sort: 'name,ASC',
    });
    expect(userPrivilegesRes.ok(), `get user privileges failed: ${await userPrivilegesRes.text()}`).toBeTruthy();
  });
});
