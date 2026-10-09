export type SalesAgentStatus = 'ACTIVE' | 'DEACTIVATED';
export type SalesAgentAction = 'ACTIVATE' | 'DEACTIVATE';
export type SalesAgentIdentificationType = 'NATIONAL_ID' | 'PASSPORT' | 'DRIVING_LICENSE';

export interface CreateSalesAgentRequest {
  firstName: string;
  lastName: string;
  managerPublicId: string;
  phoneNumber: string;
  email: string;
  regionPublicId: string;
  address: string;
  street: string;
  identificationType: SalesAgentIdentificationType;
  identificationNumber: string;
  geofencePublicIds: string[];
  sendOneTimePassword: boolean;
}

export interface SalesAgentStatusActionRequest {
  action: SalesAgentAction;
  reasonPublicId?: string;
}

export interface SalesAgentRecord {
  publicId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  managerPublicId?: string;
  regionPublicId?: string;
  geofencePublicIds?: string[];
  status?: SalesAgentStatus | string;
  [key: string]: unknown;
}

export interface SalesAgentListResponse {
  content?: SalesAgentRecord[];
  totalElements?: number;
  [key: string]: unknown;
}
