export type DeliveryAgentIdentificationType = 'NATIONAL_ID' | 'PASSPORT' | 'TIN';
export type VehicleOwnerIdentificationType = 'NATIONAL_ID' | 'PASSPORT' | 'TIN';
export type VehicleType = 'TRUCK' | 'TRAILER' | 'VAN' | 'MOTORCYCLE' | 'BICYCLE' | 'TUKTUK' | 'OTHER';
export type VehicleInsuranceType = 'COMPREHENSIVE' | 'THIRD_PARTY';

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

export interface VehicleOwnerContactRequest {
  [key: string]: unknown;
}

export interface VehicleOwnerCreatePayload {
  regionPublicId: string;
  ownerFirstName: string;
  ownerLastName: string;
  phoneNumber: string;
  identificationType: VehicleOwnerIdentificationType;
  tinNumber: string;
  vrnNumber: string;
  address: string;
  street: string;
  active: boolean;
  contacts?: VehicleOwnerContactRequest[];
}

export interface VehicleOwnerUpdatePayload extends VehicleOwnerCreatePayload {}

export interface VehicleOwnerRecord {
  publicId?: string;
  creationTime?: string;
  lastModifiedDate?: string;
  createdByName?: string;
  regionPublicId?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  phoneNumber?: string;
  identificationType?: VehicleOwnerIdentificationType | string;
  tinNumber?: string;
  vrnNumber?: string;
  address?: string;
  street?: string;
  active?: boolean;
  status?: string;
  contacts?: VehicleOwnerContactRequest[] | unknown;
  [key: string]: unknown;
}

export interface VehicleOwnerListResponse {
  content?: VehicleOwnerRecord[];
  totalElements?: number;
  totalPages?: number;
  pageSize?: number;
  size?: number;
  number?: number;
  [key: string]: unknown;
}

export interface VehicleCreatePayload {
  ownerPublicId?: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  insuranceType: VehicleInsuranceType;
  expiryDate: string;
  assignedDriver: string;
  deliveryAgentPublicId: string;
  active: boolean;
}

export interface VehicleUpdatePayload extends VehicleCreatePayload {}

export interface VehicleRecord {
  publicId?: string;
  creationTime?: string;
  lastModifiedDate?: string;
  createdByName?: string;
  ownerPublicId?: string;
  vehicleNumber?: string;
  vehicleType?: VehicleType | string;
  insuranceType?: VehicleInsuranceType | string;
  expiryDate?: string;
  assignedDriver?: string;
  deliveryAgentPublicId?: string;
  insuranceStatus?: string;
  deliveryAgent?: { publicId?: string; name?: string } | string;
  driver?: { publicId?: string; name?: string } | string;
  status?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface VehicleListResponse {
  content?: VehicleRecord[];
  totalElements?: number;
  totalPages?: number;
  pageSize?: number;
  size?: number;
  number?: number;
  [key: string]: unknown;
}
