import { APIResponse, request } from '@playwright/test';
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
  SupplierDocumentUploadPayload,
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
  SupplierProductListParams,
  SupplierProductListResponse,
  SupplierDocumentListParams,
  SupplierDocumentListResponse,
  SupplierDocumentExportParams,
  SupplierRebateListParams,
  SupplierRebateListResponse,
  SupplierPerformanceDeliveryParams,
  SupplierPerformanceDeliveryResponse,
  SupplierSummaryResponse,
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

  private async sendMultipart(
    url: string,
    token: string,
    multipart: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }>,
  ): Promise<APIResponse> {
    const apiRequestContext = await request.newContext();
    try {
      return await apiRequestContext.post(url, {
        headers: acceptHeaders(token),
        multipart,
      });
    } finally {
      await apiRequestContext.dispose().catch(() => undefined);
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

  private async executeRaw(
    method: HttpMethod,
    operation: string,
    url: string,
    token: string,
    body: unknown,
    allowedStatuses: number[],
    multipart?: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }>,
  ): Promise<APIResponse> {
    console.log(`[SupplierApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = multipart ? await this.sendMultipart(url, token, multipart) : await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[SupplierApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new SupplierApiError(operation, method, url, status, raw);
    }

    return response;
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
      _SupplierRequests.suppliers.documents.upload(publicId),
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

  listProducts(
    token: string,
    publicId: SupplierId,
    params?: SupplierProductListParams,
  ): Promise<SupplierApiResult<SupplierProductListResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.products.list(publicId), params);
    return this.execute<SupplierProductListResponse>('GET', 'listProducts', url, token, undefined, [200]);
  }

  getProductSummary(token: string, publicId: SupplierId): Promise<SupplierApiResult<SupplierSummaryResponse>> {
    return this.execute<SupplierSummaryResponse>(
      'GET',
      'getProductSummary',
      _SupplierRequests.suppliers.products.summary(publicId),
      token,
      undefined,
      [200],
    );
  }

  listDocuments(
    token: string,
    publicId: SupplierId,
    params?: SupplierDocumentListParams,
  ): Promise<SupplierApiResult<SupplierDocumentListResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.documents.list(publicId), params);
    return this.execute<SupplierDocumentListResponse>('GET', 'listDocuments', url, token, undefined, [200]);
  }

  uploadDocument(
    token: string,
    publicId: SupplierId,
    payload: SupplierDocumentUploadPayload,
  ): Promise<SupplierApiResult<SupplierRecord>> {
    const multipart: Record<string, string | number | boolean | { name: string; mimeType: string; buffer: Buffer }> = {
      documentTypeCode: payload.documentTypeCode,
      fileName: payload.fileName,
      storageKey: payload.storageKey,
      contentType: payload.contentType,
      file: payload.file,
    };

    if (payload.expiryDate) {
      multipart.expiryDate = payload.expiryDate;
    }

    const url = _SupplierRequests.suppliers.documents.upload(publicId);
    return (async () => {
      console.log(`[SupplierApi] -> uploadDocument POST ${url} ${prettyBody(payload)}`);
      const apiRequestContext = await request.newContext();
      try {
        const response = await apiRequestContext.post(url, {
          headers: acceptHeaders(token),
          multipart,
        });
        const status = response.status();
        const raw = await response.text();
        console.log(`[SupplierApi] <- uploadDocument ${status} ${responsePreview(raw)}`);
        if (![200, 201].includes(status)) {
          throw new SupplierApiError('uploadDocument', 'POST', url, status, raw);
        }
        return {
          status,
          data: parseJson<SupplierRecord>(raw, 'uploadDocument'),
          raw,
          headers: response.headers(),
        };
      } finally {
        await apiRequestContext.dispose().catch(() => undefined);
      }
    })();
  }

  sendDocumentRenewalReminder(
    token: string,
    publicId: SupplierId,
    documentPublicId: string,
  ): Promise<APIResponse> {
    return this.executeRaw(
      'POST',
      'sendDocumentRenewalReminder',
      _SupplierRequests.suppliers.documents.renewalReminder(publicId, documentPublicId),
      token,
      undefined,
      [200, 204],
    );
  }

  viewDocument(token: string, publicId: SupplierId, documentPublicId: string): Promise<APIResponse> {
    return this.executeRaw(
      'GET',
      'viewDocument',
      _SupplierRequests.suppliers.documents.view(publicId, documentPublicId),
      token,
      undefined,
      [200],
    );
  }

  downloadDocument(token: string, publicId: SupplierId, documentPublicId: string): Promise<APIResponse> {
    return this.executeRaw(
      'GET',
      'downloadDocument',
      _SupplierRequests.suppliers.documents.download(publicId, documentPublicId),
      token,
      undefined,
      [200],
    );
  }

  exportDocuments(
    token: string,
    publicId: SupplierId,
    params?: SupplierDocumentExportParams,
  ): Promise<APIResponse> {
    const url = withQueryParams(_SupplierRequests.suppliers.documents.export(publicId), params);
    return this.executeRaw('GET', 'exportDocuments', url, token, undefined, [200]);
  }

  listRebates(
    token: string,
    publicId: SupplierId,
    params?: SupplierRebateListParams,
  ): Promise<SupplierApiResult<SupplierRebateListResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.rebates.list(publicId), params);
    return this.execute<SupplierRebateListResponse>('GET', 'listRebates', url, token, undefined, [200]);
  }

  getRebatesSummary(token: string, publicId: SupplierId): Promise<SupplierApiResult<SupplierSummaryResponse>> {
    return this.execute<SupplierSummaryResponse>(
      'GET',
      'getRebatesSummary',
      _SupplierRequests.suppliers.rebates.summary(publicId),
      token,
      undefined,
      [200],
    );
  }

  getPerformanceSummary(
    token: string,
    publicId: SupplierId,
  ): Promise<SupplierApiResult<SupplierSummaryResponse>> {
    return this.execute<SupplierSummaryResponse>(
      'GET',
      'getPerformanceSummary',
      _SupplierRequests.suppliers.performance.summary(publicId),
      token,
      undefined,
      [200],
    );
  }

  listPerformanceDeliveries(
    token: string,
    publicId: SupplierId,
    params?: SupplierPerformanceDeliveryParams,
  ): Promise<SupplierApiResult<SupplierPerformanceDeliveryResponse>> {
    const url = withQueryParams(_SupplierRequests.suppliers.performance.deliveries(publicId), params);
    return this.execute<SupplierPerformanceDeliveryResponse>(
      'GET',
      'listPerformanceDeliveries',
      url,
      token,
      undefined,
      [200],
    );
  }
}

export const supplierApi = new SupplierApi();
