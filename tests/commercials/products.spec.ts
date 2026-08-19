import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { serviceConstants } from '../../constants/endpoints';
import { createProductBundle, publishProduct, expectProductDetails, fetchProductItems, expectProductItems, buildProductUpdatePayload, cleanupProduct } from '../../helpers/productFactory';

test.describe.serial('@commercials Commercials Service - Products', () => {
  test.setTimeout(150000);

  test('creates a product, approves it and verifies detail and list visibility', async ({
    productApi,
    accountingService,
    commercialsService,
    categoryApi,
    classApi,
    subClassApi,
    packageUnitApi,
    supplierApi,
  }) => {
    const token = getTokenOrSkip();
    const product = await createProductBundle(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      'Product Happy Path',
    );

    const detailBeforePublish = await expectProductDetails(productApi, token, product);
    expect(detailBeforePublish.status).toBeDefined();

    await publishProduct(productApi, token, product);

    const listItems = await fetchProductItems(productApi, token, {
      categoryCode: product.categoryCode,
      search: product.name,
      status: serviceConstants.commercials.product.status.active,
      page: 0,
      size: 20,
      sort: 'name,ASC',
    });

    expectProductItems(
      listItems,
      (item) =>
        String(item.publicId ?? '') === product.publicId &&
        String(item.name ?? '') === product.name,
      'expected the created product to appear in the filtered list',
    );

    await cleanupProduct(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      product,
    );
  });

  test('updates a product and keeps the public id and sku stable', async ({
    productApi,
    accountingService,
    commercialsService,
    categoryApi,
    classApi,
    subClassApi,
    packageUnitApi,
    supplierApi,
  }) => {
    const token = getTokenOrSkip();
    const product = await createProductBundle(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      'Product Update',
    );

    await publishProduct(productApi, token, product);
    const beforeUpdate = await expectProductDetails(productApi, token, product);
    const updatedName = unique('Updated Product');

    const updateRes = await productApi.updateProduct(
      token,
      product.publicId,
      buildProductUpdatePayload(product, {
        name: updatedName,
        sellingPrice: 102000,
        buyingPrice: 97000,
      }),
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.data.publicId).toBe(product.publicId);
    expect(updateRes.data.name).toBe(updatedName);
    expect(updateRes.data.sku).toBe(beforeUpdate.sku);

    const afterUpdate = await expectProductDetails(productApi, token, {
      ...product,
      name: updatedName,
    });
    expect(afterUpdate.sku).toBe(beforeUpdate.sku);

    await cleanupProduct(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      product,
    );
  });

  test('updates product status and best seller flag', async ({
    productApi,
    accountingService,
    commercialsService,
    categoryApi,
    classApi,
    subClassApi,
    packageUnitApi,
    supplierApi,
  }) => {
    const token = getTokenOrSkip();
    const product = await createProductBundle(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      'Product Status',
    );

    await publishProduct(productApi, token, product);

    const inactiveRes = await productApi.updateProductStatus(token, product.publicId, {
      status: serviceConstants.commercials.product.status.inactive,
    });
    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.data.status).toBe(serviceConstants.commercials.product.status.inactive);

    const activeRes = await productApi.updateProductStatus(token, product.publicId, {
      status: serviceConstants.commercials.product.status.active,
    });
    expect(activeRes.status).toBe(200);
    expect(activeRes.data.status).toBe(serviceConstants.commercials.product.status.active);

    const bestSellerRes = await productApi.updateProductBestSeller(token, product.publicId, {
      bestSeller: true,
    });
    expect(bestSellerRes.status).toBe(200);
    expect(bestSellerRes.data.bestSeller).toBeTruthy();

    await cleanupProduct(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      product,
    );
  });

  test('filters products by search, category, pagination and status', async ({
    productApi,
    accountingService,
    commercialsService,
    categoryApi,
    classApi,
    subClassApi,
    packageUnitApi,
    supplierApi,
  }) => {
    const token = getTokenOrSkip();
    const first = await createProductBundle(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      'Product Filter Alpha',
    );

    const secondName = unique('Product Filter Beta');
    const secondResponse = await productApi.createProduct(
      token,
      {
        ...buildProductUpdatePayload(first, { name: secondName, barcode: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13) }),
        name: secondName,
        barcode: `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13),
      },
    );
    expect(secondResponse.status).toBe(201);
    const secondPublicId = String(secondResponse.data.publicId ?? '');
    expect(secondPublicId).toBeTruthy();

    await publishProduct(productApi, token, first);
    await productApi.approveProduct(token, secondPublicId, {
      approved: true,
      comment: 'Approved product filter second',
    });
    await productApi.updateProductStatus(token, secondPublicId, {
      status: serviceConstants.commercials.product.status.active,
    });

    const firstPage = await fetchProductItems(productApi, token, {
      categoryCode: first.categoryCode,
      search: 'Product Filter',
      status: serviceConstants.commercials.product.status.active,
      page: 0,
      size: 1,
      sort: 'name,ASC',
    });
    const secondPage = await fetchProductItems(productApi, token, {
      categoryCode: first.categoryCode,
      search: 'Product Filter',
      status: serviceConstants.commercials.product.status.active,
      page: 1,
      size: 1,
      sort: 'name,ASC',
    });

    expect(firstPage.length).toBeGreaterThan(0);
    expect(secondPage.length).toBeGreaterThan(0);

    const firstPageIds = firstPage.map((item) => String(item.publicId ?? ''));
    const secondPageIds = secondPage.map((item) => String(item.publicId ?? ''));

    expect(firstPageIds).toEqual(expect.arrayContaining([first.publicId, secondPublicId]));
    expect(secondPageIds).toEqual(expect.arrayContaining([first.publicId, secondPublicId]));

    expectProductItems(
      firstPage,
      (item) =>
        String(item.name ?? '').includes('Product Filter'),
      'expected filtered products to match the requested category and search scope',
    );

    await productApi.updateProductStatus(token, secondPublicId, {
      status: serviceConstants.commercials.product.status.inactive,
    });
    await productApi.deleteProduct(token, secondPublicId).catch(() => undefined);
    await cleanupProduct(
      productApi,
      accountingService,
      commercialsService,
      categoryApi,
      classApi,
      subClassApi,
      packageUnitApi,
      supplierApi,
      token,
      first,
    );
  });

  test('rejects malformed product payloads', async ({ productApi }) => {
    const token = getTokenOrSkip();
    await expect(productApi.createProduct(token, {} as any)).rejects.toThrow(
      /400|422|missing|validation|name|supplier|category|uom|tax/i,
    );
  });

  test('rejects product requests without authentication and returns 404 for invalid ids', async ({ productApi }) => {
    await expect(
      productApi.listProducts('', {
        categoryCode: 'TEST',
        search: 'auth-missing',
        page: 0,
        size: 20,
        sort: 'name,ASC',
      }),
    ).rejects.toThrow(/401/i);

    const token = getTokenOrSkip();
    await expect(productApi.getProduct(token, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /404|not found/i,
    );
  });
});
