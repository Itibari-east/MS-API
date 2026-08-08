import { APIResponse } from '@playwright/test';
import { _CategoryRequests } from '../requests/category';
import { common } from '../utils/common';
import { authHeaders, withQueryParams } from './requestHelpers';
import {
  CategoryApiResult,
  CategoryCreatePayload,
  CategoryId,
  CategoryListParams,
  CategoryListResponse,
  CategoryRecord,
  CategoryStatusPayload,
  CategoryUpdatePayload,
} from '../types/category';

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
    throw new Error(`[CategoryApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class CategoryApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`[CategoryApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`);
    this.name = 'CategoryApiError';
  }
}

export class CategoryApi {
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
  ): Promise<CategoryApiResult<T>> {
    console.log(`[CategoryApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[CategoryApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new CategoryApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listCategories(
    token: string,
    params?: CategoryListParams,
  ): Promise<CategoryApiResult<CategoryListResponse>> {
    const url = withQueryParams(_CategoryRequests.categories.list(), params);
    return this.execute<CategoryListResponse>('GET', 'listCategories', url, token, undefined, [200]);
  }

  createCategory(
    token: string,
    payload: CategoryCreatePayload,
  ): Promise<CategoryApiResult<CategoryRecord>> {
    return this.execute<CategoryRecord>(
      'POST',
      'createCategory',
      _CategoryRequests.categories.create(),
      token,
      payload,
      [200, 201],
    );
  }

  getCategory(token: string, publicId: CategoryId): Promise<CategoryApiResult<CategoryRecord>> {
    return this.execute<CategoryRecord>(
      'GET',
      'getCategory',
      _CategoryRequests.categories.byId(publicId),
      token,
      undefined,
      [200],
    );
  }

  updateCategory(
    token: string,
    publicId: CategoryId,
    payload: CategoryUpdatePayload,
  ): Promise<CategoryApiResult<CategoryRecord>> {
    return this.execute<CategoryRecord>(
      'PATCH',
      'updateCategory',
      _CategoryRequests.categories.byId(publicId),
      token,
      payload,
      [200],
    );
  }

  updateCategoryStatus(
    token: string,
    publicId: CategoryId,
    payload: CategoryStatusPayload,
  ): Promise<CategoryApiResult<CategoryRecord>> {
    return this.execute<CategoryRecord>(
      'PATCH',
      'updateCategoryStatus',
      _CategoryRequests.categories.status(publicId),
      token,
      payload,
      [200],
    );
  }
}
