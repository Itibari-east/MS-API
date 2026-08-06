import { APIResponse } from '@playwright/test';
import { _SupplierRequests } from '../requests/supplier';
import { common } from '../utils/common';
import { authHeaders, withQueryParams } from './requestHelpers';
import {
  SupplierAdditionalPayload,
  SupplierApiResult,
  SupplierBankAccountsPayload,
  SupplierBusinessTermsPayload,
  SupplierContactPayload,
  SupplierDeactivatePayload,
  SupplierDocumentMetadataPayload,
  SupplierDraftPayload,
  SupplierId,
  SupplierListParams,
  SupplierListResponse,
  SupplierMobileMoneyPayload,
  SupplierPointOfContactPayload,
  SupplierRecord,
  SupplierActivityParams,
  SupplierActivityResponse,
  SupplierBulkDeactivatePayload,
} from '../types/supplier';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

function acceptHeaders(token?: string) {
  return {
    accept: 'application/json',
    ...(token ? authHeaders(token) : {}),
  };
}

function jsonHeaders(token?: string) {
  return {
    ...acceptHeaders(token),
    'content-type': 'application/json',
  };
}

function prettyBody(body: unknown) {
  if (body === undefined) {
    return '';
  }

  try {
    return JSON.stringify(body);
  } catch {
    return '[unserializable body]';
  }
}

function parseJson<T>(raw: string, operation: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    throw new Error(`[SupplierApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class SupplierApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(
      `[SupplierApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`,
    );
    this.name = 'SupplierApiError';
  }
}

export class SupplierApi {
  private async send(
    method: HttpMethod,
    url: string,
    token?: string,
    body?: unknown,
  ): Promise<APIResponse> {
    switch (method) {
      case 'GET':
        return common.getResponse(url, undefined, acceptHeaders(token));
      case 'POST':
        return common.postResponse(url, body, jsonHeaders(token));
      case 'PATCH':
        return common.patchResponse(url, body, jsonHeaders(token));
      case 'PUT':
        return common.putResponse(url, body, jsonHeaders(token));
      case 'DELETE':
        return common.deleteResponse(url, body, jsonHeaders(token));
      default: {
        const exhaustiveCheck: never = method;
        throw new Error(`Unsupported HTTP method: ${exhaustiveCheck}`);
      }
    }
  }

  private async execute<T>(
    method: HttpMethod,
    operation: string,
    url: string,
    token: string,
    body: unknown,
    allowedStatuses: number[],
  ): Promise<SupplierApiResult<T>> {
    console.log(`[SupplierApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[SupplierApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new SupplierApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listSuppliers(
    token: string,
    params?: SupplierListParams,
  ): Promise<SupplierApiResult<SupplierListResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.list(), params);
    return this.execute<SupplierListResponse>('GET', 'listSuppliers', url, token, undefined, [200]);
  }

  createDraft(
    token: string,
    payload: SupplierDraftPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'POST',
      'createDraft',
      _SupplierRequests.suppliers.createDraft(),
      token,
      payload,
      [200, 201],
    );
  }

  getSupplier(token: string, publicId: SupplierId): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'GET',
      'getSupplier',
      _SupplierRequests.suppliers.byId(publicId),
      token,
      undefined,
      [200],
    );
  }

  confirmSupplier(token: string, publicId: SupplierId): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'POST',
      'confirmSupplier',
      _SupplierRequests.suppliers.confirm(publicId),
      token,
      undefined,
      [200],
    );
  }

  grantPortalAccess(token: string, publicId: SupplierId): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'POST',
      'grantPortalAccess',
      _SupplierRequests.suppliers.portalAccess(publicId),
      token,
      undefined,
      [200],
    );
  }

  deactivateSupplier(
    token: string,
    publicId: SupplierId,
    payload: SupplierDeactivatePayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'POST',
      'deactivateSupplier',
      _SupplierRequests.suppliers.deactivate(publicId),
      token,
      payload,
      [200, 204],
    );
  }

  bulkDeactivate(
    token: string,
    payload: SupplierBulkDeactivatePayload,
  ): Promise<SupplierApiResult<SupplierRecord[]>> {
    return this.execute<SupplierRecord[]>(
      'POST',
      'bulkDeactivate',
      _SupplierRequests.suppliers.bulkDeactivate(),
      token,
      payload,
      [200, 204],
    );
  }

  upsertContact(
    token: string,
    publicId: SupplierId,
    payload: SupplierContactPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'upsertContact',
      _SupplierRequests.suppliers.contact(publicId),
      token,
      payload,
      [200],
    );
  }

  upsertPrimaryContact(
    token: string,
    publicId: SupplierId,
    payload: SupplierPointOfContactPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'upsertPrimaryContact',
      _SupplierRequests.suppliers.pointsOfContact(publicId),
      token,
      payload,
      [200],
    );
  }

  upsertSecondaryContact(
    token: string,
    publicId: SupplierId,
    payload: SupplierPointOfContactPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'upsertSecondaryContact',
      _SupplierRequests.suppliers.secondaryContact(publicId),
      token,
      payload,
      [200],
    );
  }

  patchBusinessTerms(
    token: string,
    publicId: SupplierId,
    payload: SupplierBusinessTermsPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'patchBusinessTerms',
      _SupplierRequests.suppliers.businessTerms(publicId),
      token,
      payload,
      [200],
    );
  }

  replaceBanking(
    token: string,
    publicId: SupplierId,
    payload: SupplierBankAccountsPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'replaceBanking',
      _SupplierRequests.suppliers.bankAccounts(publicId),
      token,
      payload,
      [200],
    );
  }

  replaceMobileMoney(
    token: string,
    publicId: SupplierId,
    payload: SupplierMobileMoneyPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'replaceMobileMoney',
      _SupplierRequests.suppliers.mobileMoneyAccounts(publicId),
      token,
      payload,
      [200],
    );
  }

  patchAdditional(
    token: string,
    publicId: SupplierId,
    payload: SupplierAdditionalPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'PATCH',
      'patchAdditional',
      _SupplierRequests.suppliers.additional(publicId),
      token,
      payload,
      [200],
    );
  }

  upsertDocumentMetadata(
    token: string,
    publicId: SupplierId,
    payload: SupplierDocumentMetadataPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    return this.execute<SupplierRecord>(
      'POST',
      'upsertDocumentMetadata',
      _SupplierRequests.suppliers.documents(publicId),
      token,
      payload,
      [200, 201],
    );
  }

  listActivity(
    token: string,
    publicId: SupplierId,
    params?: SupplierActivityParams,
  ): Promise<SupplierApiResult<SupplierActivityResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.activities(publicId), params);
    return this.execute<SupplierActivityResponse>('GET', 'listActivity', url, token, undefined, [200]);
  }
}

export const supplierApi = new SupplierApi();
