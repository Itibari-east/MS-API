import { QueryParams } from '../services/requestHelpers';

export type PackageUnitId = string;

export interface PackageUnitRecord {
  publicId?: string;
  packagingUnitPublicId?: string;
  packageUnitPublicId?: string;
  code?: string;
  name?: string;
  baseUomPublicId?: string;
  baseUomName?: string;
  baseUom?: {
    publicId?: string;
    name?: string;
  };
  conversionFactor?: number | string;
  description?: string | null;
  status?: string;
  creationTime?: string;
  createdByName?: string | null;
  lastModifiedByName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageUnitListResponse {
  totalElements?: number;
  pageSize?: number;
  totalPages?: number;
  last?: boolean;
  first?: boolean;
  pageNumber?: number;
  content?: PackageUnitRecord[];
}

export interface PackageUnitCreatePayload {
  name: string;
  code: string;
  baseUomPublicId: string;
  conversionFactor: number | string;
  description?: string;
  status?: string;
}

export interface PackageUnitUpdatePayload {
  name?: string;
  baseUomPublicId?: string;
  conversionFactor?: number | string;
  description?: string;
}

export interface PackageUnitStatusPayload {
  status: string;
}

export type PackageUnitListParams = QueryParams & {
  search?: string;
  baseUomPublicId?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
};

export interface PackageUnitApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
