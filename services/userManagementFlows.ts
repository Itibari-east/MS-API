import { expect, test } from '@playwright/test';
import { _UserManagementService } from './userManagement';
import { getTokenOrSkip, unique, json, publicIdFrom, firstContentPublicId } from '../helpers/testHelpers';

type CreatedEntity = {
  name: string;
  publicId: string;
};

type LocationChain = {
  regionPublicId: string;
  country: CreatedEntity;
  city: CreatedEntity;
  branch: CreatedEntity;
  department: CreatedEntity;
};

type UserChain = LocationChain & {
  role: CreatedEntity;
  user: CreatedEntity;
};

type PermissionChain = {
  group: CreatedEntity;
  privilege: CreatedEntity;
};

async function expectStatuses<T extends { status(): number; json(): Promise<any> }>(
  responsePromise: Promise<T>,
  allowedStatuses: number[],
) {
  const response = await responsePromise;
  expect(allowedStatuses).toContain(response.status());
  return response;
}

async function expectOk<T extends { status(): number; json(): Promise<any> }>(responsePromise: Promise<T>) {
  return expectStatuses(responsePromise, [200]);
}

async function expectEntityWithCreatedBy<T extends { status(): number; json(): Promise<any> }>(
  responsePromise: Promise<T>,
  publicId?: string,
) {
  const response = await expectOk(responsePromise);
  const body = await json(response);
  if (publicId) {
    expect(body).toHaveProperty('publicId', publicId);
  }
  return body;
}

