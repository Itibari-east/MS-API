import { _OrderServiceRequests } from '../requests/orderService';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';
import { CreateSalesAgentRequest, SalesAgentStatusActionRequest } from '../types/orderService';

export class _OrderService {
  listSalesAgents(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_OrderServiceRequests.salesAgents.list(), params), undefined, authHeaders(token));
  }

  createSalesAgent(token: string, payload: CreateSalesAgentRequest) {
    return common.postResponse(_OrderServiceRequests.salesAgents.create(), payload, authHeaders(token));
  }

  getSalesAgent(token: string, publicId: string) {
    return common.getResponse(_OrderServiceRequests.salesAgents.byId(publicId), undefined, authHeaders(token));
  }

  deleteSalesAgent(token: string, publicId: string) {
    return common.deleteResponse(_OrderServiceRequests.salesAgents.byId(publicId), undefined, authHeaders(token));
  }

  changeSalesAgentStatus(token: string, publicId: string, payload: SalesAgentStatusActionRequest) {
    return common.patchResponse(_OrderServiceRequests.salesAgents.status(publicId), payload, authHeaders(token));
  }

  listVisits(token: string, publicId: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_OrderServiceRequests.salesAgents.visits(publicId), params), undefined, authHeaders(token));
  }

  exportVisits(token: string, publicId: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_OrderServiceRequests.salesAgents.visitsExport(publicId), params), undefined, authHeaders(token));
  }

  getVisitKpis(token: string, publicId: string) {
    return common.getResponse(_OrderServiceRequests.salesAgents.visitKpis(publicId), undefined, authHeaders(token));
  }

  listVisitSummaries(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_OrderServiceRequests.salesAgents.visitSummaries(), params), undefined, authHeaders(token));
  }

  exportVisitSummaries(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_OrderServiceRequests.salesAgents.visitSummariesExport(), params), undefined, authHeaders(token));
  }

  getMyProfile(token: string) {
    return common.getResponse(_OrderServiceRequests.salesAgents.profile(), undefined, authHeaders(token));
  }
}
