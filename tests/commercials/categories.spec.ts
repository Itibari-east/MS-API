import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import { serviceConstants } from '../../constants/endpoints';
import {
  buildCategoryListParams,
  buildCategoryUpdatePayload,
  createCategory,
  cleanupCategory,
  expectCategoryItems,
  fetchCategoryItems,
} from '../../helpers/categoryFactory';

test.describe('Commercials Service - Categories', () => {
  test.setTimeout(100000);

  test('creates a category and verifies detail and list visibility', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Category Happy Path');

    try {
      const detailRes = await categoryApi.getCategory(token, category.publicId);
      expect(detailRes.status).toBe(200);

      const detail = detailRes.data;
      expect(detail.publicId ?? detail.categoryPublicId).toBe(category.publicId);
      expect(detail.name).toBe(category.name);
      expect(detail.description).toBeTruthy();
      expect(detail.status).toBe(serviceConstants.commercials.category.status.active);

      const listRes = await categoryApi.listCategories(token, buildCategoryListParams(category.name));
      expect(listRes.status).toBe(200);
      expect(listRes.data.content ?? []).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publicId: category.publicId,
            name: category.name,
          }),
        ]),
      );
    } finally {
      await cleanupCategory(categoryApi, token, category.publicId);
    }
  });

  test('updates a category and preserves the public id', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Category Update');
    const updatedName = `Updated ${category.name}`;
    const updatedDescription = `Updated ${category.name} description`;

    try {
      const updateRes = await categoryApi.updateCategory(
        token,
        category.publicId,
        buildCategoryUpdatePayload(updatedName, updatedDescription),
      );
      expect(updateRes.status).toBe(200);
      expect(updateRes.data.publicId ?? updateRes.data.categoryPublicId).toBe(category.publicId);
      expect(updateRes.data.name).toBe(updatedName);
      expect(updateRes.data.description).toBe(updatedDescription);

      const detailRes = await categoryApi.getCategory(token, category.publicId);
      expect(detailRes.status).toBe(200);
      expect(detailRes.data.publicId ?? detailRes.data.categoryPublicId).toBe(category.publicId);
      expect(detailRes.data.name).toBe(updatedName);
      expect(detailRes.data.description).toBe(updatedDescription);
    } finally {
      await cleanupCategory(categoryApi, token, category.publicId);
    }
  });

  test('toggles category status between active and inactive', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Category Status');

    try {
      const inactiveRes = await categoryApi.updateCategoryStatus(token, category.publicId, {
        status: serviceConstants.commercials.category.status.inactive,
      });
      expect(inactiveRes.status).toBe(200);
      expect(inactiveRes.data.status).toBe(serviceConstants.commercials.category.status.inactive);

      const inactiveDetailRes = await categoryApi.getCategory(token, category.publicId);
      expect(inactiveDetailRes.status).toBe(200);
      expect(inactiveDetailRes.data.status).toBe(serviceConstants.commercials.category.status.inactive);

      const activeRes = await categoryApi.updateCategoryStatus(token, category.publicId, {
        status: serviceConstants.commercials.category.status.active,
      });
      expect(activeRes.status).toBe(200);
      expect(activeRes.data.status).toBe(serviceConstants.commercials.category.status.active);
    } finally {
      await cleanupCategory(categoryApi, token, category.publicId);
    }
  });

  test('filters categories by search, pagination and status', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    const first = await createCategory(categoryApi, token, 'Category Search Alpha');
    const second = await createCategory(categoryApi, token, 'Category Search Beta');

    try {
      const items = await fetchCategoryItems(categoryApi, token, {
        search: 'Category Search',
        status: serviceConstants.commercials.category.status.active,
        page: 0,
        size: 1,
        sort: 'creationTime,DESC',
      });

      expectCategoryItems(
        items,
        (item) =>
          String(item.name ?? '').includes('Category Search') &&
          item.status === serviceConstants.commercials.category.status.active,
        'expected search results to include the generated category scope',
      );

      const listRes = await categoryApi.listCategories(token, buildCategoryListParams('Category Search'));
      expect(listRes.status).toBe(200);
      expect((listRes.data.content ?? []).some((item) => item.publicId === first.publicId)).toBeTruthy();
      expect((listRes.data.content ?? []).some((item) => item.publicId === second.publicId)).toBeTruthy();
    } finally {
      await cleanupCategory(categoryApi, token, first.publicId);
      await cleanupCategory(categoryApi, token, second.publicId);
    }
  });

  test('rejects category requests without authentication', async ({ categoryApi }) => {
    await expect(categoryApi.listCategories('', buildCategoryListParams('auth-missing'))).rejects.toThrow(/401/i);
  });

  test('returns 404 for an invalid category id', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    await expect(categoryApi.getCategory(token, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /404|not found/i,
    );
  });

  test('rejects malformed category payloads', async ({ categoryApi }) => {
    const token = getTokenOrSkip();
    await expect(categoryApi.createCategory(token, { name: '' })).rejects.toThrow(/400|422|missing|validation|name/i);
  });
});
