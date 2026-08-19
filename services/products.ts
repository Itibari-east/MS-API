import { APIResponse } from '@playwright/test';
import { _ProductRequests } from '../requests/products';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';
import {
  ProductApprovePayload,
  ProductApiResult,
  ProductId,
  ProductListParams,
  ProductListResponse,
  ProductListItemRecord,
  ProductViewRecord,
  ProductWritePayload,
  ProductWriteResponse,
  UpdateProductBestSellerPayload,
  UpdateProductStatusPayload,
} from '../types/products';

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
    throw new Error(`[ProductApi.${operation}] Expected JSON response but received: ${trimmed.slice(0, 500)}`);
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '<empty>';
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
}

export class ProductApiError extends Error {
  constructor(
    public readonly operation: string,
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`[ProductApi.${operation}] ${method} ${url} failed with ${status}: ${responsePreview(responseBody)}`);
    this.name = 'ProductApiError';
  }
}

export class ProductApi {
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
  ): Promise<ProductApiResult<T>> {
    console.log(`[ProductApi] -> ${operation} ${method} ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}`);

    const response = await this.send(method, url, token, body);
    const status = response.status();
    const raw = await response.text();

    console.log(`[ProductApi] <- ${operation} ${status} ${responsePreview(raw)}`);

    if (!allowedStatuses.includes(status)) {
      throw new ProductApiError(operation, method, url, status, raw);
    }

    return {
      status,
      data: parseJson<T>(raw, operation),
      raw,
      headers: response.headers(),
    };
  }

  listProducts(
    token: string,
    params: ProductListParams,
  ): Promise<ProductApiResult<ProductListResponse>> {
    const url = withQueryParams(_ProductRequests.products.list(), params);
    return this.execute<ProductListResponse>('GET', 'listProducts', url, token, undefined, [200]);
  }

  createProduct(token: string, payload: ProductWritePayload): Promise<ProductApiResult<ProductWriteResponse>> {
    return this.execute<ProductWriteResponse>(
      'POST',
      'createProduct',
      _ProductRequests.products.create(),
      token,
      payload,
      [201],
    );
  }

  getProduct(token: string, publicId: ProductId): Promise<ProductApiResult<ProductViewRecord>> {
    return this.execute<ProductViewRecord>('GET', 'getProduct', _ProductRequests.products.byId(publicId), token, undefined, [200]);
  }

  updateProduct(
    token: string,
    publicId: ProductId,
    payload: ProductWritePayload,
  ): Promise<ProductApiResult<ProductWriteResponse>> {
    return this.execute<ProductWriteResponse>(
      'PATCH',
      'updateProduct',
      _ProductRequests.products.byId(publicId),
      token,
      payload,
      [200],
    );
  }

  deleteProduct(token: string, publicId: ProductId) {
    return this.execute<undefined>('DELETE', 'deleteProduct', _ProductRequests.products.byId(publicId), token, undefined, [204]);
  }

  approveProduct(token: string, publicId: ProductId, payload: ProductApprovePayload) {
    return this.execute<ProductWriteResponse>(
      'POST',
      'approveProduct',
      _ProductRequests.products.approve(publicId),
      token,
      payload,
      [200],
    );
  }

  updateProductStatus(token: string, publicId: ProductId, payload: UpdateProductStatusPayload) {
    return this.execute<ProductWriteResponse>(
      'PATCH',
      'updateProductStatus',
      _ProductRequests.products.status(publicId),
      token,
      payload,
      [200],
    );
  }

  updateProductBestSeller(token: string, publicId: ProductId, payload: UpdateProductBestSellerPayload) {
    return this.execute<ProductWriteResponse>(
      'PATCH',
      'updateProductBestSeller',
      _ProductRequests.products.bestSeller(publicId),
      token,
      payload,
      [200],
    );
  }

  listProductApprovals(token: string, params?: QueryParams) {
    return this.execute<ProductListResponse>(
      'GET',
      'listProductApprovals',
      withQueryParams(_ProductRequests.products.approvals(), params),
      token,
      undefined,
      [200],
    );
  }

  exportProducts(token: string, params?: QueryParams) {
    return this.execute<unknown>(
      'GET',
      'exportProducts',
      withQueryParams(_ProductRequests.products.export(), params),
      token,
      undefined,
      [200],
    );
  }
}
