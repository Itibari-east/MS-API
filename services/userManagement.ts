import { _UserManagementRequests } from '../requests/userManagement';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export class _UserManagementService {
  listUsers(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.users.list(), params), undefined, authHeaders(token));
  }

  createUser(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.users.create(), payload, authHeaders(token));
  }

  getUser(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.users.byId(publicId), undefined, authHeaders(token));
  }

  updateUser(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.users.byId(publicId), payload, authHeaders(token));
  }

  deleteUser(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.users.byId(publicId), undefined, authHeaders(token));
  }

  getCurrentUser(token: string) {
    return common.getResponse(_UserManagementRequests.users.current(), undefined, authHeaders(token));
  }

  addRolesToUser(token: string, publicId: string, rolePublicIds: string[]) {
    return common.postResponse(_UserManagementRequests.users.roles(publicId), { rolePublicIds }, authHeaders(token));
  }

  removeRolesFromUser(token: string, publicId: string, rolePublicIds: string[]) {
    return common.deleteResponse(_UserManagementRequests.users.roles(publicId), { rolePublicIds }, authHeaders(token));
  }

  resetUserPassword(token: string, publicId: string, newPassword: string) {
    return common.patchResponse(_UserManagementRequests.users.resetPassword(publicId), {
      newPassword,
      confirmNewPassword: newPassword,
    }, authHeaders(token));
  }

  lockUser(token: string, publicId: string) {
    return common.patchResponse(_UserManagementRequests.users.lock(publicId), undefined, authHeaders(token));
  }

  getUserActivityLogs(token: string, userPublicId: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.userActivityLogs.byUser(userPublicId), params), undefined, authHeaders(token));
  }

  listRoles(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.roles.list(), params), undefined, authHeaders(token));
  }

  createRole(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.roles.create(), payload, authHeaders(token));
  }

  getRole(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.roles.byId(publicId), undefined, authHeaders(token));
  }

  updateRole(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.roles.byId(publicId), payload, authHeaders(token));
  }

  deleteRole(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.roles.byId(publicId), undefined, authHeaders(token));
  }

  addPrivilegesToRole(token: string, publicId: string, privilegePublicIds: string[]) {
    return common.postResponse(_UserManagementRequests.roles.privileges(publicId), { privilegePublicIds }, authHeaders(token));
  }

  removePrivilegesFromRole(token: string, publicId: string, privilegePublicIds: string[]) {
    return common.deleteResponse(_UserManagementRequests.roles.privileges(publicId), { privilegePublicIds }, authHeaders(token));
  }

  listRejectionCodes(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.rejectionCodes.list(), params), undefined, authHeaders(token));
  }

  createRejectionCode(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.rejectionCodes.create(), payload, authHeaders(token));
  }

  getRejectionCode(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.rejectionCodes.byId(publicId), undefined, authHeaders(token));
  }

  updateRejectionCode(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.rejectionCodes.byId(publicId), payload, authHeaders(token));
  }

  deleteRejectionCode(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.rejectionCodes.byId(publicId), undefined, authHeaders(token));
  }

  listPermissionGroups(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.permissions.groups.list(), params), undefined, authHeaders(token));
  }

  createPermissionGroup(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.permissions.groups.create(), payload, authHeaders(token));
  }

  getPermissionGroup(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.permissions.groups.byId(publicId), undefined, authHeaders(token));
  }

  updatePermissionGroup(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.permissions.groups.byId(publicId), payload, authHeaders(token));
  }

  deletePermissionGroup(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.permissions.groups.byId(publicId), undefined, authHeaders(token));
  }

  listPrivileges(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.permissions.privileges.list(), params), undefined, authHeaders(token));
  }

  createPrivilege(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.permissions.privileges.create(), payload, authHeaders(token));
  }

  getPrivilege(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.permissions.privileges.byId(publicId), undefined, authHeaders(token));
  }

  updatePrivilege(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.permissions.privileges.byId(publicId), payload, authHeaders(token));
  }

  deletePrivilege(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.permissions.privileges.byId(publicId), undefined, authHeaders(token));
  }

  listCountries(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.locations.countries.list(), params), undefined, authHeaders(token));
  }

  createCountry(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.locations.countries.create(), payload, authHeaders(token));
  }

  getCountry(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.locations.countries.byId(publicId), undefined, authHeaders(token));
  }

  updateCountry(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.locations.countries.byId(publicId), payload, authHeaders(token));
  }

  deleteCountry(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.locations.countries.byId(publicId), undefined, authHeaders(token));
  }

  listRegions(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.locations.regions.list(), params), undefined, authHeaders(token));
  }

  getRegion(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.locations.regions.byId(publicId), undefined, authHeaders(token));
  }

  listCities(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.locations.cities.list(), params), undefined, authHeaders(token));
  }

  createCity(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.locations.cities.create(), payload, authHeaders(token));
  }

  getCity(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.locations.cities.byId(publicId), undefined, authHeaders(token));
  }

  updateCity(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.locations.cities.byId(publicId), payload, authHeaders(token));
  }

  deleteCity(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.locations.cities.byId(publicId), undefined, authHeaders(token));
  }

  listBranches(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.locations.branches.list(), params), undefined, authHeaders(token));
  }

  createBranch(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.locations.branches.create(), payload, authHeaders(token));
  }

  getBranch(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.locations.branches.byId(publicId), undefined, authHeaders(token));
  }

  updateBranch(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.locations.branches.byId(publicId), payload, authHeaders(token));
  }

  deleteBranch(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.locations.branches.byId(publicId), undefined, authHeaders(token));
  }

  listDepartments(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_UserManagementRequests.locations.departments.list(), params), undefined, authHeaders(token));
  }

  createDepartment(token: string, payload: unknown) {
    return common.postResponse(_UserManagementRequests.locations.departments.create(), payload, authHeaders(token));
  }

  getDepartment(token: string, publicId: string) {
    return common.getResponse(_UserManagementRequests.locations.departments.byId(publicId), undefined, authHeaders(token));
  }

  updateDepartment(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_UserManagementRequests.locations.departments.byId(publicId), payload, authHeaders(token));
  }

  deleteDepartment(token: string, publicId: string) {
    return common.deleteResponse(_UserManagementRequests.locations.departments.byId(publicId), undefined, authHeaders(token));
  }
}
