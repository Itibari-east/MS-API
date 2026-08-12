import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { CategoryApi } from '../services/category';
import { ClassApi, ClassApiError } from '../services/class';
import { SubClassApi, SubClassApiError } from '../services/subclass';
import { unique } from './testHelpers';
import { CategorySeed, createCategory, cleanupCategory } from './categoryFactory';
export { cleanupCategory } from './categoryFactory';
import {
  ClassCreatePayload,
  ClassListParams,
  ClassRecord,
  ClassStatusPayload,
  ClassUpdatePayload,
  SubClassCreatePayload,
  SubClassListParams,
  SubClassRecord,
  SubClassStatusPayload,
  SubClassUpdatePayload,
} from '../types/category';

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function logHierarchy(message: string, details?: Record<string, unknown>) {
  if (details && Object.keys(details).length > 0) {
    console.log(`[Hierarchy] ${message} ${JSON.stringify(details)}`);
    return;
  }

  console.log(`[Hierarchy] ${message}`);
}

function isConflictError(error: unknown, ErrorCtor: new (...args: any[]) => { status: number }) {
  return error instanceof ErrorCtor && error.status === 409;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientNetworkError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = String((error as { code?: unknown }).code ?? '');
  const message = String((error as { message?: unknown }).message ?? error);
  return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network/i.test(`${code} ${message}`);
}

export interface ClassSeed {
  name: string;
  publicId: string;
  categoryPublicId: string;
  class?: ClassRecord;
}

export interface SubClassSeed {
  name: string;
  publicId: string;
  categoryPublicId: string;
  classPublicId: string;
  subClass?: SubClassRecord;
}

export interface HierarchySeed {
  category: CategorySeed;
  class: ClassSeed;
  subClass: SubClassSeed;
}

export function buildClassCreatePayload(name: string, categoryPublicId: string): ClassCreatePayload {
  return {
    name,
    categoryPublicId,
    description: unique(`Class description ${name}`),
  };
}

export function buildClassUpdatePayload(
  name: string,
  categoryPublicId?: string,
  description = unique('Updated class description'),
): ClassUpdatePayload {
  return {
    name,
    categoryPublicId,
    description,
  };
}

export function buildClassStatusPayload(
  status: string = serviceConstants.commercials.category.status.active,
): ClassStatusPayload {
  return { status };
}

export function buildClassListParams(filters: Partial<ClassListParams> = {}): ClassListParams {
  return {
    search: filters.search,
    status: filters.status ?? serviceConstants.commercials.category.status.active,
    categoryPublicId: filters.categoryPublicId,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'creationTime,DESC',
  };
}

