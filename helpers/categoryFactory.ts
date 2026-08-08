import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { unique } from './testHelpers';
import { CategoryApi } from '../services/category';
import {
  CategoryCreatePayload,
  CategoryListParams,
  CategoryRecord,
  CategoryStatusPayload,
  CategoryUpdatePayload,
} from '../types/category';

export interface CategorySeed {
  name: string;
  publicId: string;
  category?: CategoryRecord;
}

export function buildCategoryCreatePayload(name: string): CategoryCreatePayload {
  return {
    name,
    description: unique('Category description'),
  };
}

export function buildCategoryUpdatePayload(name: string, description = unique('Updated category description')): CategoryUpdatePayload {
  return {
    name,
    description,
  };
}

export function buildCategoryStatusPayload(
  status: string = serviceConstants.commercials.category.status.active,
): CategoryStatusPayload {
  return { status };
}

export function buildCategoryListParams(search?: string): CategoryListParams {
  return {
    search,
    status: serviceConstants.commercials.category.status.active,
    page: 0,
    size: 20,
    sort: 'creationTime,DESC',
  };
}

async function resolveCategoryPublicId(categoryApi: CategoryApi, token: string, name: string) {
  const response = await categoryApi.listCategories(token, {
    search: name,
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });

  expect(response.status).toBe(200);

  const candidates = Array.isArray(response.data?.content) ? response.data.content : [];
  const entity = candidates.find((item) => item?.name === name);
  expect(entity, `could not find category with name ${name} in ${JSON.stringify(response.data)}`).toBeTruthy();

  const publicId = String(entity?.publicId ?? entity?.categoryPublicId ?? '');
  expect(publicId, `category response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export async function createCategory(
  categoryApi: CategoryApi,
  token: string,
  namePrefix = 'Category Automation',
): Promise<CategorySeed> {
  const name = unique(namePrefix);
  const response = await categoryApi.createCategory(token, buildCategoryCreatePayload(name));
  expect([200, 201]).toContain(response.status);

  const publicId = String(response.data?.publicId ?? response.data?.categoryPublicId ?? '');
  const resolvedPublicId = publicId || (await resolveCategoryPublicId(categoryApi, token, name));

  return {
    name,
    publicId: resolvedPublicId,
    category: response.data,
  };
}

export async function deactivateCategory(categoryApi: CategoryApi, token: string, publicId: string) {
  const response = await categoryApi.updateCategoryStatus(
    token,
    publicId,
    buildCategoryStatusPayload(serviceConstants.commercials.category.status.inactive),
  );
  expect(response.status).toBe(200);
  return response.data;
}

export async function reactivateCategory(categoryApi: CategoryApi, token: string, publicId: string) {
  const response = await categoryApi.updateCategoryStatus(
    token,
    publicId,
    buildCategoryStatusPayload(serviceConstants.commercials.category.status.active),
  );
  expect(response.status).toBe(200);
  return response.data;
}

export async function cleanupCategory(categoryApi: CategoryApi, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await categoryApi
    .updateCategoryStatus(
      token,
      publicId,
      buildCategoryStatusPayload(serviceConstants.commercials.category.status.inactive),
    )
    .catch((error) => {
      console.warn(`[Category] cleanup skipped for ${publicId}: ${String(error)}`);
    });
}

export async function fetchCategoryItems(
  categoryApi: CategoryApi,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await categoryApi.listCategories(token, filters);
  expect(response.status).toBe(200);
  return Array.isArray(response.data?.content) ? response.data.content : [];
}

export function expectCategoryItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}
