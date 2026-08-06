import { _CommercialsRequests } from '../requests/commercials';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export class _CommercialsService {
  listUoms(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_CommercialsRequests.uoms.list(), params), undefined, authHeaders(token));
  }

  createUom(token: string, payload: unknown) {
    return common.postResponse(_CommercialsRequests.uoms.create(), payload, authHeaders(token));
  }

  getUom(token: string, publicId: string) {
    return common.getResponse(_CommercialsRequests.uoms.byId(publicId), undefined, authHeaders(token));
  }

  updateUom(token: string, publicId: string, payload: unknown) {
    return common.patchResponse(_CommercialsRequests.uoms.byId(publicId), payload, authHeaders(token));
  }

  updateUomStatus(token: string, publicId: string, payload: unknown) {
    return common.patchResponse(_CommercialsRequests.uoms.status(publicId), payload, authHeaders(token));
  }

  deactivateUom(token: string, publicId: string, payload: unknown) {
    return common.postResponse(_CommercialsRequests.uoms.deactivate(publicId), payload, authHeaders(token));
  }
}
