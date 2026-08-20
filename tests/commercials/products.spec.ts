import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { serviceConstants } from '../../constants/endpoints';
import { createProductBundle, publishProduct, expectProductDetails, fetchProductItems, expectProductItems, buildProductUpdatePayload, cleanupProduct } from '../../helpers/productFactory';

function extractProductItems(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  if (Array.isArray((body as any)?.content)) {
    return (body as any).content as Array<Record<string, unknown>>;
  }

  return [];
}

function productMatches(seed: { publicId: string; name?: string; barcode?: string }) {
  return (item: Record<string, unknown>) =>
    String(item.publicId ?? '') === seed.publicId ||
    String(item.name ?? '') === String(seed.name ?? '') ||
    String(item.barcode ?? '') === String(seed.barcode ?? '');
}

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

    const firstDetails = await expectProductDetails(productApi, token, first);
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

    const barcodeMatches = await fetchProductItems(productApi, token, {
      categoryCode: first.categoryCode,
      search: first.barcode,
      status: serviceConstants.commercials.product.status.active,
      page: 0,
      size: 20,
      sort: 'name,ASC',
    });
    expectProductItems(barcodeMatches, productMatches(first), 'expected product to be discoverable by barcode search');

    const skuSearch = String(firstDetails.sku ?? '').trim();
    expect(skuSearch).toBeTruthy();
    const skuMatches = await fetchProductItems(productApi, token, {
      categoryCode: first.categoryCode,
      search: skuSearch,
      status: serviceConstants.commercials.product.status.active,
      page: 0,
      size: 20,
      sort: 'name,ASC',
    });
    expectProductItems(skuMatches, productMatches({ publicId: first.publicId }), 'expected product to be discoverable by SKU search');

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

  test('keeps pending products in the approval queue and requires approval before status changes and delete', async ({
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
      'Product Pending Approval',
    );

    const queueBeforeDelete = await productApi.listProductApprovals(token, {
      search: product.name,
      page: 0,
      size: 20,
      sort: 'createdDate,DESC',
    });
    expect(queueBeforeDelete.status).toBe(200);

    const queueBeforeDeleteItems = extractProductItems(queueBeforeDelete.data);
    expectProductItems(queueBeforeDeleteItems, productMatches(product), 'expected a pending product to appear in the approval queue');

    await expect(productApi.deleteProduct(token, product.publicId)).rejects.toThrow(/409|inactive products can be deleted/i);

    await expect(
      productApi.updateProductStatus(token, product.publicId, {
        status: serviceConstants.commercials.product.status.inactive,
      }),
    ).rejects.toThrow(/409|pending products cannot be activated here/i);

    await publishProduct(productApi, token, product, 'Approved pending product for delete flow');

    const inactiveRes = await productApi.updateProductStatus(token, product.publicId, {
      status: serviceConstants.commercials.product.status.inactive,
    });
    expect(inactiveRes.status).toBe(200);

    const deleteRes = await productApi.deleteProduct(token, product.publicId);
    expect(deleteRes.status).toBe(204);

    const queueAfterDelete = await productApi.listProductApprovals(token, {
      search: product.name,
      page: 0,
      size: 20,
      sort: 'createdDate,DESC',
    });
    expect(queueAfterDelete.status).toBe(200);
    const queueAfterDeleteItems = extractProductItems(queueAfterDelete.data);
    expect(queueAfterDeleteItems.some(productMatches(product))).toBeFalsy();

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

  test('exports approved products as a downloadable feed', async ({
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
      'Product Export',
    );

    await publishProduct(productApi, token, product);

    const exportRes = await productApi.exportProducts(token, {
      categoryCode: product.categoryCode,
      search: product.name,
      status: serviceConstants.commercials.product.status.active,
      page: 0,
      size: 20,
      sort: 'name,ASC',
      exportType: 'PDF',
    });
    expect(exportRes.status).toBe(200);
    expect(String(exportRes.raw ?? '').trim()).toContain('%PDF');
    expect(String(exportRes.headers['content-type'] ?? '').toLowerCase()).toContain('pdf');

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

  test('documents duplicate barcode handling as a known backend gap', async ({
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
      'Product Duplicate Barcode',
    );

    const duplicate = await productApi.createProduct(
      token,
      buildProductUpdatePayload(first, {
        name: unique('Duplicate Barcode Product'),
        barcode: first.barcode,
      }),
    );
    expect(duplicate.status).toBe(201);
    expect(duplicate.data.barcode).toBe(first.barcode);

    const duplicatePublicId = String(duplicate.data.publicId ?? '');
    expect(duplicatePublicId).toBeTruthy();
    await productApi.approveProduct(token, duplicatePublicId, {
      approved: true,
      comment: 'Approved duplicate barcode product for cleanup',
    });
    await productApi.updateProductStatus(token, duplicatePublicId, {
      status: serviceConstants.commercials.product.status.inactive,
    });
    await productApi.deleteProduct(token, duplicatePublicId);

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

  test('rejects write operations for unknown product ids', async ({
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
      'Product Invalid Id',
    );

    const invalidId = '00000000-0000-0000-0000-000000000000';
    await expect(
      productApi.updateProduct(token, invalidId, buildProductUpdatePayload(product, { name: unique('Invalid Update') })),
    ).rejects.toThrow(/404|not found/i);
    await expect(
      productApi.updateProductStatus(token, invalidId, {
        status: serviceConstants.commercials.product.status.inactive,
      }),
    ).rejects.toThrow(/404|not found/i);
    await expect(
      productApi.updateProductBestSeller(token, invalidId, {
        bestSeller: true,
      }),
    ).rejects.toThrow(/404|not found/i);
    await expect(
      productApi.approveProduct(token, invalidId, {
        approved: true,
        comment: 'Invalid approval id',
      }),
    ).rejects.toThrow(/404|not found/i);
    await expect(productApi.deleteProduct(token, invalidId)).rejects.toThrow(/404|not found/i);

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
