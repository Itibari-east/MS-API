import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { buildCategoryStatusPayload, createCategory, cleanupCategory } from '../../helpers/categoryFactory';
import {
  buildClassCreatePayload,
  buildClassListParams,
  buildClassStatusPayload,
  buildSubClassCreatePayload,
  buildSubClassListParams,
  buildSubClassStatusPayload,
  buildSubClassUpdatePayload,
  cleanupClass,
  cleanupSubClass,
  createClass,
  createSubClass,
  expectSubClassDetails,
  expectSubClassItems,
  fetchSubClassItems,
} from '../../helpers/hierarchyFactory';

test.describe.serial('Commercials Service - Sub-Classes', () => {
  test.setTimeout(100000);

  test('creates a subclass under a valid class and verifies detail, list visibility and update flow', async ({
    categoryApi,
    classApi,
    subClassApi,
  }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'SubClass Category');
    const classSeed = await createClass(classApi, token, category.publicId, 'SubClass Class');
    const subClassSeed = await createSubClass(subClassApi, token, category.publicId, classSeed.publicId, 'SubClass Happy Path');

    const detail = await expectSubClassDetails(subClassApi, token, subClassSeed);
    expect(detail.name).toBe(subClassSeed.name);
    expect(detail.categoryPublicId).toBe(category.publicId);
    expect(detail.classPublicId).toBe(classSeed.publicId);
    expect(detail.status).toBe(serviceConstants.commercials.category.status.active);

    const listItems = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        search: subClassSeed.name,
        categoryPublicId: category.publicId,
        classPublicId: classSeed.publicId,
        status: serviceConstants.commercials.category.status.active,
      }),
    );
    expectSubClassItems(
      listItems,
      (item) =>
        String(item.publicId ?? item.subclassPublicId ?? '') === subClassSeed.publicId &&
        String(item.categoryPublicId ?? '') === category.publicId &&
        String(item.classPublicId ?? '') === classSeed.publicId,
      'expected the subclass list to include the generated subclass',
    );

    const updatedName = unique('Updated SubClass');
    const updatedDescription = unique('Updated SubClass Description');
    const updateRes = await subClassApi.updateSubClass(
      token,
      subClassSeed.publicId,
      buildSubClassUpdatePayload(updatedName, category.publicId, classSeed.publicId, updatedDescription),
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.data.publicId ?? updateRes.data.subclassPublicId).toBe(subClassSeed.publicId);
    expect(updateRes.data.name).toBe(updatedName);
    expect(updateRes.data.categoryPublicId).toBe(category.publicId);
    expect(updateRes.data.classPublicId).toBe(classSeed.publicId);

    const updatedDetail = await expectSubClassDetails(subClassApi, token, {
      ...subClassSeed,
      name: updatedName,
    });
    expect(updatedDetail.description).toBe(updatedDescription);

    const inactiveRes = await subClassApi.updateSubClassStatus(
      token,
      subClassSeed.publicId,
      buildSubClassStatusPayload(serviceConstants.commercials.category.status.inactive),
    );
    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.data.status).toBe(serviceConstants.commercials.category.status.inactive);

    await cleanupSubClass(subClassApi, token, subClassSeed.publicId);
    await cleanupClass(classApi, token, classSeed.publicId);
    await cleanupCategory(categoryApi, token, category.publicId);
  });

  test('allows the same subclass name under another class', async ({ categoryApi, classApi, subClassApi }) => {
    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'SubClass Shared Category');
    const firstClass = await createClass(classApi, token, category.publicId, 'SubClass Shared Class A');
    const secondClass = await createClass(classApi, token, category.publicId, 'SubClass Shared Class B');
    const sharedName = unique('Shared SubClass');

    const firstSubClass = await subClassApi.createSubClass(
      token,
      buildSubClassCreatePayload(sharedName, category.publicId, firstClass.publicId),
    );
    expect([200, 201]).toContain(firstSubClass.status);

    const secondSubClass = await subClassApi.createSubClass(
      token,
      buildSubClassCreatePayload(sharedName, category.publicId, secondClass.publicId),
    );
    expect([200, 201]).toContain(secondSubClass.status);

    const firstList = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        search: sharedName,
        categoryPublicId: category.publicId,
        classPublicId: firstClass.publicId,
      }),
    );
    const secondList = await fetchSubClassItems(
      subClassApi,
      token,
      buildSubClassListParams({
        search: sharedName,
        categoryPublicId: category.publicId,
        classPublicId: secondClass.publicId,
      }),
    );

    expect(
      firstList.some(
        (item) =>
          String(item.publicId ?? item.subclassPublicId ?? '') === String(firstSubClass.data?.publicId ?? firstSubClass.data?.subclassPublicId ?? '') &&
          String(item.categoryPublicId ?? '') === category.publicId &&
          String(item.classPublicId ?? '') === firstClass.publicId,
      ),
    ).toBeTruthy();
    expect(
      secondList.some(
        (item) =>
          String(item.publicId ?? item.subclassPublicId ?? '') === String(secondSubClass.data?.publicId ?? secondSubClass.data?.subclassPublicId ?? '') &&
          String(item.categoryPublicId ?? '') === category.publicId &&
          String(item.classPublicId ?? '') === secondClass.publicId,
      ),
    ).toBeTruthy();

    await cleanupSubClass(
      subClassApi,
      token,
      String(firstSubClass.data?.publicId ?? firstSubClass.data?.subclassPublicId ?? ''),
    );
    await cleanupSubClass(
      subClassApi,
      token,
      String(secondSubClass.data?.publicId ?? secondSubClass.data?.subclassPublicId ?? ''),
    );
    await cleanupClass(classApi, token, firstClass.publicId);
    await cleanupClass(classApi, token, secondClass.publicId);
    await cleanupCategory(categoryApi, token, category.publicId);
  });

  test('rejects duplicate subclass names within the same class', async ({ categoryApi, classApi, subClassApi }) => {
    test.fail(true, 'backend currently allows duplicate subclass names within the same class');

    const token = getTokenOrSkip();
    const category = await createCategory(categoryApi, token, 'SubClass Unique Category');
    const classSeed = await createClass(classApi, token, category.publicId, 'SubClass Unique Class');
    const sharedName = unique('Shared SubClass');

    const firstSubClass = await subClassApi.createSubClass(
      token,
      buildSubClassCreatePayload(sharedName, category.publicId, classSeed.publicId),
    );
    expect([200, 201]).toContain(firstSubClass.status);

    await expect(
      subClassApi.createSubClass(token, buildSubClassCreatePayload(sharedName, category.publicId, classSeed.publicId)),
    ).rejects.toThrow(/400|409|422|duplicate|unique|already exists/i);

    await cleanupSubClass(
      subClassApi,
      token,
      String(firstSubClass.data?.publicId ?? firstSubClass.data?.subclassPublicId ?? ''),
    );
    await cleanupClass(classApi, token, classSeed.publicId);
    await cleanupCategory(categoryApi, token, category.publicId);
  });

  test('rejects subclass creation for mismatched category and class parents', async ({ categoryApi, classApi, subClassApi }) => {
    const token = getTokenOrSkip();
    const categoryA = await createCategory(categoryApi, token, 'SubClass Mismatch Category A');
    const categoryB = await createCategory(categoryApi, token, 'SubClass Mismatch Category B');
    const classA = await createClass(classApi, token, categoryA.publicId, 'SubClass Mismatch Class A');
    const classB = await createClass(classApi, token, categoryB.publicId, 'SubClass Mismatch Class B');

    await expect(
      subClassApi.createSubClass(token, buildSubClassCreatePayload('Mismatched SubClass', categoryA.publicId, classB.publicId)),
    ).rejects.toThrow(/400|409|422|invalid|mismatch|category|class/i);

    await expect(
      subClassApi.createSubClass(token, buildSubClassCreatePayload('Missing Class SubClass', categoryA.publicId, '00000000-0000-0000-0000-000000000000')),
    ).rejects.toThrow(/400|404|422|invalid|missing|class/i);

    await cleanupClass(classApi, token, classA.publicId);
    await cleanupClass(classApi, token, classB.publicId);
    await cleanupCategory(categoryApi, token, categoryA.publicId);
    await cleanupCategory(categoryApi, token, categoryB.publicId);
  });

  test('rejects subclass requests without authentication', async ({ subClassApi }) => {
    await expect(
      subClassApi.listSubClasses('', buildSubClassListParams({ search: 'auth-missing' })),
    ).rejects.toThrow(/401/i);
  });
});
