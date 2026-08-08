import { QueryParams } from '../services/requestHelpers';

export type CategoryId = string;
export type CategoryStatus = string;

export interface CategoryRecord {
  publicId?: string;
  categoryPublicId?: string;
  name?: string;
  description?: string | null;
  status?: CategoryStatus;
  classes?: ClassRecord[];
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

export type ClassId = string;
export type ClassStatus = string;

export interface ClassRecord {
  publicId?: string;
  classPublicId?: string;
  name?: string;
  description?: string | null;
  status?: ClassStatus;
  categoryPublicId?: string;
  categoryName?: string;
  subclasses?: SubClassRecord[];
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

export type ClassListResponse = PaginatedResponse<ClassRecord>;

export type SubClassId = string;
export type SubClassStatus = string;

export interface SubClassRecord {
  publicId?: string;
  subclassPublicId?: string;
  name?: string;
  description?: string | null;
  status?: SubClassStatus;
  categoryPublicId?: string;
  categoryName?: string;
  classPublicId?: string;
  className?: string;
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

export type SubClassListResponse = PaginatedResponse<SubClassRecord>;

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

export interface ClassCreatePayload {
  name: string;
  categoryPublicId: string;
  description?: string;
}

export interface ClassUpdatePayload {
  name?: string;
  description?: string;
  categoryPublicId?: string;
}

export interface ClassStatusPayload {
  status: string;
}

export interface ClassListParams extends QueryParams {
  search?: string;
  status?: string;
  categoryPublicId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ClassApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}

export interface SubClassCreatePayload {
  name: string;
  categoryPublicId: string;
  classPublicId: string;
  description?: string;
}

export interface SubClassUpdatePayload {
  name?: string;
  description?: string;
  categoryPublicId?: string;
  classPublicId?: string;
}

export interface SubClassStatusPayload {
  status: string;
}

export interface SubClassListParams extends QueryParams {
  search?: string;
  status?: string;
  categoryPublicId?: string;
  classPublicId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface SubClassApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
