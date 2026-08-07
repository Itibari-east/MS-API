import { QueryParams } from '../services/requestHelpers';

export type CategoryId = string;
export type CategoryStatus = string;

export interface CategoryRecord {
  publicId?: string;
  categoryPublicId?: string;
  name?: string;
  description?: string | null;
  status?: CategoryStatus;
  createdBy?: string | null;
  created_by?: string | null;
  updatedBy?: string | null;
  updated_by?: string | null;
  creationTime?: string | null;
  creation_time?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  pageNumber?: number;
  pageSize?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  [key: string]: unknown;
}

export type CategoryListResponse = PaginatedResponse<CategoryRecord>;

export interface CategoryCreatePayload {
  name: string;
  description?: string;
}

export interface CategoryUpdatePayload {
  name?: string;
  description?: string;
}

export interface CategoryStatusPayload {
  status: string;
}

export interface CategoryListParams extends QueryParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CategoryApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
