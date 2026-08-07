import { expect } from '@playwright/test';
import { unique } from './testHelpers';
import { SupplierApi } from '../services/supplier';
import {
  SupplierAdditionalPayload,
  SupplierBankAccountsPayload,
  SupplierBusinessTermsPayload,
  SupplierContactPayload,
  SupplierDeactivatePayload,
  SupplierDocumentMetadataPayload,
  SupplierDraftPayload,
  SupplierMobileMoneyPayload,
  SupplierPointOfContactPayload,
  SupplierRecord,
  SupplierListParams,
} from '../types/supplier';

export const SUPPLIER_FIXTURES = {
  supplierTypeCode: 'MANUFACTURER',
  countryCode: 'TZ',
  cityCode: 'DAR_EAST',
  creditTermsCode: 'COD',
  paymentMethodCode: 'BANK',
  currencyCode: 'TZS',
  productCategoryCode: '',
  primaryDocumentTypeCode: 'TIN_CERTIFICATE',
  secondaryDocumentTypeCode: 'SUPPLIER_CONTRACT',
  businessLicenseDocumentTypeCode: 'BUSINESS_LICENSE',
  reasonCode: 'PERFORMANCE_ISSUES',
  deliveryPerformanceCode: 'EXCELLENT',
};

export interface SupplierSeed {
  name: string;
  publicId: string;
  draft?: SupplierRecord;
}

export function buildSupplierDraftPayload(name: string): SupplierDraftPayload {
  return {
    name,
    supplierTypeCode: SUPPLIER_FIXTURES.supplierTypeCode,
    registrationNumber: unique('REG'),
    tinNumber: unique('TIN'),
    vrnNumber: unique('VRN'),
  };
}

export function buildSupplierContactPayload(): SupplierContactPayload {
  return {
    physicalAddress: 'Automation Street',
    postalAddress: 'P.O. Box 100',
    countryCode: SUPPLIER_FIXTURES.countryCode,
    cityCode: SUPPLIER_FIXTURES.cityCode,
    primaryPhone: '255700000000',
    alternativePhone: '255700000001',
    primaryEmail: 'supplier.automation@itibari.test',
    alternativeEmail: 'supplier.backup@itibari.test',
    website: 'https://itibari.test',
  };
}

export function buildSupplierPrimaryContactPayload(): SupplierPointOfContactPayload {
  return {
    firstName: 'Supplier',
    lastName: 'Primary',
    jobTitle: 'Manager',
    phone: '255700000000',
    alternativePhone: '255700000001',
    primaryEmail: 'supplier.primary@itibari.test',
    secondaryEmail: 'supplier.secondary@itibari.test',
  };
}

export function buildSupplierSecondaryContactPayload(): SupplierPointOfContactPayload {
  return {
    firstName: 'Supplier',
    lastName: 'Secondary',
    jobTitle: 'Coordinator',
    phone: '255700000002',
    alternativePhone: '255700000003',
    primaryEmail: 'supplier.secondary.primary@itibari.test',
    secondaryEmail: 'supplier.secondary.backup@itibari.test',
  };
}

export function buildSupplierBusinessTermsPayload(): SupplierBusinessTermsPayload {
  return {
    creditTermsCode: SUPPLIER_FIXTURES.creditTermsCode,
    creditTermsCustom: 'Net 30 days',
    paymentMethodCodes: [SUPPLIER_FIXTURES.paymentMethodCode],
    currencyCode: SUPPLIER_FIXTURES.currencyCode,
    minimumOrderValue: 1,
    leadDays: 7,
    paymentReminderDays: 3,
  };
}

export function buildSupplierBankingPayload(): SupplierBankAccountsPayload {
  return {
    accounts: [],
  };
}

export function buildSupplierMobileMoneyPayload(): SupplierMobileMoneyPayload {
  return {
    accounts: [],
  };
}

export function buildSupplierAdditionalPayload(): SupplierAdditionalPayload {
  return {
    productCategoryCodes: SUPPLIER_FIXTURES.productCategoryCode ? [SUPPLIER_FIXTURES.productCategoryCode] : [],
    businessLicenseNumber: unique('LIC'),
    notes: 'Created by automation',
  };
}

export function buildSupplierDocumentMetadataPayload(
  documentTypeCode: string = SUPPLIER_FIXTURES.primaryDocumentTypeCode,
  filePrefix = 'supplier-document',
  expiryDate?: string,
): SupplierDocumentMetadataPayload {
  return {
    documentTypeCode,
    storageKey: unique('stub/storage/key'),
    fileName: `${unique(filePrefix)}.pdf`,
    contentType: 'application/pdf',
    sizeBytes: 1024,
    expiryDate,
  };
}

export function buildSupplierDeactivatePayload(reasonCode = SUPPLIER_FIXTURES.reasonCode): SupplierDeactivatePayload {
  return { reasonCode };
}

type SupplierListFilterInput = string | Partial<SupplierListParams>;