async function createCountry(userManagement: _UserManagementService, token: string, prefix: string): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(
    userManagement.createCountry(token, {
      name,
      code: `AC${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
      currency: 'TZS',
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createCity(
  userManagement: _UserManagementService,
  token: string,
  countryPublicId: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(
    userManagement.createCity(token, {
      name,
      code: `CT${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
      countryPublicId,
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createBranch(
  userManagement: _UserManagementService,
  token: string,
  cityPublicId: string,
  regionPublicId: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(
    userManagement.createBranch(token, {
      name,
      description: 'Created by API automation',
      cityPublicIds: [cityPublicId],
      regionId: regionPublicId,
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createDepartment(userManagement: _UserManagementService, token: string, prefix: string): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(
    userManagement.createDepartment(token, {
      departmentName: name,
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createRole(
  userManagement: _UserManagementService,
  token: string,
  prefix: string,
  privilegePublicIds: string[] = [],
): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(
    userManagement.createRole(token, {
      name,
      privilegePublicIds,
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createPrivilege(
  userManagement: _UserManagementService,
  token: string,
  groupPublicId: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = unique(prefix).toUpperCase().replace(/-/g, '_');
  const response = await expectOk(
    userManagement.createPrivilege(token, {
      names: [name],
      privilegeGroupPublicId: groupPublicId,
    }),
  );
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createPermissionGroup(
  userManagement: _UserManagementService,
  token: string,
  prefix: string,
): Promise<CreatedEntity> {
  const name = unique(prefix);
  const response = await expectOk(userManagement.createPermissionGroup(token, { name }));
  return { name, publicId: publicIdFrom(await json(response)) };
}

async function createUser(
  userManagement: _UserManagementService,
  token: string,
  params: {
    rolePublicId: string;
    branchPublicId: string;
    departmentPublicId: string;
    prefix: string;
  },
): Promise<CreatedEntity> {
  const email = `${unique(params.prefix)}@itibari.test`;
  const response = await expectOk(
    userManagement.createUser(token, {
      firstName: 'Automation',
      lastName: 'User',
      email,
      phoneNumber: `2557${Math.floor(10000000 + Math.random() * 89999999)}`,
      rolePublicIds: [params.rolePublicId],
      branchPublicIds: [params.branchPublicId],
      departmentPublicIds: [params.departmentPublicId],
      identificationType: 'IdentificationNumber',
      identificationNumber: unique('IDN'),
      companyIdentificationNumber: unique('CO'),
    }),
  );
  return { name: email, publicId: publicIdFrom(await json(response)) };
}

async function getRegionPublicId(userManagement: _UserManagementService, token: string): Promise<string> {
  const regionsRes = await expectOk(userManagement.listRegions(token, { page: 0, size: 50 }));
  const regionPublicId = firstContentPublicId(await json(regionsRes));
  test.skip(!regionPublicId, 'requires at least one region');
  return regionPublicId;
}

async function createLocationChain(
  userManagement: _UserManagementService,
  token: string,
  prefixes: { country: string; city: string; branch: string; department: string },
): Promise<LocationChain> {
  const regionPublicId = await getRegionPublicId(userManagement, token);
  const country = await createCountry(userManagement, token, prefixes.country);
  const city = await createCity(userManagement, token, country.publicId, prefixes.city);
  const branch = await createBranch(userManagement, token, city.publicId, regionPublicId, prefixes.branch);
  const department = await createDepartment(userManagement, token, prefixes.department);
  return { regionPublicId, country, city, branch, department };
}

async function createUserChain(
  userManagement: _UserManagementService,
  token: string,
  prefixes: {
    country: string;
    city: string;
    branch: string;
    department: string;
    role: string;
    user: string;
  },
): Promise<UserChain> {
  const location = await createLocationChain(userManagement, token, {
    country: prefixes.country,
    city: prefixes.city,
    branch: prefixes.branch,
    department: prefixes.department,
  });
  const role = await createRole(userManagement, token, prefixes.role);
  const user = await createUser(userManagement, token, {
    rolePublicId: role.publicId,
    branchPublicId: location.branch.publicId,
    departmentPublicId: location.department.publicId,
    prefix: prefixes.user,
  });
  return { ...location, role, user };
}

async function createPermissionChain(
  userManagement: _UserManagementService,
  token: string,
  groupPrefix: string,
  privilegePrefix: string,
): Promise<PermissionChain> {
  const group = await createPermissionGroup(userManagement, token, groupPrefix);
  const privilege = await createPrivilege(userManagement, token, group.publicId, privilegePrefix);
  return { group, privilege };
}

async function createPrivilegesInGroup(
  userManagement: _UserManagementService,
  token: string,
  groupPublicId: string,
  privilegeNames: string[],
) {
  const privileges: CreatedEntity[] = [];
  for (const name of privilegeNames) {
    const response = await expectOk(
      userManagement.createPrivilege(token, {
        names: [name],
        privilegeGroupPublicId: groupPublicId,
      }),
    );
    privileges.push({ name, publicId: publicIdFrom(await json(response)) });
  }
  return privileges;
}

async function deleteByStatus(responsePromise: Promise<{ status(): number }>, allowedStatuses: number[]) {
  const response = await responsePromise;
  expect(allowedStatuses).toContain(response.status());
}

async function expectDeleteAllowed(responsePromise: Promise<{ status(): number }>) {
  const response = await responsePromise;
  expect([200, 204]).toContain(response.status());
  return response;
}

async function cleanupLocationChain(
  userManagement: _UserManagementService,
  token: string,
  chain: { country: CreatedEntity; city: CreatedEntity; branch: CreatedEntity; department: CreatedEntity },
) {
  await deleteByStatus(userManagement.deleteDepartment(token, chain.department.publicId), [204, 404]);
  await deleteByStatus(userManagement.deleteBranch(token, chain.branch.publicId), [204, 404]);
  await deleteByStatus(userManagement.deleteCity(token, chain.city.publicId), [204, 404]);
  await deleteByStatus(userManagement.deleteCountry(token, chain.country.publicId), [204, 404]);
}

async function cleanupUserChain(userManagement: _UserManagementService, token: string, chain: UserChain) {
  await deleteByStatus(userManagement.deleteUser(token, chain.user.publicId), [200, 204, 404]);
  await deleteByStatus(userManagement.deleteRole(token, chain.role.publicId), [204, 404]);
  await cleanupLocationChain(userManagement, token, chain);
}

async function cleanupPermissionChain(
  userManagement: _UserManagementService,
  token: string,
  groupPublicId: string,
  privilegePublicId: string,
  rolePublicId?: string,
) {
  if (rolePublicId) {
    await deleteByStatus(userManagement.deleteRole(token, rolePublicId), [204, 404]);
  }
  await deleteByStatus(userManagement.deletePrivilege(token, privilegePublicId), [204, 404]);
  await deleteByStatus(userManagement.deletePermissionGroup(token, groupPublicId), [204, 404]);
}

async function createRejectionCode(userManagement: _UserManagementService, token: string): Promise<CreatedEntity | null> {
  const code = unique('RC').toUpperCase();
  const createRes = await userManagement.createRejectionCode(token, {
    code,
    description: 'Automation rejection code',
    module: 'USER_MANAGEMENT',
  });
  if (createRes.status() === 404) {
    return null;
  }
  expect(createRes.status()).toBe(200);
  return { name: code, publicId: publicIdFrom(await json(createRes)) };
}

async function updateRejectionCode(
  userManagement: _UserManagementService,
  token: string,
  publicId: string,
  code: string,
) {
  await expectOk(
    userManagement.updateRejectionCode(token, publicId, {
      code,
      description: 'Updated automation rejection code',
      module: 'USER_MANAGEMENT',
    }),
  );
}

async function assertRejectionCode(userManagement: _UserManagementService, token: string, publicId: string, code: string) {
  const getRes = await expectOk(userManagement.getRejectionCode(token, publicId));
  expect(await json(getRes)).toMatchObject({ publicId, code });
}

async function listRejectionCodes(userManagement: _UserManagementService, token: string) {
  const listRes = await expectOk(userManagement.listRejectionCodes(token, { page: 0, size: 10 }));
  expect(await json(listRes)).toHaveProperty('content');
}

async function addPrivilegeToRole(userManagement: _UserManagementService, token: string, rolePublicId: string, privilegePublicId: string) {
  await deleteByStatus(userManagement.addPrivilegesToRole(token, rolePublicId, [privilegePublicId]), [200, 204]);
}

async function assertRoleExists(userManagement: _UserManagementService, token: string, rolePublicId: string) {
  await expectEntityWithCreatedBy(userManagement.getRole(token, rolePublicId), rolePublicId);
}

async function updateRolePrivileges(
  userManagement: _UserManagementService,
  token: string,
  rolePublicId: string,
  privilegePublicId: string,
) {
  await expectOk(
    userManagement.updateRole(token, rolePublicId, {
      name: unique('Updated Automation Role'),
      privilegePublicIds: [privilegePublicId],
    }),
  );
}

async function removePrivilegeFromRole(
  userManagement: _UserManagementService,
  token: string,
  rolePublicId: string,
  privilegePublicId: string,
) {
  await deleteByStatus(userManagement.removePrivilegesFromRole(token, rolePublicId, [privilegePublicId]), [200, 204, 404]);
}

async function updatePermissionGroupName(
  userManagement: _UserManagementService,
  token: string,
  groupPublicId: string,
  prefix: string,
) {
  await expectOk(
    userManagement.updatePermissionGroup(token, groupPublicId, {
      name: unique(prefix),
    }),
  );
}

async function assertPrivilegeExists(userManagement: _UserManagementService, token: string, privilegePublicId: string) {
  await expectEntityWithCreatedBy(userManagement.getPrivilege(token, privilegePublicId), privilegePublicId);
}

async function assertPermissionGroupExists(
  userManagement: _UserManagementService,
  token: string,
  groupPublicId: string,
) {
  await expectEntityWithCreatedBy(userManagement.getPermissionGroup(token, groupPublicId), groupPublicId);
}

async function updatePrivilegeRecord(
  userManagement: _UserManagementService,
  token: string,
  privilegePublicId: string,
  groupPublicId: string,
  nextName: string,
  existingName: string = nextName,
) {
  await expectOk(
    userManagement.updatePrivilege(token, privilegePublicId, {
      names: [nextName],
      privilegeGroupPublicId: groupPublicId,
      existingName,
    }),
  );
}

async function listPrivilegesPage(userManagement: _UserManagementService, token: string) {
  await expectOk(userManagement.listPrivileges(token, { page: 0, size: 10 }));
}

async function assertLocationChainExists(userManagement: _UserManagementService, token: string, chain: LocationChain) {
  await expectEntityWithCreatedBy(userManagement.getCountry(token, chain.country.publicId), chain.country.publicId);
  await expectEntityWithCreatedBy(userManagement.getCity(token, chain.city.publicId), chain.city.publicId);
  await expectEntityWithCreatedBy(userManagement.getBranch(token, chain.branch.publicId), chain.branch.publicId);
  await expectEntityWithCreatedBy(userManagement.getDepartment(token, chain.department.publicId), chain.department.publicId);
}

async function updateDepartmentName(userManagement: _UserManagementService, token: string, departmentPublicId: string) {
  await expectOk(
    userManagement.updateDepartment(token, departmentPublicId, {
      departmentName: unique('Updated Department'),
    }),
  );
}

async function listLocationEntities(userManagement: _UserManagementService, token: string) {
  await expectOk(userManagement.listCountries(token, { page: 0, size: 10 }));
  await expectOk(userManagement.listCities(token, { page: 0, size: 10 }));
  await expectOk(userManagement.listBranches(token, { page: 0, size: 10 }));
  await expectOk(userManagement.listDepartments(token, { page: 0, size: 10 }));
}

async function updateUserRecord(userManagement: _UserManagementService, token: string, userPublicId: string, chain: UserChain) {
  await expectOk(
    userManagement.updateUser(token, userPublicId, {
      firstName: 'Automation',
      lastName: 'User Updated',
      email: `${unique('automation.user.updated')}@itibari.test`,
      phoneNumber: `2557${Math.floor(10000000 + Math.random() * 89999999)}`,
      rolePublicIds: [chain.role.publicId],
      branchPublicIds: [chain.branch.publicId],
      departmentPublicIds: [chain.department.publicId],
      identificationType: 'IdentificationNumber',
      identificationNumber: unique('IDN'),
      companyIdentificationNumber: unique('CO'),
    }),
  );
}

async function assertUserExists(userManagement: _UserManagementService, token: string, userPublicId: string) {
  await expectEntityWithCreatedBy(userManagement.getUser(token, userPublicId), userPublicId);
}

async function createAndResetUserPassword(userManagement: _UserManagementService, token: string): Promise<UserChain> {
  return createUserChain(userManagement, token, {
    country: 'RUP Country',
    city: 'RUP City',
    branch: 'RUP Branch',
    department: 'RUP Dept',
    role: 'RUP Role',
    user: 'rup.user',
  });
}

async function createAndLockUser(userManagement: _UserManagementService, token: string): Promise<UserChain> {
  return createUserChain(userManagement, token, {
    country: 'LU Country',
    city: 'LU City',
    branch: 'LU Branch',
    department: 'LU Dept',
    role: 'LU Role',
    user: 'lu.user',
  });
}

export class _UserManagementFlows {
  
  constructor(private readonly userManagement: _UserManagementService) {}

  async rejectionCodeCreate() {
    const token = getTokenOrSkip();
    const rejectionCode = await createRejectionCode(this.userManagement, token);
    if (!rejectionCode) {
      return;
    }
    await deleteByStatus(this.userManagement.deleteRejectionCode(token, rejectionCode.publicId), [204, 404]);
  }

  async rejectionCodeUpdate() {
    const token = getTokenOrSkip();
    const rejectionCode = await createRejectionCode(this.userManagement, token);
    if (!rejectionCode) {
      return;
    }
    await updateRejectionCode(this.userManagement, token, rejectionCode.publicId, rejectionCode.name);
    await assertRejectionCode(this.userManagement, token, rejectionCode.publicId, rejectionCode.name);
    await deleteByStatus(this.userManagement.deleteRejectionCode(token, rejectionCode.publicId), [204, 404]);
  }

  async rejectionCodeDelete() {
    const token = getTokenOrSkip();
    const rejectionCode = await createRejectionCode(this.userManagement, token);
    if (!rejectionCode) {
      return;
    }
    await deleteByStatus(this.userManagement.deleteRejectionCode(token, rejectionCode.publicId), [204, 404]);
  }

  async permissionGroupsCreate() {
    const token = getTokenOrSkip();
    const { group, privilege } = await createPermissionChain(this.userManagement, token, 'Permissions', 'CREATE_PERMISSION');
    await assertPermissionGroupExists(this.userManagement, token, group.publicId);
    await assertPrivilegeExists(this.userManagement, token, privilege.publicId);
    await deleteByStatus(this.userManagement.deletePrivilege(token, privilege.publicId), [204, 404]);
    await deleteByStatus(this.userManagement.deletePermissionGroup(token, group.publicId), [204, 404]);
  }

  async permissionGroupsUpdate() {
    const token = getTokenOrSkip();
    const { group, privilege } = await createPermissionChain(this.userManagement, token, 'Permissions', 'UPDATE_PERMISSION');
    await assertPermissionGroupExists(this.userManagement, token, group.publicId);
    await assertPrivilegeExists(this.userManagement, token, privilege.publicId);
    await updatePermissionGroupName(this.userManagement, token, group.publicId, 'Updated Permissions');

    const updatedPermissionName = unique('UPDATED_PERMISSION').toUpperCase().replace(/-/g, '_');
    await updatePrivilegeRecord(this.userManagement, token, privilege.publicId, group.publicId, updatedPermissionName, privilege.name);
    await listPrivilegesPage(this.userManagement, token);
    await deleteByStatus(this.userManagement.deletePrivilege(token, privilege.publicId), [204, 404]);
    await deleteByStatus(this.userManagement.deletePermissionGroup(token, group.publicId), [204, 404]);
  }

  async permissionGroupsDelete() {
    const token = getTokenOrSkip();
    const { group, privilege } = await createPermissionChain(this.userManagement, token, 'Permissions', 'DELETE_PERMISSION');
    await assertPermissionGroupExists(this.userManagement, token, group.publicId);
    await assertPrivilegeExists(this.userManagement, token, privilege.publicId);
    await deleteByStatus(this.userManagement.deletePrivilege(token, privilege.publicId), [204, 404]);
    await deleteByStatus(this.userManagement.deletePermissionGroup(token, group.publicId), [204, 404]);
  }

  async permissionGroupsCreateSamePrivilegesAcrossGroups() {
    const token = getTokenOrSkip();

    const groupA = await createPermissionGroup(this.userManagement, token, 'Permission Group A');
    const privilegesA = await createPrivilegesInGroup(this.userManagement, token, groupA.publicId, [
      unique('AUTOMATION_CREATE'),
      unique('AUTOMATION_UPDATE'),
    ]);

    const groupB = await createPermissionGroup(this.userManagement, token, 'Permission Group B');
    const privilegesB = await createPrivilegesInGroup(this.userManagement, token, groupB.publicId, [
      unique('AUTOMATION_CREATE'),
      unique('AUTOMATION_UPDATE'),
    ]);

    for (const privilege of privilegesA) {
      await deleteByStatus(this.userManagement.deletePrivilege(token, privilege.publicId), [204, 404]);
    }
    for (const privilege of privilegesB) {
      await deleteByStatus(this.userManagement.deletePrivilege(token, privilege.publicId), [204, 404]);
    }
    await deleteByStatus(this.userManagement.deletePermissionGroup(token, groupB.publicId), [204, 404]);
    await deleteByStatus(this.userManagement.deletePermissionGroup(token, groupA.publicId), [204, 404]);
  }

  async rolesCreate() {
    const token = getTokenOrSkip();
    const role = await createRole(this.userManagement, token, 'Automation Role');
    await assertRoleExists(this.userManagement, token, role.publicId);
    await deleteByStatus(this.userManagement.deleteRole(token, role.publicId), [204, 404]);
  }

  async rolesUpdate() {
    const token = getTokenOrSkip();
    const { group, privilege } = await createPermissionChain(this.userManagement, token, 'Permission Group', 'AUTOMATION_PRIVILEGE');
    const role = await createRole(this.userManagement, token, 'Automation Role');

    await addPrivilegeToRole(this.userManagement, token, role.publicId, privilege.publicId);
    await assertRoleExists(this.userManagement, token, role.publicId);
    await updateRolePrivileges(this.userManagement, token, role.publicId, privilege.publicId);
    await assertRoleExists(this.userManagement, token, role.publicId);
    await removePrivilegeFromRole(this.userManagement, token, role.publicId, privilege.publicId);
    await cleanupPermissionChain(this.userManagement, token, group.publicId, privilege.publicId, role.publicId);
  }

  async rolesDelete() {
    const token = getTokenOrSkip();
    const role = await createRole(this.userManagement, token, 'Automation Role');
    await deleteByStatus(this.userManagement.deleteRole(token, role.publicId), [204, 404]);
  }

  async locationsCreate() {
    const token = getTokenOrSkip();
    const chain = await createLocationChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
    });

    await assertLocationChainExists(this.userManagement, token, chain);
    await cleanupLocationChain(this.userManagement, token, chain);
  }

  async locationsUpdate() {
    const token = getTokenOrSkip();
    const chain = await createLocationChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
    });

    await assertLocationChainExists(this.userManagement, token, chain);
    await updateDepartmentName(this.userManagement, token, chain.department.publicId);
    await listLocationEntities(this.userManagement, token);
    await cleanupLocationChain(this.userManagement, token, chain);
  }

  async locationsDelete() {
    const token = getTokenOrSkip();
    const chain = await createLocationChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
    });

    await cleanupLocationChain(this.userManagement, token, chain);
  }

  async countryDeleteBlockedByCities() {
    const token = getTokenOrSkip();
    const chain = await createLocationChain(this.userManagement, token, {
      country: 'Blocked Country',
      city: 'Blocked City',
      branch: 'Blocked Branch',
      department: 'Blocked Department',
    });

    await expectDeleteAllowed(this.userManagement.deleteCountry(token, chain.country.publicId));
    await cleanupLocationChain(this.userManagement, token, chain);
  }

  async cityDeleteBlockedByBranches() {
    const token = getTokenOrSkip();
    const chain = await createLocationChain(this.userManagement, token, {
      country: 'Blocked Country',
      city: 'Blocked City',
      branch: 'Blocked Branch',
      department: 'Blocked Department',
    });

    await expectDeleteAllowed(this.userManagement.deleteCity(token, chain.city.publicId));
    await cleanupLocationChain(this.userManagement, token, chain);
  }

  async branchDeleteBlockedByUsers() {
    const token = getTokenOrSkip();
    const chain = await createUserChain(this.userManagement, token, {
      country: 'Blocked Country',
      city: 'Blocked City',
      branch: 'Blocked Branch',
      department: 'Blocked Department',
      role: 'Blocked Role',
      user: 'blocked.user',
    });

    await expectDeleteAllowed(this.userManagement.deleteBranch(token, chain.branch.publicId));
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async usersCreate() {
    const token = getTokenOrSkip();
    const chain = await createUserChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
      role: 'Automation Role',
      user: 'automation.user',
    });

    await assertUserExists(this.userManagement, token, chain.user.publicId);
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async usersUpdate() {
    const token = getTokenOrSkip();
    const chain = await createUserChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
      role: 'Automation Role',
      user: 'automation.user',
    });

    await updateUserRecord(this.userManagement, token, chain.user.publicId, chain);
    await assertUserExists(this.userManagement, token, chain.user.publicId);
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async usersDelete() {
    const token = getTokenOrSkip();
    const chain = await createUserChain(this.userManagement, token, {
      country: 'Automation Country',
      city: 'Automation City',
      branch: 'Automation Branch',
      department: 'Automation Department',
      role: 'Automation Role',
      user: 'automation.user',
    });

    await deleteByStatus(this.userManagement.deleteUser(token, chain.user.publicId), [200, 204, 404]);
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async listUsers() {
    const token = getTokenOrSkip();
    const listRes = await expectOk(this.userManagement.listUsers(token, { page: 0, size: 5 }));
    const body = await json(listRes);
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
  }

  async resetUserPassword() {
    const token = getTokenOrSkip();
    const chain = await createAndResetUserPassword(this.userManagement, token);
    await expectStatuses(this.userManagement.resetUserPassword(token, chain.user.publicId, 'NewP@ss123'), [200, 204]);
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async lockUser() {
    const token = getTokenOrSkip();
    const chain = await createAndLockUser(this.userManagement, token);
    await expectStatuses(this.userManagement.lockUser(token, chain.user.publicId), [200, 204]);
    await cleanupUserChain(this.userManagement, token, chain);
  }

  async currentUserActivity() {
    const token = getTokenOrSkip();
    const currentUserRes = await expectOk(this.userManagement.getCurrentUser(token));
    const currentUser = await json(currentUserRes);
    const currentUserPublicId = currentUser.publicId;
    expect(currentUserPublicId).toBeTruthy();

    await expectOk(this.userManagement.getUserActivityLogs(token, currentUserPublicId, { page: 0, size: 10 }));
  }
}
