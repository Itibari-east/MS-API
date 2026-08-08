import { APIResponse } from '@playwright/test';
import { _ClassRequests } from '../requests/class';
import { common } from '../utils/common';
import { authHeaders, withQueryParams } from './requestHelpers';
import {
  ClassApiResult,
  ClassCreatePayload,
  ClassId,
  ClassListParams,
  ClassListResponse,
  ClassRecord,
  ClassStatusPayload,
  ClassUpdatePayload,
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
    throw new Error(`[ClassApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class ClassApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`[ClassApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`);
    this.name = 'ClassApiError';
  }
}

export class ClassApi {
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
  ): Promise<ClassApiResult<T>> {
    console.log(`[ClassApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[ClassApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new ClassApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listClasses(token: string, params?: ClassListParams): Promise<ClassApiResult<ClassListResponse>> {
    const url = withQueryParams(_ClassRequests.classes.list(), params);
    return this.execute<ClassListResponse>('GET', 'listClasses', url, token, undefined, [200]);
  }

  createClass(token: string, payload: ClassCreatePayload): Promise<ClassApiResult<ClassRecord>> {
    return this.execute<ClassRecord>(
      'POST',
      'createClass',
      _ClassRequests.classes.create(),
      token,
      payload,
      [200, 201],
    );
  }

  getClass(token: string, publicId: ClassId): Promise<ClassApiResult<ClassRecord>> {
    return this.execute<ClassRecord>('GET', 'getClass', _ClassRequests.classes.byId(publicId), token, undefined, [200]);
  }

  updateClass(
    token: string,
    publicId: ClassId,
    payload: ClassUpdatePayload,
  ): Promise<ClassApiResult<ClassRecord>> {
    return this.execute<ClassRecord>(
      'PATCH',
      'updateClass',
      _ClassRequests.classes.byId(publicId),
      token,
      payload,
      [200],
    );
  }

  updateClassStatus(
    token: string,
    publicId: ClassId,
    payload: ClassStatusPayload,
  ): Promise<ClassApiResult<ClassRecord>> {
    return this.execute<ClassRecord>(
      'PATCH',
      'updateClassStatus',
      _ClassRequests.classes.status(publicId),
      token,
      payload,
      [200],
    );
  }
}
