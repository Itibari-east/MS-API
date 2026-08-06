import { _AccountingRequests } from '../requests/accounting';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export class _AccountingService {
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
