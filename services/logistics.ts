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

  listVehicleOwners(token: string, params?: QueryParams) {
    return common.getResponse(
      withQueryParams(_LogisticsRequests.vehicleOwners.list(), params),
      undefined,
      authHeaders(token),
    );
  }

  createVehicleOwner(token: string, payload: unknown) {
    return common.postResponse(_LogisticsRequests.vehicleOwners.create(), payload, authHeaders(token));
  }

  getVehicleOwner(token: string, publicId: string) {
    return common.getResponse(_LogisticsRequests.vehicleOwners.byId(publicId), undefined, authHeaders(token));
  }

  updateVehicleOwner(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_LogisticsRequests.vehicleOwners.byId(publicId), payload, authHeaders(token));
  }

  deleteVehicleOwner(token: string, publicId: string) {
    return common.deleteResponse(_LogisticsRequests.vehicleOwners.byId(publicId), undefined, authHeaders(token));
  }

  listVehicles(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_LogisticsRequests.vehicles.list(), params), undefined, authHeaders(token));
  }

  createVehicle(token: string, payload: unknown) {
    return common.postResponse(_LogisticsRequests.vehicles.create(), payload, authHeaders(token));
  }

  getVehicle(token: string, publicId: string) {
    return common.getResponse(_LogisticsRequests.vehicles.byId(publicId), undefined, authHeaders(token));
  }

  updateVehicle(token: string, publicId: string, payload: unknown) {
    return common.putResponse(_LogisticsRequests.vehicles.byId(publicId), payload, authHeaders(token));
  }

  deleteVehicle(token: string, publicId: string) {
    return common.deleteResponse(_LogisticsRequests.vehicles.byId(publicId), undefined, authHeaders(token));
  }
}