async function resolveClassPublicId(
  classApi: ClassApi,
  token: string,
  name: string,
  categoryPublicId: string,
) {
  const response = await classApi.listClasses(token, {
    search: name,
    categoryPublicId,
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });

  expect(response.status).toBe(200);

  const candidates = listItems(response.data);
  const entity = candidates.find(
    (item) => item?.name === name && String(item?.categoryPublicId ?? '') === categoryPublicId,
  );
  expect(entity, `could not find class with name ${name} in ${JSON.stringify(candidates)}`).toBeTruthy();

  const publicId = String(entity?.publicId ?? entity?.classPublicId ?? '');
  expect(publicId, `class response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export async function createClass(
  classApi: ClassApi,
  token: string,
  categoryPublicId: string,
  namePrefix = 'Class Automation',
): Promise<ClassSeed> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const name = unique(attempt === 1 ? namePrefix : `${namePrefix} Retry ${attempt}`);
    try {
      const response = await classApi.createClass(token, buildClassCreatePayload(name, categoryPublicId));
      expect([200, 201]).toContain(response.status);

      const publicId = String(response.data?.publicId ?? response.data?.classPublicId ?? '');
      const resolvedPublicId = publicId || (await resolveClassPublicId(classApi, token, name, categoryPublicId));
      logHierarchy('created class', { publicId: resolvedPublicId, categoryPublicId });

      return {
        name,
        publicId: resolvedPublicId,
        categoryPublicId,
        class: response.data,
      };
    } catch (error) {
      lastError = error;
      if ((!isConflictError(error, ClassApiError) && !isTransientNetworkError(error)) || attempt === 5) {
        throw error;
      }
      console.warn(
        `[Hierarchy] retrying class creation after ${isConflictError(error, ClassApiError) ? 'conflict' : 'network error'} (attempt ${attempt}/5)`,
      );
      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to create class');
}

export async function expectClassDetails(classApi: ClassApi, token: string, classSeed: ClassSeed) {
  const response = await classApi.getClass(token, classSeed.publicId);
  expect(response.status).toBe(200);
  const body = response.data;
  logHierarchy('class details', { publicId: classSeed.publicId, categoryPublicId: classSeed.categoryPublicId });
  expect(body).toHaveProperty('publicId', classSeed.publicId);
  expect(body).toHaveProperty('name', classSeed.name);
  expect(body).toHaveProperty('categoryPublicId', classSeed.categoryPublicId);
  expect(body).toHaveProperty('status');
  return body;
}

export async function fetchClassItems(
  classApi: ClassApi,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await classApi.listClasses(token, filters);
  expect(response.status).toBe(200);
  const body = response.data;
  logHierarchy('class list', { filters, count: listItems(body).length });
  return listItems(body);
}

export function expectClassItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}

export async function cleanupClass(classApi: ClassApi, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await classApi
    .updateClassStatus(
      token,
      publicId,
      buildClassStatusPayload(serviceConstants.commercials.category.status.inactive),
    )
    .catch((error) => {
      console.warn(`[Class] cleanup skipped for ${publicId}: ${String(error)}`);
    });
}

export function buildSubClassCreatePayload(
  name: string,
  categoryPublicId: string,
  classPublicId: string,
): SubClassCreatePayload {
  return {
    name,
    categoryPublicId,
    classPublicId,
    description: unique(`Sub-class description ${name}`),
  };
}

export function buildSubClassUpdatePayload(
  name: string,
  categoryPublicId?: string,
  classPublicId?: string,
  description = unique('Updated sub-class description'),
): SubClassUpdatePayload {
  return {
    name,
    categoryPublicId,
    classPublicId,
    description,
  };
}

export function buildSubClassStatusPayload(
  status: string = serviceConstants.commercials.category.status.active,
): SubClassStatusPayload {
  return { status };
}

export function buildSubClassListParams(filters: Partial<SubClassListParams> = {}): SubClassListParams {
  return {
    search: filters.search,
    status: filters.status ?? serviceConstants.commercials.category.status.active,
    categoryPublicId: filters.categoryPublicId,
    classPublicId: filters.classPublicId,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'creationTime,DESC',
  };
}

async function resolveSubClassPublicId(
  subClassApi: SubClassApi,
  token: string,
  name: string,
  categoryPublicId: string,
  classPublicId: string,
) {
  const response = await subClassApi.listSubClasses(token, {
    search: name,
    categoryPublicId,
    classPublicId,
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });

  expect(response.status).toBe(200);

  const candidates = listItems(response.data);
  const entity = candidates.find(
    (item) =>
      item?.name === name &&
      String(item?.categoryPublicId ?? '') === categoryPublicId &&
      String(item?.classPublicId ?? '') === classPublicId,
  );
  expect(entity, `could not find subclass with name ${name} in ${JSON.stringify(candidates)}`).toBeTruthy();

  const publicId = String(entity?.publicId ?? entity?.subclassPublicId ?? '');
  expect(publicId, `subclass response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export async function createSubClass(
  subClassApi: SubClassApi,
  token: string,
  categoryPublicId: string,
  classPublicId: string,
  namePrefix = 'SubClass Automation',
): Promise<SubClassSeed> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const name = unique(attempt === 1 ? namePrefix : `${namePrefix} Retry ${attempt}`);
    try {
      const response = await subClassApi.createSubClass(
        token,
        buildSubClassCreatePayload(name, categoryPublicId, classPublicId),
      );
      expect([200, 201]).toContain(response.status);

      const publicId = String(response.data?.publicId ?? response.data?.subclassPublicId ?? '');
      const resolvedPublicId =
        publicId || (await resolveSubClassPublicId(subClassApi, token, name, categoryPublicId, classPublicId));
      logHierarchy('created sub-class', { publicId: resolvedPublicId, categoryPublicId, classPublicId });

      return {
        name,
        publicId: resolvedPublicId,
        categoryPublicId,
        classPublicId,
        subClass: response.data,
      };
    } catch (error) {
      lastError = error;
      if ((!isConflictError(error, SubClassApiError) && !isTransientNetworkError(error)) || attempt === 5) {
        throw error;
      }
      console.warn(
        `[Hierarchy] retrying sub-class creation after ${isConflictError(error, SubClassApiError) ? 'conflict' : 'network error'} (attempt ${attempt}/5)`,
      );
      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unable to create sub-class');
}

export async function expectSubClassDetails(
  subClassApi: SubClassApi,
  token: string,
  subClassSeed: SubClassSeed,
) {
  const response = await subClassApi.getSubClass(token, subClassSeed.publicId);
  expect(response.status).toBe(200);
  const body = response.data;
  logHierarchy('sub-class details', {
    publicId: subClassSeed.publicId,
    categoryPublicId: subClassSeed.categoryPublicId,
    classPublicId: subClassSeed.classPublicId,
  });
  expect(body).toHaveProperty('publicId', subClassSeed.publicId);
  expect(body).toHaveProperty('name', subClassSeed.name);
  expect(body).toHaveProperty('categoryPublicId', subClassSeed.categoryPublicId);
  expect(body).toHaveProperty('classPublicId', subClassSeed.classPublicId);
  expect(body).toHaveProperty('status');
  return body;
}

export async function fetchSubClassItems(
  subClassApi: SubClassApi,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await subClassApi.listSubClasses(token, filters);
  expect(response.status).toBe(200);
  const body = response.data;
  logHierarchy('sub-class list', { filters, count: listItems(body).length });
  return listItems(body);
}

export function expectSubClassItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}

export async function cleanupSubClass(subClassApi: SubClassApi, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await subClassApi
    .updateSubClassStatus(
      token,
      publicId,
      buildSubClassStatusPayload(serviceConstants.commercials.category.status.inactive),
    )
    .catch((error) => {
      console.warn(`[SubClass] cleanup skipped for ${publicId}: ${String(error)}`);
    });
}

export async function createHierarchy(
  categoryApi: CategoryApi,
  classApi: ClassApi,
  subClassApi: SubClassApi,
  token: string,
  namePrefix = 'Hierarchy Automation',
): Promise<HierarchySeed> {
  const category = await createCategory(categoryApi, token, `${namePrefix} Category`);
  const classSeed = await createClass(classApi, token, category.publicId, `${namePrefix} Class`);
  const subClassSeed = await createSubClass(
    subClassApi,
    token,
    category.publicId,
    classSeed.publicId,
    `${namePrefix} SubClass`,
  );

  return {
    category,
    class: classSeed,
    subClass: subClassSeed,
  };
}

export async function cleanupHierarchy(
  categoryApi: CategoryApi,
  classApi: ClassApi,
  subClassApi: SubClassApi,
  token: string,
  hierarchy?: Partial<HierarchySeed>,
) {
  if (hierarchy?.subClass?.publicId) {
    await cleanupSubClass(subClassApi, token, hierarchy.subClass.publicId);
  }

  if (hierarchy?.class?.publicId) {
    await cleanupClass(classApi, token, hierarchy.class.publicId);
  }

  if (hierarchy?.category?.publicId) {
    await cleanupCategory(categoryApi, token, hierarchy.category.publicId);
  }
}
