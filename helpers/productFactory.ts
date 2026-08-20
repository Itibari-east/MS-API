import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { ProductApi } from '../services/products';
import { _AccountingService } from '../services/accounting';
import { CategoryApi } from '../services/category';
import { ClassApi } from '../services/class';
import { SubClassApi } from '../services/subclass';
import { PackageUnitApi } from '../services/packageUnit';
import { SupplierApi } from '../services/supplier';
import { unique } from './testHelpers';
import { createBaseUom, createPackageUnit, cleanupPackageUnit, CreatedPackageUnit } from './packageUnitFactory';
import { buildSupplierDeactivatePayload, createCompleteSupplier } from './supplierFactory';
import { cleanupTaxCode, createTaxCode } from '../utils/accountingTestHelpers';
import { ProductListParams, ProductWritePayload, ProductWriteResponse } from '../types/products';
import { TaxCodeResponse } from '../types/accounting';

export interface ProductSeed {
  name: string;
  publicId: string;
  barcode: string;
  categoryCode: string;
  categoryPublicId: string;
  classPublicId: string;
  subclassPublicId?: string;
  uomPublicId: string;
  uomCode: string;
  packagingUnitPublicId: string;
  supplierPublicId: string;
  taxMappingPublicId: string;
  product?: ProductWriteResponse;
  packageUnit?: CreatedPackageUnit['packageUnit'];
  supplier?: Awaited<ReturnType<typeof createCompleteSupplier>>;
  tax?: TaxCodeResponse;
}

type ExistingHierarchy = {
  categoryCode: string;
  categoryPublicId: string;
  classPublicId: string;
  subclassPublicId?: string;
};

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function logProduct(message: string, details?: Record<string, unknown>) {
  if (details && Object.keys(details).length > 0) {
    console.log(`[Product] ${message} ${JSON.stringify(details)}`);
    return;
  }

  console.log(`[Product] ${message}`);
}

function normalizeCode(code: string) {
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
}

async function resolveExistingHierarchy(
  categoryApi: CategoryApi,
  classApi: ClassApi,
  subClassApi: SubClassApi,
  token: string,
): Promise<ExistingHierarchy> {
  const pageSize = 100;

  for (let page = 0; page < 50; page += 1) {
    const classResponse = await classApi.listClasses(token, {
      status: serviceConstants.commercials.category.status.active,
      page,
      size: pageSize,
      sort: 'creationTime,DESC',
    });
    expect(classResponse.status).toBe(200);

    const classes = listItems(classResponse.data);
    if (classes.length === 0) {
      break;
    }

    for (const classItem of classes) {
      const categoryPublicId = String(classItem?.categoryPublicId ?? '');
      const classPublicId = String(classItem?.publicId ?? classItem?.classPublicId ?? '');
      if (!categoryPublicId || !classPublicId) {
        continue;
      }

      const subClassResponse = await subClassApi.listSubClasses(token, {
        categoryPublicId,
        classPublicId,
        status: serviceConstants.commercials.category.status.active,
        page: 0,
        size: 20,
        sort: 'creationTime,DESC',
      });
      expect(subClassResponse.status).toBe(200);

      const subClasses = listItems(subClassResponse.data);
      if (subClasses.length === 0) {
        continue;
      }

      const categoryDetailRes = await categoryApi.getCategory(token, categoryPublicId);
      expect(categoryDetailRes.status).toBe(200);

      const categoryCode = String(categoryDetailRes.data?.categoryCode ?? '');
      if (!categoryCode) {
        continue;
      }

      const subclassPublicId = String(subClasses[0]?.publicId ?? subClasses[0]?.subclassPublicId ?? '');
      const hierarchy = {
        categoryCode,
        categoryPublicId,
        classPublicId,
        subclassPublicId: subclassPublicId || undefined,
      } satisfies ExistingHierarchy;

      logProduct('resolved hierarchy', hierarchy);
      return hierarchy;
    }

    if (classes.length < pageSize) {
      break;
    }
  }

  throw new Error('Unable to resolve an existing active category/class hierarchy for product tests');
}

