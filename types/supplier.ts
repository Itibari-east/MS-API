import { QueryParams } from '../services/requestHelpers';

export type SupplierId = string;
export type SupplierStatus = string;

export interface SupplierRecord {
  publicId?: string;
  supplierId?: string;
  name?: string;
  status?: SupplierStatus;
  createdBy?: string | null;
  created_by?: string | null;
  lastModifiedBy?: string | null;
  last_modified_by?: string | null;
  creationTime?: string | null;
  creation_time?: string | null;
  lastModifiedTime?: string | null;
  last_modified_time?: string | null;
  [key: string]: unknown;
}

export interface SupplierActivityRecord {
  occurredAt?: string;
  actor?: string;
  action?: string;
  [key: string]: unknown;
}

export interface SupplierProductRecord {
  publicId?: string;
  productPublicId?: string;
  name?: string;
  status?: string;
  linkedAt?: string;
  category?: string;
  [key: string]: unknown;
}

export interface SupplierDocumentRecord {
  publicId?: string;
  documentTypeCode?: string;
  type?: string;
  fileName?: string;
  storageKey?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SupplierRebateRecord {
  publicId?: string;
  rebatePublicId?: string;
  period?: string;
  status?: string;
  amount?: number;
  currencyCode?: string;
  [key: string]: unknown;
}

export interface SupplierPerformanceRecord {
  publicId?: string;
  orderDate?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  [key: string]: unknown;
}

export type SupplierListResponse = PaginatedResponse<SupplierRecord>;
export type SupplierActivityResponse = PaginatedResponse<SupplierActivityRecord>;
export type SupplierProductListResponse = PaginatedResponse<SupplierProductRecord>;
export type SupplierDocumentListResponse = PaginatedResponse<SupplierDocumentRecord>;
export type SupplierRebateListResponse = PaginatedResponse<SupplierRebateRecord>;
export type SupplierPerformanceDeliveryResponse = PaginatedResponse<SupplierPerformanceRecord>;
export type SupplierSummaryResponse = Record<string, unknown>;

export interface SupplierDraftPayload {
  name: string;
  supplierTypeCode: string;
  registrationNumber?: string;
  tinNumber?: string;
  vrnNumber?: string;
}

export interface SupplierContactPayload {
  physicalAddress: string;
  postalAddress: string;
  countryCode: string;
  cityCode: string;
  primaryPhone: string;
  alternativePhone?: string;
  primaryEmail: string;
  alternativeEmail?: string;
  website?: string;
}

export interface SupplierPointOfContactPayload {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone: string;
  alternativePhone?: string;
  primaryEmail: string;
  secondaryEmail?: string;
}

export interface SupplierBusinessTermsPayload {
  creditTermsCode: string;
  creditTermsCustom?: string;
  paymentMethodCodes: string[];
  currencyCode: string;
  minimumOrderValue?: number;
  leadDays?: number;
  paymentReminderDays?: number;
}

export interface SupplierBankAccountPayload {
  publicId?: string;
  bankCode: string;
  branchCode: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
}

export interface SupplierBankAccountsPayload {
  accounts: SupplierBankAccountPayload[];
}

export interface SupplierMobileMoneyAccountPayload {
  publicId?: string;
  mobileMoneyName: string;
  mobileMoneyNumber: string;
}

export interface SupplierMobileMoneyPayload {
  accounts: SupplierMobileMoneyAccountPayload[];
}

export interface SupplierAdditionalPayload {
  productCategoryCodes: string[];
  businessLicenseNumber?: string;
  notes?: string;
}

export interface SupplierDocumentMetadataPayload {
  documentTypeCode: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  expiryDate?: string;
}

export interface SupplierDocumentUploadPayload {
  documentTypeCode: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  expiryDate?: string;
  file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  };
}

export interface SupplierDeactivatePayload {
  reasonCode: string;
}

export interface SupplierBulkDeactivatePayload {
  publicIds: SupplierId[];
  reasonCode: string;
}

export interface SupplierListParams extends QueryParams {
  search?: string;
  name?: string;
  supplierId?: string;
  id?: string;
  status?: string;
  leadDays?: number;
  creditTerms?: string;
  deliveryPerformance?: string;
  country?: string;
  city?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierActivityParams extends QueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierProductListParams extends QueryParams {
  search?: string;
  status?: string;
  category?: string;
  minBuyingPrice?: number;
  maxBuyingPrice?: number;
  recentlyAdded?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierDocumentListParams extends QueryParams {
  search?: string;
  documentTypeCode?: string;
  type?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierDocumentExportParams extends QueryParams {
  search?: string;
  documentTypeCode?: string;
  type?: string;
  exportType?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierRebateListParams extends QueryParams {
  search?: string;
  status?: string;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierPerformanceDeliveryParams extends QueryParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface SupplierApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
