import { QueryParams } from '../services/requestHelpers';

export type ProductId = string;

export interface ProductDimensionsRequest {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ProductDimensionsResponse {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ProductWritePayload {
  name: string;
  barcode?: string;
  buyingPrice: number;
  sellingPrice: number;
  taxMappingPublicId: string;
  taxName: string;
  taxRate: number;
  customTaxRate?: number;
  supplierPublicIds: string[];
  categoryPublicId: string;
  uomPublicId: string;
  uomCode: string;
  brand?: string;
  packageSize?: string;
  purchaseUnitSize?: number;
  purchaseUnitName?: string;
  sellingUnit?: number;
  sellingUnitName?: string;
  weight?: number;
  minimumOrderQuantity?: number;
  minimumStockAlert: number;
  dimensions?: ProductDimensionsRequest;
  classPublicId?: string;
  subclassPublicId?: string;
  clearClass?: boolean;
  clearSubclass?: boolean;
  packagingUnitPublicId?: string;
  clearPackagingUnit?: boolean;
}

export interface ProductApprovePayload {
  approved: boolean;
  comment?: string;
}

export interface UpdateProductStatusPayload {
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
}

export interface UpdateProductBestSellerPayload {
  bestSeller: boolean;
}

export interface ProductListParams extends QueryParams {
  categoryCode: string;
  search?: string;
  status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  stockStatus?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ProductListItemRecord {
  publicId?: string;
  name?: string;
  bestSeller?: boolean;
  barcode?: string;
  sku?: string;
  packageSize?: string;
  uomCode?: string;
  uom?: string;
  taxAmount?: number;
  taxRate?: number;
  totalStock?: number;
  availableStock?: number;
  bookedStock?: number;
  quarantineStock?: number;
  onHoldStock?: number;
  stockStatus?: string;
  approvedBy?: string;
  status?: string;
  classPublicId?: string;
  class?: string;
  subclassPublicId?: string;
  subclass?: string;
  packagingUnitPublicId?: string;
  packagingUnit?: string;
  [key: string]: unknown;
}

export interface ProductViewRecord {
  publicId?: string;
  name?: string;
  status?: string;
  sku?: string;
  bestSeller?: boolean;
  category?: string;
  categoryPublicId?: string;
  classPublicId?: string;
  class?: string;
  subclassPublicId?: string;
  subclass?: string;
  packagingUnitPublicId?: string;
  packagingUnit?: string;
  sellingPrice?: number;
  buyingPrice?: number;
  customTaxRate?: number;
  purchaseUnitName?: string;
  sellingUnitName?: string;
  stockStatus?: string;
  totalStock?: number;
  availableStock?: number;
  bookedStock?: number;
  quarantineStock?: number;
  onHoldStock?: number;
  suppliers?: Array<{ publicId?: string; name?: string }>;
  warehouses?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ProductWriteResponse extends ProductViewRecord {
  taxMappingPublicId?: string;
  taxName?: string;
  taxRate?: number;
  barcode?: string;
  packageSize?: string;
  uomPublicId?: string;
  uomCode?: string;
  brand?: string;
  purchaseUnitSize?: number;
  purchaseUnitName?: string;
  sellingUnit?: number;
  sellingUnitName?: string;
  weight?: number;
  minimumOrderQuantity?: number;
  minimumStockAlert?: number;
  dimensions?: ProductDimensionsResponse;
}

export interface PageProductListItemResponse {
  totalElements?: number;
  totalPages?: number;
  pageable?: Record<string, unknown>;
  last?: boolean;
  first?: boolean;
  numberOfElements?: number;
  size?: number;
  content?: ProductListItemRecord[];
  number?: number;
  sort?: Record<string, unknown>;
  empty?: boolean;
}

export type ProductListResponse = PageProductListItemResponse | ProductListItemRecord[];

export interface ProductApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
