import { expect, test } from '@playwright/test';
import { unique } from './testHelpers';
import { SupplierApi } from '../services/supplier';
import { _AccountingService } from '../services/accounting';
import {
  SupplierAdditionalPayload,
  SupplierBankAccountsPayload,
  SupplierBusinessTermsPayload,
  SupplierContactPayload,
  SupplierDeactivatePayload,
  SupplierDocumentMetadataPayload,
  SupplierDocumentUploadPayload,
  SupplierDraftPayload,
  SupplierDocumentListParams,
  SupplierDocumentExportParams,
  SupplierMobileMoneyPayload,
  SupplierPointOfContactPayload,
  SupplierRecord,
  SupplierListParams,
  SupplierDocumentRecord,
  SupplierProductListParams,
  SupplierRebateListParams,
  SupplierRebateExportParams,
  SupplierPurchaseOrderListParams,
  SupplierPurchaseOrderExportParams,
  SupplierPerformanceDeliveryParams,
  SupplierPerformanceLeadDaysParams,
  SupplierPerformanceDeliverySeriesParams,
  SupplierPerformanceExportParams,
  SupplierReportsDashboardParams,
  SupplierReportsExportParams,
} from '../types/supplier';
import { CreatedEntity, createBank, createBranch } from '../utils/accountingTestHelpers';

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
  bank?: CreatedEntity;
  branch?: CreatedEntity;
  documentsSupported?: boolean;
}

export interface SupplierDocumentSeed {
  supplier: SupplierSeed;
  document: SupplierDocumentRecord;
}

export async function buildSupplierDraftPayload(name: string): Promise<SupplierDraftPayload> {
  return {
    name,
    supplierTypeCode: SUPPLIER_FIXTURES.supplierTypeCode,
    registrationNumber: unique('REG'),
    tinNumber: unique('TIN'),
    vrnNumber: unique('VRN'),
  };
}

export async function buildSupplierContactPayload(): Promise<SupplierContactPayload> {
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

export async function buildSupplierPrimaryContactPayload(): Promise<SupplierPointOfContactPayload> {
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

export async function buildSupplierSecondaryContactPayload(): Promise<SupplierPointOfContactPayload> {
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

export async function buildSupplierBusinessTermsPayload(): Promise<SupplierBusinessTermsPayload> {
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

function supplierAccountNumber() {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

export async function buildSupplierBankingPayload(
  bank?: CreatedEntity,
  branch?: CreatedEntity,
): Promise<SupplierBankAccountsPayload> {
  if (!bank || !branch) {
    return {
      accounts: [],
    };
  }

  return {
    accounts: [
      {
        bankCode: bank.code,
        branchCode: branch.code,
        accountName: `${bank.name} Supplier Account`,
        accountNumber: supplierAccountNumber(),
        swiftCode: bank.swiftCode ?? bank.code,
      },
    ],
  };
}

export async function buildSupplierMobileMoneyPayload(): Promise<SupplierMobileMoneyPayload> {
  return {
    accounts: [],
  };
}

export async function buildSupplierAdditionalPayload(): Promise<SupplierAdditionalPayload> {
  return {
    productCategoryCodes: SUPPLIER_FIXTURES.productCategoryCode ? [SUPPLIER_FIXTURES.productCategoryCode] : [],
    businessLicenseNumber: unique('LIC'),
    notes: 'Created by automation',
  };
}

export async function buildSupplierDocumentMetadataPayload(
  documentTypeCode: string = SUPPLIER_FIXTURES.primaryDocumentTypeCode,
  filePrefix = 'supplier-document',
  expiryDate?: string,
): Promise<SupplierDocumentMetadataPayload> {
  return {
    documentTypeCode,
    storageKey: unique('stub/storage/key'),
    fileName: `${unique(filePrefix)}.pdf`,
    contentType: 'application/pdf',
    sizeBytes: 1024,
    expiryDate,
  };
}

export async function buildSupplierDocumentUploadPayload(
  documentTypeCode: string = SUPPLIER_FIXTURES.secondaryDocumentTypeCode,
  filePrefix = 'supplier-upload',
  expiryDate?: string,
): Promise<SupplierDocumentUploadPayload> {
  const fileName = `${unique(filePrefix)}.pdf`;

  return {
    documentTypeCode,
    storageKey: unique('stub/storage/key'),
    fileName,
    contentType: 'application/pdf',
    expiryDate,
    file: {
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from(`supplier-document:${fileName}`),
    },
  };
}

export async function buildSupplierDocumentListParams(
  filters: Partial<SupplierDocumentListParams> = {},
): Promise<SupplierDocumentListParams> {
  return {
    search: filters.search,
    documentTypeCode: filters.documentTypeCode,
    type: filters.type,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'documentTypeCode,ASC',
  };
}

export async function buildSupplierDocumentExportParams(
  filters: Partial<SupplierDocumentExportParams> = {},
): Promise<SupplierDocumentExportParams> {
  return {
    search: filters.search,
    documentTypeCode: filters.documentTypeCode,
    type: filters.type,
    exportType: filters.exportType ?? 'PDF',
    page: filters.page ?? 0,
    size: filters.size ?? 1000,
    sort: filters.sort ?? 'documentTypeCode,ASC',
  };
}

export async function buildSupplierDeactivatePayload(
  reasonCode = SUPPLIER_FIXTURES.reasonCode,
): Promise<SupplierDeactivatePayload> {
  return { reasonCode };
}

export async function buildSupplierProductListParams(
  filters: Partial<SupplierProductListParams> = {},
): Promise<SupplierProductListParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'ACTIVE',
    category: filters.category,
    minBuyingPrice: filters.minBuyingPrice,
    maxBuyingPrice: filters.maxBuyingPrice,
    recentlyAdded: filters.recentlyAdded,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'linkedAt,DESC',
  };
}

export async function buildSupplierRebateListParams(
  filters: Partial<SupplierRebateListParams> = {},
): Promise<SupplierRebateListParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'PENDING',
    periodFrom: filters.periodFrom,
    periodTo: filters.periodTo,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'period,DESC',
  };
}

export async function buildSupplierRebateExportParams(
  filters: Partial<SupplierRebateExportParams> = {},
): Promise<SupplierRebateExportParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'PENDING',
    periodFrom: filters.periodFrom,
    periodTo: filters.periodTo,
    exportType: filters.exportType ?? 'PDF',
    page: filters.page ?? 0,
    size: filters.size ?? 1000,
    sort: filters.sort ?? 'period,DESC',
  };
}

