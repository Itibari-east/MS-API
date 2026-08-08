import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { buildCategoryListParams, cleanupCategory, createCategory } from '../../helpers/categoryFactory';
import {
  buildClassListParams,
  buildClassUpdatePayload,
  buildSubClassListParams,
  buildSubClassUpdatePayload,
  cleanupClass,
  cleanupSubClass,
  createClass,
  createHierarchy,
  createSubClass,
  expectClassDetails,
  expectClassItems,
  expectSubClassDetails,
  expectSubClassItems,
  fetchClassItems,
  fetchSubClassItems,
} from '../../helpers/hierarchyFactory';

test.describe.serial('Commercials Service - Product Hierarchy', () => {
  test.setTimeout(120000);

  test('creates, verifies, updates and deactivates the full category-class-subclass hierarchy', async ({
    categoryApi,
    classApi,
    subClassApi,
  }) => {
    const token = getTokenOrSkip();
    const hierarchy = await createHierarchy(categoryApi, classApi, subClassApi, token, 'Hierarchy End To End');

    const categoryDetail = await categoryApi.getCategory(token, hierarchy.category.publicId);
    expect(categoryDetail.status).toBe(200);
    expect(categoryDetail.data.publicId ?? categoryDetail.data.categoryPublicId).toBe(hierarchy.category.publicId);
    expect(categoryDetail.data.name).toBe(hierarchy.category.name);
    if (Array.isArray(categoryDetail.data.classes)) {
      expect(categoryDetail.data.classes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publicId: hierarchy.class.publicId,
          }),
        ]),
      );
    }

    const classDetail = await expectClassDetails(classApi, token, hierarchy.class);
    if (Array.isArray((classDetail as { subclasses?: unknown[] }).subclasses)) {
      expect((classDetail as { subclasses?: unknown[] }).subclasses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            publicId: hierarchy.subClass.publicId,
          }),
        ]),
      );
    }

    const subClassDetail = await expectSubClassDetails(subClassApi, token, hierarchy.subClass);
    expect(subClassDetail.categoryPublicId).toBe(hierarchy.category.publicId);
    expect(subClassDetail.classPublicId).toBe(hierarchy.class.publicId);

    const classItems = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        search: hierarchy.class.name,
        categoryPublicId: hierarchy.category.publicId,
        status: serviceConstants.commercials.category.status.active,
      }),
    );
    expectClassItems(
      classItems,
      (item) =>
        String(item.publicId ?? item.classPublicId ?? '') === hierarchy.class.publicId &&
        String(item.categoryPublicId ?? '') === hierarchy.category.publicId,
      'expected the hierarchy class to be returned by the filtered class list',
    );

    const subClassItems = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        search: hierarchy.subClass.name,
        categoryPublicId: hierarchy.category.publicId,
        classPublicId: hierarchy.class.publicId,
        status: serviceConstants.commercials.category.status.active,
      }),
    );
    expectSubClassItems(
      subClassItems,
      (item) =>
        String(item.publicId ?? item.subclassPublicId ?? '') === hierarchy.subClass.publicId &&
        String(item.categoryPublicId ?? '') === hierarchy.category.publicId &&
        String(item.classPublicId ?? '') === hierarchy.class.publicId,
      'expected the hierarchy subclass to be returned by the filtered subclass list',
    );

    const updatedCategoryName = unique('Hierarchy Updated Category');
    const updatedClassName = unique('Hierarchy Updated Class');
    const updatedSubClassName = unique('Hierarchy Updated SubClass');

    const updatedCategoryRes = await categoryApi.updateCategory(token, hierarchy.category.publicId, {
      name: updatedCategoryName,
      description: `Updated ${updatedCategoryName}`,
    });
    expect(updatedCategoryRes.status).toBe(200);
    expect(updatedCategoryRes.data.publicId ?? updatedCategoryRes.data.categoryPublicId).toBe(hierarchy.category.publicId);
    expect(updatedCategoryRes.data.name).toBe(updatedCategoryName);

    const updatedClassRes = await classApi.updateClass(
      token,
      hierarchy.class.publicId,
      buildClassUpdatePayload(updatedClassName, hierarchy.category.publicId, `Updated ${updatedClassName}`),
    );
    expect(updatedClassRes.status).toBe(200);
    expect(updatedClassRes.data.publicId ?? updatedClassRes.data.classPublicId).toBe(hierarchy.class.publicId);
    expect(updatedClassRes.data.name).toBe(updatedClassName);

    const updatedSubClassRes = await subClassApi.updateSubClass(
      token,
      hierarchy.subClass.publicId,
      buildSubClassUpdatePayload(
        updatedSubClassName,
        hierarchy.category.publicId,
        hierarchy.class.publicId,
        `Updated ${updatedSubClassName}`,
      ),
    );
    expect(updatedSubClassRes.status).toBe(200);
    expect(updatedSubClassRes.data.publicId ?? updatedSubClassRes.data.subclassPublicId).toBe(hierarchy.subClass.publicId);
    expect(updatedSubClassRes.data.name).toBe(updatedSubClassName);

    const refreshedCategoryDetail = await categoryApi.getCategory(token, hierarchy.category.publicId);
    expect(refreshedCategoryDetail.status).toBe(200);
    expect(refreshedCategoryDetail.data.name).toBe(updatedCategoryName);

    const refreshedClassDetail = await expectClassDetails(classApi, token, {
      ...hierarchy.class,
      name: updatedClassName,
    });
    expect(refreshedClassDetail.description).toContain('Updated');

    const refreshedSubClassDetail = await expectSubClassDetails(subClassApi, token, {
      ...hierarchy.subClass,
      name: updatedSubClassName,
    });
    expect(refreshedSubClassDetail.description).toContain('Updated');

    const inactiveSubClassRes = await subClassApi.updateSubClassStatus(token, hierarchy.subClass.publicId, {
      status: serviceConstants.commercials.category.status.inactive,
    });
    expect(inactiveSubClassRes.status).toBe(200);

    const inactiveClassRes = await classApi.updateClassStatus(token, hierarchy.class.publicId, {
      status: serviceConstants.commercials.category.status.inactive,
    });
    expect(inactiveClassRes.status).toBe(200);

    const inactiveCategoryRes = await categoryApi.updateCategoryStatus(token, hierarchy.category.publicId, {
      status: serviceConstants.commercials.category.status.inactive,
    });
    expect(inactiveCategoryRes.status).toBe(200);

    const inactiveCategoryDetail = await categoryApi.getCategory(token, hierarchy.category.publicId);
    expect(inactiveCategoryDetail.data.status).toBe(serviceConstants.commercials.category.status.inactive);

    const inactiveClassItems = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        search: updatedClassName,
        categoryPublicId: hierarchy.category.publicId,
        status: serviceConstants.commercials.category.status.inactive,
      }),
    );
    expect(inactiveClassItems.some((item) => String(item.publicId ?? item.classPublicId ?? '') === hierarchy.class.publicId)).toBeTruthy();

    const inactiveSubClassItems = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        search: updatedSubClassName,
        categoryPublicId: hierarchy.category.publicId,
        classPublicId: hierarchy.class.publicId,
        status: serviceConstants.commercials.category.status.inactive,
      }),
    );
    expect(
      inactiveSubClassItems.some((item) => String(item.publicId ?? item.subclassPublicId ?? '') === hierarchy.subClass.publicId),
    ).toBeTruthy();

    await cleanupSubClass(subClassApi, token, hierarchy.subClass.publicId);
    await cleanupClass(classApi, token, hierarchy.class.publicId);
    await cleanupCategory(categoryApi, token, hierarchy.category.publicId);
  });

  test('supports category-to-class-to-subclass filtering for automation-owned data', async ({
    categoryApi,
    classApi,
    subClassApi,
  }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'Hierarchy Filter Category');
    const firstClass = await createClass(classApi, token, category.publicId, 'Hierarchy Filter Class A');
    const secondClass = await createClass(classApi, token, category.publicId, 'Hierarchy Filter Class B');
    const firstSubClass = await createSubClass(subClassApi, token, category.publicId, firstClass.publicId, 'Hierarchy Filter SubClass A');
    const secondSubClass = await createSubClass(subClassApi, token, category.publicId, secondClass.publicId, 'Hierarchy Filter SubClass B');

    const categoryItems = await categoryApi.listCategories(token, buildCategoryListParams(category.name));
    expect(categoryItems.status).toBe(200);
    expect((categoryItems.data.content ?? []).some((item) => item.publicId === category.publicId)).toBeTruthy();

    const classItems = await fetchClassItems(
      classApi,
      token,
      buildClassListParams({
        categoryPublicId: category.publicId,
        search: 'Hierarchy Filter Class',
      }),
    );
    expectClassItems(
      classItems,
      (item) => String(item.categoryPublicId ?? '') === category.publicId,
      'expected class filtering by category to stay within the generated category',
    );

    const subClassItems = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        categoryPublicId: category.publicId,
        classPublicId: firstClass.publicId,
        search: firstSubClass.name,
      }),
    );
    expectSubClassItems(
      subClassItems,
      (item) =>
        String(item.categoryPublicId ?? '') === category.publicId &&
        String(item.classPublicId ?? '') === firstClass.publicId,
      'expected subclass filtering by category and class to stay within the generated hierarchy',
    );

    await cleanupSubClass(subClassApi, token, firstSubClass.publicId);
    await cleanupSubClass(subClassApi, token, secondSubClass.publicId);
    await cleanupClass(classApi, token, firstClass.publicId);
    await cleanupClass(classApi, token, secondClass.publicId);
    await cleanupCategory(categoryApi, token, category.publicId);
  });
});
