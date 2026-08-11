import { _LogisticsRequests } from '../requests/logistics';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export class _LogisticsService {
  listDeliveryAgents(token: string, params?: QueryParams) {
    return common.getResponse(
      withQueryParams(_LogisticsRequests.deliveryAgents.list(), params),
      undefined,
      authHeaders(token),
    );
  }

  createDeliveryAgent(token: string, payload: unknown) {
    return common.postResponse(_LogisticsRequests.deliveryAgents.create(), payload, authHeaders(token));
  }

  getDeliveryAgent(token: string, publicId: string) {
    return common.getResponse(_LogisticsRequests.deliveryAgents.byId(publicId), undefined, authHeaders(token));
  }

  updateDeliveryAgent(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_LogisticsRequests.deliveryAgents.byId(publicId), payload, authHeaders(token));
  }

  deleteDeliveryAgent(token: string, publicId: string) {
    return common.deleteResponse(_LogisticsRequests.deliveryAgents.byId(publicId), undefined, authHeaders(token));
  }
}