export function buildSupplierListParams(filters: SupplierListFilterInput = {}): SupplierListParams {
  const filterParams = typeof filters === 'string' ? { search: filters } : filters;

  return {
    search: filterParams.search ?? filterParams.name ?? filterParams.supplierId ?? filterParams.id,
    name: filterParams.name,
    supplierId: filterParams.supplierId,
    id: filterParams.id,
    status: filterParams.status ?? 'ACTIVE',
    leadDays: filterParams.leadDays ?? 7,
    creditTerms: filterParams.creditTerms ?? SUPPLIER_FIXTURES.creditTermsCode,
    deliveryPerformance: filterParams.deliveryPerformance ?? SUPPLIER_FIXTURES.deliveryPerformanceCode,
    country: filterParams.country ?? SUPPLIER_FIXTURES.countryCode,
    city: filterParams.city ?? SUPPLIER_FIXTURES.cityCode,
    page: filterParams.page ?? 0,
    size: filterParams.size ?? 20,
    sort: filterParams.sort ?? 'creationTime,DESC',
  };
}

export async function createSupplierDraft(
  supplierApi: SupplierApi,
  token: string,
  namePrefix = 'Supplier Automation',
): Promise<SupplierSeed> {
  const name = unique(namePrefix);
  const draftResponse = await supplierApi.createDraft(token, buildSupplierDraftPayload(name));

  expect([200, 201]).toContain(draftResponse.status);

  const publicId = String(draftResponse.data?.publicId ?? draftResponse.data?.supplierId ?? '');
  expect(publicId, 'draft response should include a supplier publicId').toBeTruthy();

  return {
    name,
    publicId,
    draft: draftResponse.data,
  };
}

export async function createCompleteSupplier(
  supplierApi: SupplierApi,
  token: string,
  namePrefix = 'Supplier Automation',
): Promise<SupplierSeed> {
  const seed = await createSupplierDraft(supplierApi, token, namePrefix);

  const contactRes = await supplierApi.upsertContact(token, seed.publicId, buildSupplierContactPayload());
  expect(contactRes.status).toBe(200);

  const primaryContactRes = await supplierApi.upsertPrimaryContact(token, seed.publicId, buildSupplierPrimaryContactPayload());
  expect(primaryContactRes.status).toBe(200);

  const secondaryContactRes = await supplierApi.upsertSecondaryContact(token, seed.publicId, buildSupplierSecondaryContactPayload());
  expect(secondaryContactRes.status).toBe(200);

  const businessTermsRes = await supplierApi.patchBusinessTerms(token, seed.publicId, buildSupplierBusinessTermsPayload());
  expect(businessTermsRes.status).toBe(200);

  const bankingRes = await supplierApi.replaceBanking(token, seed.publicId, buildSupplierBankingPayload());
  expect(bankingRes.status).toBe(200);

  const mobileMoneyRes = await supplierApi.replaceMobileMoney(token, seed.publicId, buildSupplierMobileMoneyPayload());
  expect(mobileMoneyRes.status).toBe(200);

  const additionalRes = await supplierApi.patchAdditional(token, seed.publicId, buildSupplierAdditionalPayload());
  expect(additionalRes.status).toBe(200);

  const primaryDocumentRes = await supplierApi.upsertDocumentMetadata(
    token,
    seed.publicId,
    buildSupplierDocumentMetadataPayload(SUPPLIER_FIXTURES.primaryDocumentTypeCode, 'supplier-primary-document'),
  );
  expect([200, 201]).toContain(primaryDocumentRes.status);

  const secondaryDocumentRes = await supplierApi.upsertDocumentMetadata(
    token,
    seed.publicId,
    buildSupplierDocumentMetadataPayload(
      SUPPLIER_FIXTURES.secondaryDocumentTypeCode,
      'supplier-secondary-document',
      '2026-12-31',
    ),
  );
  expect([200, 201]).toContain(secondaryDocumentRes.status);

  const businessLicenseDocumentRes = await supplierApi.upsertDocumentMetadata(
    token,
    seed.publicId,
    buildSupplierDocumentMetadataPayload(
      SUPPLIER_FIXTURES.businessLicenseDocumentTypeCode,
      'supplier-business-license-document',
      '2026-12-31',
    ),
  );
  expect([200, 201]).toContain(businessLicenseDocumentRes.status);

  const confirmRes = await supplierApi.confirmSupplier(token, seed.publicId);
  expect(confirmRes.status).toBe(200);

  return seed;
}

export async function createMultipleSuppliers(
  supplierApi: SupplierApi,
  token: string,
  count: number,
  namePrefix = 'Supplier Batch',
): Promise<SupplierSeed[]> {
  const suppliers: SupplierSeed[] = [];
  for (let index = 0; index < count; index += 1) {
    suppliers.push(await createCompleteSupplier(supplierApi, token, `${namePrefix} ${index + 1}`));
  }
  return suppliers;
}
