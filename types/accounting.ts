import { QueryParams } from '../services/requestHelpers';

export interface TaxCodeRequest {
  codeName: string;
  codeValue: number;
  applicableTo: Array<'PRODUCT' | 'SUPPLIER'>;
}

export interface TaxCodeResponse {
  publicId?: string;
  code?: number;
  codeName?: string;
  codeValue?: number;
  applicableTo?: Array<'PRODUCT' | 'SUPPLIER'>;
  rateMutable?: boolean;
  [key: string]: unknown;
}

export interface PageTaxCodeResponse {
  content?: TaxCodeResponse[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  [key: string]: unknown;
}

export type TaxCodeListParams = QueryParams & {
  applicableTo?: 'PRODUCT' | 'SUPPLIER';
  page?: number;
  size?: number;
  sort?: string;
};

export interface TaxCodeApiResult<T> {
  status: number;
  data: T;
  raw: string;
  headers: Record<string, string>;
}
