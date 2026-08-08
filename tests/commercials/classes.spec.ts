import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { buildCategoryStatusPayload, createCategory, deactivateCategory } from '../../helpers/categoryFactory';
import {
  buildClassCreatePayload,
  buildClassListParams,
  buildClassStatusPayload,
  buildClassUpdatePayload,
  cleanupCategory,
  cleanupClass,
  createClass,
  expectClassDetails,
  expectClassItems,
  fetchClassItems,
} from '../../helpers/hierarchyFactory';

test.describe.serial('@commercials Commercials Service - Classes', () => {
  test.setTimeout(100000);

  test('creates a class under an active category and verifies detail, list visibility and update flow', async ({
    categoryApi,
    classApi,
  }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Class Category');
    const classSeed = await createClass(classApi, token, category.publicId, 'Class Happy Path');

    const detail = await expectClassDetails(classApi, token, classSeed);
    expect(detail.name).toBe(classSeed.name);
    expect(detail.categoryPublicId).toBe(category.publicId);
    expect(detail.status).toBe(serviceConstants.commercials.category.status.active);

    const listItems = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        search: classSeed.name,
        categoryPublicId: category.publicId,
        status: serviceConstants.commercials.category.status.active,
      }),
    );
    expectClassItems(
      listItems,
      (item) =>
        String(item.publicId ?? item.classPublicId ?? '') === classSeed.publicId &&
        String(item.categoryPublicId ?? '') === category.publicId,
      'expected the class list to include the generated class',
    );

    const updatedName = unique('Updated Class');
    const updatedDescription = unique('Updated Class Description');
    const updateRes = await classApi.updateClass(
      token,
      classSeed.publicId,
      buildClassUpdatePayload(updatedName, category.publicId, updatedDescription),
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.data.publicId ?? updateRes.data.classPublicId).toBe(classSeed.publicId);
    expect(updateRes.data.name).toBe(updatedName);
    expect(updateRes.data.categoryPublicId).toBe(category.publicId);

    const updatedDetail = await expectClassDetails(classApi, token, {
      ...classSeed,
      name: updatedName,
    });
    expect(updatedDetail.description).toBe(updatedDescription);

    const inactiveRes = await classApi.updateClassStatus(
      token,
      classSeed.publicId,
      buildClassStatusPayload(serviceConstants.commercials.category.status.inactive),
    );
    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.data.status).toBe(serviceConstants.commercials.category.status.inactive);

    await cleanupClass(classApi, token, classSeed.publicId);
    await cleanupCategory(categoryApi, token, category.publicId);
  });

  test('allows the same class name in another category', async ({ categoryApi, classApi }) => {
    const token = getTokenOrSkip();
    const firstCategory = await createCategory(categoryApi, token, 'Class Shared Category A');
    const secondCategory = await createCategory(categoryApi, token, 'Class Shared Category B');
    const sharedName = unique('Shared Class');

    const firstClass = await classApi.createClass(token, buildClassCreatePayload(sharedName, firstCategory.publicId));
    expect([200, 201]).toContain(firstClass.status);

    const secondClass = await classApi.createClass(token, buildClassCreatePayload(sharedName, secondCategory.publicId));
    expect([200, 201]).toContain(secondClass.status);

    const firstList = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        search: sharedName,
        categoryPublicId: firstCategory.publicId,
      }),
    );
    const secondList = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        search: sharedName,
        categoryPublicId: secondCategory.publicId,
      }),
    );

    expect(
      firstList.some(
        (item) =>
          String(item.publicId ?? item.classPublicId ?? '') === String(firstClass.data?.publicId ?? firstClass.data?.classPublicId ?? '') &&
          String(item.categoryPublicId ?? '') === firstCategory.publicId,
      ),
    ).toBeTruthy();
    expect(
      secondList.some(
        (item) =>
          String(item.publicId ?? item.classPublicId ?? '') === String(secondClass.data?.publicId ?? secondClass.data?.classPublicId ?? '') &&
          String(item.categoryPublicId ?? '') === secondCategory.publicId,
      ),
    ).toBeTruthy();

    await cleanupCategory(categoryApi, token, firstCategory.publicId);
    await cleanupCategory(categoryApi, token, secondCategory.publicId);
  });

  test('rejects duplicate class names within the same category', async ({ categoryApi, classApi }) => {
    test.fail(true, 'backend currently allows duplicate class names within the same category');

    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Class Unique Category');
    const sharedName = unique('Shared Class');

    const firstClass = await classApi.createClass(token, buildClassCreatePayload(sharedName, category.publicId));
    expect([200, 201]).toContain(firstClass.status);

    await expect(classApi.createClass(token, buildClassCreatePayload(sharedName, category.publicId))).rejects.toThrow(
      /400|409|422|duplicate|unique|already exists/i,
    );

    await cleanupCategory(categoryApi, token, category.publicId);
  });

  test('rejects class creation for inactive or invalid categories', async ({ categoryApi, classApi }) => {
    test.fail(true, 'backend currently allows class creation under inactive categories');

    const token = getTokenOrSkip();
    const inactiveCategory = await createCategory(categoryApi, token, 'Inactive Class Category');
    await deactivateCategory(categoryApi, token, inactiveCategory.publicId);

    await expect(
      classApi.createClass(token, buildClassCreatePayload('Inactive Category Class', inactiveCategory.publicId)),
    ).rejects.toThrow(/400|409|422|inactive|active|category/i);

    await expect(
      classApi.createClass(token, buildClassCreatePayload('Missing Category Class', '00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(/400|404|422|invalid|missing|category/i);

    await cleanupCategory(categoryApi, token, inactiveCategory.publicId);
  });

  test('rejects class requests without authentication', async ({ classApi }) => {
    await expect(
      classApi.listClasses('', buildClassListParams({ search: 'auth-missing' })),
    ).rejects.toThrow(/401/i);
  });
});
