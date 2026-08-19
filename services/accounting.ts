import { _AccountingRequests } from '../requests/accounting';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';
import { TaxCodeApiResult, TaxCodeListParams, TaxCodeRequest, TaxCodeResponse, PageTaxCodeResponse } from '../types/accounting';

export class _AccountingService {
  listTaxCodeKinds(token: string) {
    return common.getResponse(_AccountingRequests.taxes.kinds(), undefined, authHeaders(token));
  }

  listTaxCodes(token: string, params?: TaxCodeListParams): Promise<TaxCodeApiResult<PageTaxCodeResponse>> {
    return common.getResponse(withQueryParams(_AccountingRequests.taxes.list(), params), undefined, authHeaders(token));
  }

  createTaxCode(token: string, payload: TaxCodeRequest): Promise<TaxCodeApiResult<TaxCodeResponse>> {
    return common.postResponse(_AccountingRequests.taxes.create(), payload, authHeaders(token));
  }

  getTaxCode(token: string, publicId: string): Promise<TaxCodeApiResult<TaxCodeResponse>> {
    return common.getResponse(_AccountingRequests.taxes.byId(publicId), undefined, authHeaders(token));
  }

  updateTaxCode(token: string, publicId: string, payload: TaxCodeRequest): Promise<TaxCodeApiResult<TaxCodeResponse>> {
    return common.patchResponse(_AccountingRequests.taxes.byId(publicId), payload, authHeaders(token));
  }

  deleteTaxCode(token: string, publicId: string) {
    return common.deleteResponse(_AccountingRequests.taxes.byId(publicId), undefined, authHeaders(token));
  }

  listBanks(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_AccountingRequests.banks.list(), params), undefined, authHeaders(token));
  }

  createBank(token: string, payload: unknown) {
    return common.postResponse(_AccountingRequests.banks.create(), payload, authHeaders(token));
  }

  getBank(token: string, publicId: string) {
    return common.getResponse(_AccountingRequests.banks.byId(publicId), undefined, authHeaders(token));
  }

  updateBank(token: string, publicId: string, payload: unknown) {
    return common.patchResponse(_AccountingRequests.banks.byId(publicId), payload, authHeaders(token));
  }

  updateBankStatus(token: string, publicId: string, payload: unknown) {
    return common.patchResponse(_AccountingRequests.banks.status(publicId), payload, authHeaders(token));
  }

  deleteBank(token: string, publicId: string) {
    return common.deleteResponse(_AccountingRequests.banks.byId(publicId), undefined, authHeaders(token));
  }

  listBranches(token: string, publicId: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_AccountingRequests.banks.branches(publicId), params), undefined, authHeaders(token));
  }

  createBranch(token: string, publicId: string, payload: unknown) {
    return common.postResponse(_AccountingRequests.banks.branches(publicId), payload, authHeaders(token));
  }

  updateBranch(token: string, publicId: string, branchPublicId: string, payload: unknown) {
    return common.patchResponse(_AccountingRequests.banks.branchById(publicId, branchPublicId), payload, authHeaders(token));
  }

  deleteBranch(token: string, publicId: string, branchPublicId: string) {
    return common.deleteResponse(_AccountingRequests.banks.branchById(publicId, branchPublicId), undefined, authHeaders(token));
  }

  replaceSupplierBankAccounts(token: string, supplierPublicId: string, payload: unknown) {
    return common.patchResponse(_AccountingRequests.supplierBankAccounts.replace(supplierPublicId), payload, authHeaders(token));
  }
}