export async function buildSupplierPurchaseOrderListParams(
  filters: Partial<SupplierPurchaseOrderListParams> = {},
): Promise<SupplierPurchaseOrderListParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'PENDING',
    dateCreatedFrom: filters.dateCreatedFrom,
    dateCreatedTo: filters.dateCreatedTo,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'dateCreated,DESC',
  };
}

export async function buildSupplierPurchaseOrderExportParams(
  filters: Partial<SupplierPurchaseOrderExportParams> = {},
): Promise<SupplierPurchaseOrderExportParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'PENDING',
    dateCreatedFrom: filters.dateCreatedFrom,
    dateCreatedTo: filters.dateCreatedTo,
    exportType: filters.exportType ?? 'PDF',
    page: filters.page ?? 0,
    size: filters.size ?? 1000,
    sort: filters.sort ?? 'dateCreated,DESC',
  };
}

export async function buildSupplierPerformanceDeliveryParams(
  filters: Partial<SupplierPerformanceDeliveryParams> = {},
): Promise<SupplierPerformanceDeliveryParams> {
  return {
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'orderDate,DESC',
  };
}

export async function buildSupplierPerformanceLeadDaysParams(
  year = new Date().getFullYear(),
): Promise<SupplierPerformanceLeadDaysParams> {
  return { year };
}

export async function buildSupplierPerformanceDeliverySeriesParams(
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
): Promise<SupplierPerformanceDeliverySeriesParams> {
  return { year, month };
}

export async function buildSupplierReportsDashboardParams(
  filters: Partial<SupplierReportsDashboardParams> = {},
): Promise<SupplierReportsDashboardParams> {
  return {
    countryCode: filters.countryCode ?? SUPPLIER_FIXTURES.countryCode,
    cityCode: filters.cityCode ?? SUPPLIER_FIXTURES.cityCode,
    from: filters.from,
    to: filters.to,
    page: filters.page ?? 0,
    size: filters.size ?? 20,
    sort: filters.sort ?? 'overallPercent,DESC',
  };
}

export async function buildSupplierReportsExportParams(
  filters: Partial<SupplierReportsExportParams> = {},
): Promise<SupplierReportsExportParams> {
  return {
    search: filters.search,
    status: filters.status ?? 'ACTIVE',
    leadDays: filters.leadDays,
    creditTerms: filters.creditTerms,
    deliveryPerformance: filters.deliveryPerformance,
    country: filters.country ?? SUPPLIER_FIXTURES.countryCode,
    city: filters.city ?? SUPPLIER_FIXTURES.cityCode,
    exportType: filters.exportType ?? 'PDF',
    page: filters.page ?? 0,
    size: filters.size ?? 1000,
    sort: filters.sort ?? 'creationTime,DESC',
  };
}

export async function buildSupplierPerformanceExportParams(
  filters: Partial<SupplierPerformanceExportParams> = {},
): Promise<SupplierPerformanceExportParams> {
  return {
    countryCode: filters.countryCode ?? SUPPLIER_FIXTURES.countryCode,
    cityCode: filters.cityCode ?? SUPPLIER_FIXTURES.cityCode,
    from: filters.from,
    to: filters.to,
    exportType: filters.exportType ?? 'PDF',
    page: filters.page ?? 0,
    size: filters.size ?? 1000,
    sort: filters.sort ?? 'overallPercent,DESC',
  };
}

type SupplierListFilterInput = string | Partial<SupplierListParams>;