export function buildProductCreatePayload(
  seed: ProductSeed,
  overrides?: Partial<ProductWritePayload>,
): ProductWritePayload {
  const subclassPublicId = overrides?.subclassPublicId ?? seed.subclassPublicId ?? undefined;
  const base = {
    name: seed.name,
    barcode: overrides?.barcode ?? seed.barcode ?? `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13),
    buyingPrice: 96000,
    sellingPrice: 100000,
    taxMappingPublicId: seed.taxMappingPublicId,
    taxName: seed.tax?.codeName ?? 'VAT',
    taxRate: seed.tax?.codeValue ?? 18,
    customTaxRate: 16,
    supplierPublicIds: [seed.supplierPublicId],
    categoryPublicId: seed.categoryPublicId,
    uomPublicId: seed.uomPublicId,
    uomCode: seed.uomCode,
    brand: `Automation ${seed.name}`,
    packageSize: '10 by 3',
    purchaseUnitSize: 10,
    purchaseUnitName: 'Carton',
    sellingUnit: 1,
    sellingUnitName: 'Packet',
    weight: 1,
    minimumOrderQuantity: 5,
    minimumStockAlert: 20,
    dimensions: {
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
    },
    classPublicId: seed.classPublicId,
    subclassPublicId,
    clearClass: overrides?.clearClass ?? false,
    clearSubclass: overrides?.clearSubclass ?? !subclassPublicId,
    packagingUnitPublicId: seed.packagingUnitPublicId,
    clearPackagingUnit: overrides?.clearPackagingUnit ?? false,
  };

  return {
    ...base,
    ...overrides,
    dimensions: overrides?.dimensions ?? base.dimensions,
    supplierPublicIds: overrides?.supplierPublicIds ?? base.supplierPublicIds,
    subclassPublicId: overrides?.subclassPublicId ?? base.subclassPublicId,
    clearClass: overrides?.clearClass ?? base.clearClass,
    clearSubclass: overrides?.clearSubclass ?? base.clearSubclass,
    clearPackagingUnit: overrides?.clearPackagingUnit ?? base.clearPackagingUnit,
  };
}

export function buildProductUpdatePayload(
  seed: ProductSeed,
  overrides?: Partial<ProductWritePayload>,
): ProductWritePayload {
  return buildProductCreatePayload(
    {
      ...seed,
      name: overrides?.name ?? `${seed.name} Updated`,
    },
    {
      ...overrides,
      name: overrides?.name ?? `${seed.name} Updated`,
    },
  );
}

export function buildProductListParams(filters: Partial<ProductListParams> = {}): ProductListParams {
  if (!filters.categoryCode) {
    throw new Error('buildProductListParams requires categoryCode');
  }

  return {
    categoryCode: filters.categoryCode,
    search: filters.search,
    status: filters.status ?? serviceConstants.commercials.product.status.active,
    stockStatus: filters.stockStatus,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'name,ASC',
  };
}

async function resolveProductPublicId(productApi: ProductApi, token: string, categoryCode: string, name: string) {
  const response = await productApi.listProducts(token, buildProductListParams({ categoryCode, search: name }));
  expect(response.status).toBe(200);
  const entity = listItems(response.data).find((item) => item?.name === name);
  expect(entity, `could not find product with name ${name} in ${JSON.stringify(response.data)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? '');
  expect(publicId, `product response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export async function createProductBundle(
  productApi: ProductApi,
  accountingService: _AccountingService,
  commercialsService: { createUom: (...args: any[]) => Promise<any>; updateUomStatus: (...args: any[]) => Promise<any> },
  categoryApi: CategoryApi,
  classApi: ClassApi,
  subClassApi: SubClassApi,
  packageUnitApi: PackageUnitApi,
  supplierApi: SupplierApi,
  token: string,
  namePrefix = 'Product Automation',
): Promise<ProductSeed> {
  const name = unique(namePrefix);
  const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 13);
  const hierarchy = await resolveExistingHierarchy(categoryApi, classApi, subClassApi, token);
  const uom = await createBaseUom(commercialsService as any, token, `${namePrefix} UOM`);
  const packageUnit = await createPackageUnit(packageUnitApi, token, {
    baseUom: uom,
    namePrefix: `${namePrefix} Package Unit`,
    codePrefix: normalizeCode(namePrefix) || 'PKG',
    conversionFactor: 12,
    status: serviceConstants.commercials.packageUnit.status.active,
  });
  const supplier = await createCompleteSupplier(supplierApi, accountingService, token, `${namePrefix} Supplier`);
  const tax = await createTaxCode(accountingService, token, 'VAT', 18, ['PRODUCT']);

  const createPayload = buildProductCreatePayload({
    name,
    publicId: '',
    barcode,
    categoryCode: hierarchy.categoryCode,
    categoryPublicId: hierarchy.categoryPublicId,
    classPublicId: hierarchy.classPublicId,
    subclassPublicId: hierarchy.subclassPublicId,
    uomPublicId: uom.publicId,
    uomCode: uom.code,
    packagingUnitPublicId: packageUnit.publicId,
    supplierPublicId: supplier.publicId,
    taxMappingPublicId: tax.publicId,
    product: undefined,
    packageUnit: packageUnit.packageUnit,
    supplier,
    tax: tax.tax,
  });

  const response = await productApi.createProduct(token, createPayload);
  expect(response.status).toBe(201);

  const publicId = String(response.data?.publicId ?? '') || (await resolveProductPublicId(productApi, token, hierarchy.categoryCode, name));
  logProduct('created product', { publicId, categoryCode: hierarchy.categoryCode, categoryPublicId: hierarchy.categoryPublicId });

  return {
    name,
    publicId,
    barcode,
    categoryCode: hierarchy.categoryCode,
    categoryPublicId: hierarchy.categoryPublicId,
    classPublicId: hierarchy.classPublicId,
    subclassPublicId: hierarchy.subclassPublicId,
    uomPublicId: uom.publicId,
    uomCode: uom.code,
    packagingUnitPublicId: packageUnit.publicId,
    supplierPublicId: supplier.publicId,
    taxMappingPublicId: tax.publicId,
    product: response.data,
    packageUnit: packageUnit.packageUnit,
    supplier,
    tax: tax.tax,
  };
}

export async function publishProduct(productApi: ProductApi, token: string, product: ProductSeed, comment = 'Approved by automation') {
  const approveRes = await productApi.approveProduct(token, product.publicId, {
    approved: true,
    comment,
  });
  expect(approveRes.status).toBe(200);

  const statusRes = await productApi.updateProductStatus(token, product.publicId, {
    status: serviceConstants.commercials.product.status.active,
  });
  expect(statusRes.status).toBe(200);

  return statusRes.data;
}

export async function expectProductDetails(productApi: ProductApi, token: string, product: ProductSeed) {
  const response = await productApi.getProduct(token, product.publicId);
  expect(response.status).toBe(200);
  const body = response.data;
  logProduct('details', { publicId: product.publicId, categoryCode: product.categoryCode });
  expect(body.publicId).toBe(product.publicId);
  expect(body.name).toBe(product.name);
  expect(body.categoryPublicId).toBe(product.categoryPublicId);
  expect(body.classPublicId).toBe(product.classPublicId);
  expect(body.subclassPublicId).toBe(product.subclassPublicId);
  return body;
}

export async function fetchProductItems(
  productApi: ProductApi,
  token: string,
  filters: Partial<ProductListParams>,
) {
  const response = await productApi.listProducts(token, buildProductListParams(filters));
  expect(response.status).toBe(200);
  const items = listItems(response.data);
  logProduct('list', { filters, count: items.length });
  return items;
}

export function expectProductItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}

export async function cleanupProduct(
  productApi: ProductApi,
  accountingService: _AccountingService,
  commercialsService: { updateUomStatus: (...args: any[]) => Promise<any> },
  categoryApi: CategoryApi,
  classApi: ClassApi,
  subClassApi: SubClassApi,
  packageUnitApi: PackageUnitApi,
  supplierApi: SupplierApi,
  token: string,
  product?: ProductSeed,
) {
  if (!product) {
    return;
  }

  await productApi.deleteProduct(token, product.publicId).catch(async (error) => {
    console.warn(`[Product] delete cleanup skipped for ${product.publicId}: ${String(error)}`);
    await productApi
      .updateProductStatus(token, product.publicId, {
        status: serviceConstants.commercials.product.status.inactive,
      })
      .catch((statusError) => {
        console.warn(`[Product] status cleanup skipped for ${product.publicId}: ${String(statusError)}`);
      });

    await productApi.deleteProduct(token, product.publicId).catch((deleteError) => {
      console.warn(`[Product] retry delete cleanup skipped for ${product.publicId}: ${String(deleteError)}`);
    });
  });

  if (product.supplier?.publicId ?? product.supplierPublicId) {
    await supplierApi
      .deactivateSupplier(
        token,
        product.supplier?.publicId ?? product.supplierPublicId,
        await buildSupplierDeactivatePayload(),
      )
      .catch((error) => {
        console.warn(`[Product] supplier cleanup skipped for ${product.supplierPublicId}: ${String(error)}`);
      });

    if (product.supplier?.branch?.publicId && product.supplier?.bank?.publicId && product.supplier.branchManaged !== false) {
      await accountingService.deleteBranch(token, product.supplier.bank.publicId, product.supplier.branch.publicId).catch((error) => {
        console.warn(`[Product] branch cleanup skipped for ${product.supplier.branch.publicId}: ${String(error)}`);
      });
    }

    if (product.supplier?.bank?.publicId && product.supplier.bankManaged !== false) {
      await accountingService.deleteBank(token, product.supplier.bank.publicId).catch((error) => {
        console.warn(`[Product] bank cleanup skipped for ${product.supplier.bank?.publicId}: ${String(error)}`);
      });
    }
  }

  if (product.taxMappingPublicId) {
    await cleanupTaxCode(accountingService, token, product.taxMappingPublicId);
  }

  await cleanupPackageUnit(packageUnitApi, token, product.packagingUnitPublicId).catch((error) => {
    console.warn(`[Product] package unit cleanup skipped for ${product.packagingUnitPublicId}: ${String(error)}`);
  });
  await commercialsService
    .updateUomStatus(token, product.uomPublicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    })
    .catch((error) => {
      console.warn(`[Product] uom cleanup skipped for ${product.uomPublicId}: ${String(error)}`);
    });
}
