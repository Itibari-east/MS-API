import { APIResponse } from '@playwright/test';
import { serviceConstants } from '../../constants/endpoints';
import { _PosRequests } from '../requests/auth';
import { common } from '../../utils/common';
import { authHeaders, extractAuthToken, QueryParams, withQueryParams } from '../../services/requestHelpers';

type HeadersRecord = Record<string, string>;

function jsonHeaders() {
  return {
    accept: '*/*',
    'content-type': 'application/json',
  };
}

function authenticatedJsonHeaders(token?: string): HeadersRecord | undefined {
  return {
    ...jsonHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authTokenOrThrow(token?: string): string {
  const resolved = token ?? process.env.POS_ADMIN_TOKEN ?? process.env.MS_WEB_BEARER_TOKEN ?? '';
  if (!resolved) {
    throw new Error('A POS bearer token is required. Set POS_ADMIN_TOKEN or pass a token explicitly.');
  }

  return resolved;
}

export interface PosLoginPayload {
  username: string;
  password: string;
  channel?: string;
}

export interface PosCreateUserPayload {
  firstName: string;
  lastName: string;
  userName: string;
  contactEmail: string;
  contactPhoneNumber: string;
  password: string;
  confirmPassword: string;
  userNationalId?: string;
}

export interface PosCreateSubscriptionPayload {
  name: string;
  description?: string;
  price?: number;
  subscriptionDefinitionList?: Array<{ description: string }>;
}

export interface PosCreateRolePayload {
  name: string;
  description?: string;
}

export interface PosCreatePrivilegePayload {
  name: string;
  privilegeGroupPublicId?: string;
}

export interface PosCreatePrivilegeGroupPayload {
  name: string;
}

export interface PosCreateProfilePayload {
  userPublicId: string;
  name: string;
  country?: string;
  traPin?: string;
  timeZone?: string;
  baseCurrency?: string;
}

export class PosService {
  async login(username: string, password: string, channel = serviceConstants.auth.channel.pos): Promise<APIResponse> {
    const url = _PosRequests.authentication.login();
    return common.postResponse(url, { username, password, channel }, jsonHeaders());
  }

  async loginAndGetToken(username: string, password: string, channel = serviceConstants.auth.channel.pos): Promise<string> {
    const response = await this.login(username, password, channel);
    if (!response.ok()) {
      throw new Error(`[pos/login] ${response.status()}: ${await response.text()}`);
    }

    const token = await extractAuthToken(response);
    if (!token) {
      throw new Error('[pos/login] No bearer token found in response');
    }

    return token;
  }

  async createUser(token: string, payload: PosCreateUserPayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.users.create(), payload, authHeaders(authTokenOrThrow(token)));
  }

  async listUsers(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(withQueryParams(_PosRequests.users.list(), params), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async getUserByPublicId(token: string, publicId: string): Promise<APIResponse> {
    return common.getResponse(_PosRequests.users.byId(publicId), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async getUsersByChildShop(token: string, parentTenantId: string, childShopId: string): Promise<APIResponse> {
    return common.postResponse(
      _PosRequests.users.byChildShop(parentTenantId, childShopId),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async getUserRoles(token: string, userId: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(withQueryParams(_PosRequests.users.roles(userId), params), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async assignRolesToUser(token: string, userId: string, payload: { rolePublicIds: string[] }): Promise<APIResponse> {
    return common.patchResponse(_PosRequests.users.roles(userId), payload, authHeaders(authTokenOrThrow(token)));
  }

  async getUserPrivileges(token: string, userId: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(
      withQueryParams(_PosRequests.users.privileges(userId), params),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async listSubscriptions(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(
      withQueryParams(_PosRequests.subscriptions.list(), params),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async createSubscription(token: string, payload: PosCreateSubscriptionPayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.subscriptions.create(), payload, authHeaders(authTokenOrThrow(token)));
  }

  async listRoles(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(withQueryParams(_PosRequests.roles.list(), params), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async createRole(token: string, payload: PosCreateRolePayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.roles.create(), payload, authHeaders(authTokenOrThrow(token)));
  }

  async assignPrivilegeGroupsToRole(token: string, rolePublicId: string, payload: { privilegeGroupPublicIds: string[] }): Promise<APIResponse> {
    return common.patchResponse(_PosRequests.roles.privilegeGroups(rolePublicId), payload, authHeaders(authTokenOrThrow(token)));
  }

  async assignPrivilegesToRole(token: string, rolePublicId: string, payload: { privilegeUUIDs: string[] }): Promise<APIResponse> {
    return common.patchResponse(_PosRequests.roles.assignPrivileges(rolePublicId), payload, authHeaders(authTokenOrThrow(token)));
  }

  async listPrivileges(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(withQueryParams(_PosRequests.privileges.list(), params), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async createPrivilege(token: string, payload: PosCreatePrivilegePayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.privileges.create(), payload, authHeaders(authTokenOrThrow(token)));
  }

  async assignPrivilegesToGroup(token: string, groupPublicId: string, payload: { privilegePublicIds: string[] }): Promise<APIResponse> {
    return common.patchResponse(_PosRequests.privileges.groups(groupPublicId), payload, authHeaders(authTokenOrThrow(token)));
  }

  async listPrivilegeGroups(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(
      withQueryParams(_PosRequests.privilegeGroups.list(), params),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async createPrivilegeGroup(token: string, payload: PosCreatePrivilegeGroupPayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.privilegeGroups.create(), payload, authHeaders(authTokenOrThrow(token)));
  }

  async listInstitutions(token: string, params?: QueryParams): Promise<APIResponse> {
    return common.getResponse(
      withQueryParams(_PosRequests.institutions.list(), params),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async createProfile(token: string, payload: PosCreateProfilePayload): Promise<APIResponse> {
    return common.postResponse(_PosRequests.institutions.createProfile(), payload, authenticatedJsonHeaders(authTokenOrThrow(token)));
  }

  async getMyShop(token: string): Promise<APIResponse> {
    return common.getResponse(_PosRequests.institutions.myShop(), undefined, authHeaders(authTokenOrThrow(token)));
  }

  async createChildShop(token: string, parentTenantId: string, payload: Omit<PosCreateProfilePayload, 'userPublicId'>): Promise<APIResponse> {
    return common.postResponse(
      _PosRequests.institutions.childShop(parentTenantId),
      payload,
      authenticatedJsonHeaders(authTokenOrThrow(token)),
    );
  }

  async addNotification(
    token: string,
    institutionPublicId: string,
    payload: { subscriptionPaymentList?: unknown[]; marketingList?: unknown[] },
  ): Promise<APIResponse> {
    return common.patchResponse(
      _PosRequests.institutions.addNotification(institutionPublicId),
      payload,
      authenticatedJsonHeaders(authTokenOrThrow(token)),
    );
  }

  async listNotificationPreferences(token: string, institutionId: string): Promise<APIResponse> {
    return common.getResponse(
      _PosRequests.institutions.notificationPreference(institutionId),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async updatePaymentAndSubscription(token: string, subscriptionId: string): Promise<APIResponse> {
    return common.patchResponse(
      _PosRequests.institutions.updatePaymentAndSubscription(subscriptionId),
      undefined,
      authHeaders(authTokenOrThrow(token)),
    );
  }

  async resetPassword(
    username: string,
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<APIResponse> {
    return common.postResponse(
      _PosRequests.authentication.resetPassword(),
      { username, resetToken, newPassword, confirmPassword },
      jsonHeaders(),
    );
  }

  async loginWithGoogle(idToken: string): Promise<APIResponse> {
    return common.postResponse(_PosRequests.authentication.googleLogin(), { idToken }, jsonHeaders());
  }

  async forgotPassword(username: string, token?: string): Promise<APIResponse> {
    return common.postResponse(
      _PosRequests.authentication.forgotPassword(username),
      undefined,
      authenticatedJsonHeaders(token ?? process.env.POS_ADMIN_TOKEN ?? process.env.MS_WEB_BEARER_TOKEN),
    );
  }
}
