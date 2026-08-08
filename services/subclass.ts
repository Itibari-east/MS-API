import { APIResponse } from '@playwright/test';
import { _SubClassRequests } from '../requests/subclass';
import { common } from '../utils/common';
import { authHeaders, withQueryParams } from './requestHelpers';
import {
  SubClassApiResult,
  SubClassCreatePayload,
  SubClassId,
  SubClassListParams,
  SubClassListResponse,
  SubClassRecord,
  SubClassStatusPayload,
  SubClassUpdatePayload,
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
    throw new Error(`[SubClassApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class SubClassApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`[SubClassApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`);
    this.name = 'SubClassApiError';
  }
}

export class SubClassApi {
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
  ): Promise<SubClassApiResult<T>> {
    console.log(`[SubClassApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[SubClassApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new SubClassApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listSubClasses(token: string, params?: SubClassListParams): Promise<SubClassApiResult<SubClassListResponse>> {
    const url = withQueryParams(_SubClassRequests.subclasses.list(), params);
    return this.execute<SubClassListResponse>('GET', 'listSubClasses', url, token, undefined, [200]);
  }

  createSubClass(token: string, payload: SubClassCreatePayload): Promise<SubClassApiResult<SubClassRecord>> {
    return this.execute<SubClassRecord>(
      'POST',
      'createSubClass',
      _SubClassRequests.subclasses.create(),
      token,
      payload,
      [200, 201],
    );
  }

  getSubClass(token: string, publicId: SubClassId): Promise<SubClassApiResult<SubClassRecord>> {
    return this.execute<SubClassRecord>(
      'GET',
      'getSubClass',
      _SubClassRequests.subclasses.byId(publicId),
      token,
      undefined,
      [200],
    );
  }

  updateSubClass(
    token: string,
    publicId: SubClassId,
    payload: SubClassUpdatePayload,
  ): Promise<SubClassApiResult<SubClassRecord>> {
    return this.execute<SubClassRecord>(
      'PATCH',
      'updateSubClass',
      _SubClassRequests.subclasses.byId(publicId),
      token,
      payload,
      [200],
    );
  }

  updateSubClassStatus(
    token: string,
    publicId: SubClassId,
    payload: SubClassStatusPayload,
  ): Promise<SubClassApiResult<SubClassRecord>> {
    return this.execute<SubClassRecord>(
      'PATCH',
      'updateSubClassStatus',
      _SubClassRequests.subclasses.status(publicId),
      token,
      payload,
      [200],
    );
  }
}
