import { APIResponse } from '@playwright/test';
import { _PackageUnitRequests } from '../requests/packageUnit';
import { common } from '../utils/common';
import { authHeaders, withQueryParams } from './requestHelpers';
import {
  PackageUnitApiResult,
  PackageUnitCreatePayload,
  PackageUnitId,
  PackageUnitListParams,
  PackageUnitListResponse,
  PackageUnitRecord,
  PackageUnitStatusPayload,
  PackageUnitUpdatePayload,
} from '../types/packageUnit';

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
  } catch {
    throw new Error(`[PackageUnitApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class PackageUnitApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`[PackageUnitApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`);
    this.name = 'PackageUnitApiError';
  }
}

export class PackageUnitApi {
  private async send(method: HttpMethod, url: string, token?: string, body?: unknown): Promise<APIResponse> {
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
  ): Promise<PackageUnitApiResult<T>> {
    console.log(`[PackageUnitApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[PackageUnitApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new PackageUnitApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listPackageUnits(
    token: string,
    params?: PackageUnitListParams,
  ): Promise<PackageUnitApiResult<PackageUnitListResponse>> {
    const url = withQueryParams(_PackageUnitRequests.packageUnits.list(), params);
    return this.execute<PackageUnitListResponse>('GET', 'listPackageUnits', url, token, undefined, [200]);
  }

  createPackageUnit(
    token: string,
    payload: PackageUnitCreatePayload,
  ): Promise<PackageUnitApiResult<PackageUnitRecord>> {
    return this.execute<PackageUnitRecord>(
      'POST',
      'createPackageUnit',
      _PackageUnitRequests.packageUnits.create(),
      token,
      payload,
      [200, 201],
    );
  }

  getPackageUnit(token: string, publicId: PackageUnitId): Promise<PackageUnitApiResult<PackageUnitRecord>> {
    return this.execute<PackageUnitRecord>(
      'GET',
      'getPackageUnit',
      _PackageUnitRequests.packageUnits.byId(publicId),
      token,
      undefined,
      [200],
    );
  }

  updatePackageUnit(
    token: string,
    publicId: PackageUnitId,
    payload: PackageUnitUpdatePayload,
  ): Promise<PackageUnitApiResult<PackageUnitRecord>> {
    return this.execute<PackageUnitRecord>(
      'PATCH',
      'updatePackageUnit',
      _PackageUnitRequests.packageUnits.byId(publicId),
      token,
      payload,
      [200],
    );
  }

  updatePackageUnitStatus(
    token: string,
    publicId: PackageUnitId,
    payload: PackageUnitStatusPayload,
  ): Promise<PackageUnitApiResult<PackageUnitRecord>> {
    return this.execute<PackageUnitRecord>(
      'PATCH',
      'updatePackageUnitStatus',
      _PackageUnitRequests.packageUnits.status(publicId),
      token,
      payload,
      [200],
    );
  }
}
