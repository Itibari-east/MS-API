export type DeliveryAgentIdentificationType = 'NATIONAL_ID' | 'PASSPORT' | 'TIN';

export interface DeliveryAgentCreatePayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  identificationType: DeliveryAgentIdentificationType;
  identificationNumber: string;
  regionPublicId: string;
  branchPublicId: string;
  street: string;
  address: string;
  nextOfKin: string;
  nextOfKinPhoneNumber: string;
  active: boolean;
}

export interface DeliveryAgentUpdatePayload extends DeliveryAgentCreatePayload {}

export interface DeliveryAgentRecord {
  publicId?: string;
  creationTime?: string;
  lastModifiedDate?: string;
  createdByName?: string;
  deliveryAgent?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  identificationType?: DeliveryAgentIdentificationType | string;
  identificationNumber?: string;
  regionPublicId?: string;
  branchPublicId?: string;
  region?: { publicId?: string; name?: string } | string;
  branch?: { publicId?: string; name?: string } | string;
  street?: string;
  address?: string;
  nextOfKin?: string;
  nextOfKinPhoneNumber?: string;
  status?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface DeliveryAgentListResponse {
  content?: DeliveryAgentRecord[];
  totalElements?: number;
  totalPages?: number;
  pageSize?: number;
  size?: number;
  number?: number;
  [key: string]: unknown;
}