export async function buildSupplierListParams(filters: SupplierListFilterInput = {}): Promise<SupplierListParams> {
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
  const draftResponse = await supplierApi.createDraft(token, await buildSupplierDraftPayload(name));

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
  accountingService: _AccountingService,
  token: string,
  namePrefix = 'Supplier Automation',
): Promise<SupplierSeed> {
  const seed = await createSupplierDraft(supplierApi, token, namePrefix);
  let documentsSupported = true;

  const contactRes = await supplierApi.upsertContact(token, seed.publicId, await buildSupplierContactPayload());
  expect(contactRes.status).toBe(200);

  const primaryContactRes = await supplierApi.upsertPrimaryContact(
    token,
    seed.publicId,
    await buildSupplierPrimaryContactPayload(),
  );
  expect(primaryContactRes.status).toBe(200);

  const secondaryContactRes = await supplierApi.upsertSecondaryContact(
    token,
    seed.publicId,
    await buildSupplierSecondaryContactPayload(),
  );
  expect(secondaryContactRes.status).toBe(200);

  const businessTermsRes = await supplierApi.patchBusinessTerms(
    token,
    seed.publicId,
    await buildSupplierBusinessTermsPayload(),
  );
  expect(businessTermsRes.status).toBe(200);

  const bank = await createBank(accountingService, token, `${namePrefix} Bank`);
  const branch = await createBranch(accountingService, token, bank.publicId, `${namePrefix} Branch`);

  const bankingRes = await supplierApi.replaceBanking(
    token,
    seed.publicId,
    await buildSupplierBankingPayload(bank, branch),
  );
  expect(bankingRes.status).toBe(200);

  const mobileMoneyRes = await supplierApi.replaceMobileMoney(
    token,
    seed.publicId,
    await buildSupplierMobileMoneyPayload(),
  );
  expect(mobileMoneyRes.status).toBe(200);

  const additionalRes = await supplierApi.patchAdditional(token, seed.publicId, await buildSupplierAdditionalPayload());
  expect(additionalRes.status).toBe(200);

  try {
    const primaryDocumentRes = await supplierApi.upsertDocumentMetadata(
      token,
      seed.publicId,
      await buildSupplierDocumentMetadataPayload(
        SUPPLIER_FIXTURES.primaryDocumentTypeCode,
        'supplier-primary-document',
      ),
    );
    expect([200, 201]).toContain(primaryDocumentRes.status);

    const secondaryDocumentRes = await supplierApi.upsertDocumentMetadata(
      token,
      seed.publicId,
      await buildSupplierDocumentMetadataPayload(
        SUPPLIER_FIXTURES.secondaryDocumentTypeCode,
        'supplier-secondary-document',
        '2026-12-31',
      ),
    );
    expect([200, 201]).toContain(secondaryDocumentRes.status);

    const businessLicenseDocumentRes = await supplierApi.upsertDocumentMetadata(
      token,
      seed.publicId,
      await buildSupplierDocumentMetadataPayload(
        SUPPLIER_FIXTURES.businessLicenseDocumentTypeCode,
        'supplier-business-license-document',
        '2026-12-31',
      ),
    );
    expect([200, 201]).toContain(businessLicenseDocumentRes.status);
  } catch (error) {
    if (String(error).includes('404')) {
      documentsSupported = false;
      console.warn(`[SupplierFactory] document metadata endpoint unavailable for ${seed.publicId}: ${String(error)}`);
    } else {
      throw error;
    }
  }

  const confirmRes = await supplierApi.confirmSupplier(token, seed.publicId);
  expect(confirmRes.status).toBe(200);

  return {
    ...seed,
    bank,
    branch,
    documentsSupported,
  };
}

export async function createMultipleSuppliers(
  supplierApi: SupplierApi,
  accountingService: _AccountingService,
  token: string,
  count: number,
  namePrefix = 'Supplier Batch',
): Promise<SupplierSeed[]> {
  const suppliers: SupplierSeed[] = [];
  for (let index = 0; index < count; index += 1) {
    suppliers.push(await createCompleteSupplier(supplierApi, accountingService, token, `${namePrefix} ${index + 1}`));
  }
  return suppliers;
}

export async function createSupplierWithUploadedDocument(
  supplierApi: SupplierApi,
  accountingService: _AccountingService,
  token: string,
  namePrefix = 'Supplier Docs',
  documentTypeCode = SUPPLIER_FIXTURES.secondaryDocumentTypeCode,
  expiryDate?: string,
): Promise<SupplierDocumentSeed> {
  const supplier = await createCompleteSupplier(supplierApi, accountingService, token, namePrefix);
  if (!supplier.documentsSupported) {
    test.skip(true, 'supplier document endpoints are not available in this environment');
  }

  const documentExpiryDate =
    expiryDate ?? (documentTypeCode === SUPPLIER_FIXTURES.secondaryDocumentTypeCode ? '2026-12-31' : undefined);
  let documentRes;
  try {
    documentRes = await supplierApi.uploadDocument(
      token,
      supplier.publicId,
      await buildSupplierDocumentUploadPayload(documentTypeCode, 'supplier-upload', documentExpiryDate),
    );
  } catch (error) {
    if (String(error).includes('404')) {
      test.skip(true, 'supplier document upload endpoint is not available in this environment');
    }
    throw error;
  }
  expect([200, 201]).toContain(documentRes.status);

  return {
    supplier,
    document: documentRes.data,
  };
}
