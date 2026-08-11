import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _LogisticsService } from '../services/logistics';
import { _UserManagementService } from '../services/userManagement';
import { unique } from './testHelpers';
import {
  DeliveryAgentCreatePayload,
  DeliveryAgentListResponse,
  DeliveryAgentRecord,
  VehicleCreatePayload,
  VehicleInsuranceType,
  VehicleOwnerCreatePayload,
  VehicleOwnerIdentificationType,
  VehicleOwnerRecord,
  VehicleRecord,
  VehicleType,
} from '../types/logistics';

export interface LogisticsSeeds {
  regionPublicId: string;
  branchPublicId: string;
}

export interface CreatedDeliveryAgent {
  publicId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  identificationType: DeliveryAgentCreatePayload['identificationType'];
  identificationNumber: string;
  regionPublicId: string;
  branchPublicId: string;
  street: string;
  address: string;
  nextOfKin: string;
  nextOfKinPhoneNumber: string;
  active: boolean;
  status: string;
  payload: DeliveryAgentCreatePayload;
  raw?: DeliveryAgentRecord;
}

function listItems(body: unknown): DeliveryAgentRecord[] {
  if (Array.isArray(body)) {
    return body as DeliveryAgentRecord[];
  }

  if (body && typeof body === 'object' && Array.isArray((body as DeliveryAgentListResponse).content)) {
    return (body as DeliveryAgentListResponse).content as DeliveryAgentRecord[];
  }

  return [];
}

function firstPublicId(body: unknown): string {
  const items = listItems(body);
  const publicId = String(items[0]?.publicId ?? '');
  expect(publicId, `expected a publicId in list response: ${JSON.stringify(body)}`).toBeTruthy();
  return publicId;
}

export async function resolveLogisticsSeeds(
  userManagement: _UserManagementService,
  token: string,
): Promise<LogisticsSeeds> {
  const [regionRes, branchRes] = await Promise.all([
    userManagement.listRegions(token, { page: 0, size: 20, sort: 'creationTime,DESC' }),
    userManagement.listBranches(token, { page: 0, size: 20, sort: 'creationTime,DESC' }),
  ]);

  expect(regionRes.status()).toBe(200);
  expect(branchRes.status()).toBe(200);

  const regionBody = await regionRes.json();
  const branchBody = await branchRes.json();
  const regionPublicId = firstPublicId(regionBody);
  const branchPublicId = firstPublicId(branchBody);

  return { regionPublicId, branchPublicId };
}

export function buildDeliveryAgentPayload(
  seeds: LogisticsSeeds,
  overrides?: Partial<DeliveryAgentCreatePayload>,
): DeliveryAgentCreatePayload {
  const firstName = overrides?.firstName ?? unique('Logistics Agent First');
  const lastName = overrides?.lastName ?? unique('Logistics Agent Last');
  const phoneNumber = overrides?.phoneNumber ?? `+2557${Date.now().toString().slice(-8)}`;
  const identificationNumber =
    overrides?.identificationNumber ?? `DA-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  return {
    firstName,
    lastName,
    phoneNumber,
    identificationType: overrides?.identificationType ?? serviceConstants.logistics.deliveryAgent.identificationType.nationalId,
    identificationNumber,
    regionPublicId: seeds.regionPublicId,
    branchPublicId: seeds.branchPublicId,
    street: overrides?.street ?? `Automation Street ${Date.now().toString().slice(-4)}`,
    address: overrides?.address ?? 'Automation Address',
    nextOfKin: overrides?.nextOfKin ?? unique('Logistics Next Of Kin'),
    nextOfKinPhoneNumber: overrides?.nextOfKinPhoneNumber ?? `+2557${Math.floor(Math.random() * 9000000).toString().padStart(7, '0')}`,
    active: overrides?.active ?? true,
  };
}

async function resolveDeliveryAgentPublicId(
  logisticsService: _LogisticsService,
  token: string,
  phoneNumber: string,
  identificationNumber: string,
) {
  const response = await logisticsService.listDeliveryAgents(token, {
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = listItems(body);
  const entity = items.find(
    (item) => String(item.phoneNumber ?? '') === phoneNumber || String(item.identificationNumber ?? '') === identificationNumber,
  );
  expect(entity, `could not find delivery agent ${phoneNumber}/${identificationNumber} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? '');
  expect(publicId, `delivery agent response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export async function createDeliveryAgent(
  logisticsService: _LogisticsService,
  token: string,
  seeds: LogisticsSeeds,
  overrides?: Partial<DeliveryAgentCreatePayload>,
): Promise<CreatedDeliveryAgent> {
  const payload = buildDeliveryAgentPayload(seeds, overrides);
  const response = await logisticsService.createDeliveryAgent(token, payload);
  expect([200, 201]).toContain(response.status());

  const body = await response.json();
  const publicId =
    String(body?.publicId ?? body?.deliveryAgentPublicId ?? '') ||
    (await resolveDeliveryAgentPublicId(logisticsService, token, payload.phoneNumber, payload.identificationNumber));

  console.log(
    `[Logistics] created ${JSON.stringify({
      publicId,
      phoneNumber: payload.phoneNumber,
      branchPublicId: payload.branchPublicId,
      regionPublicId: payload.regionPublicId,
    })}`,
  );

  return {
    publicId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phoneNumber: payload.phoneNumber,
    identificationType: payload.identificationType,
    identificationNumber: payload.identificationNumber,
    regionPublicId: payload.regionPublicId,
    branchPublicId: payload.branchPublicId,
    street: payload.street,
    address: payload.address,
    nextOfKin: payload.nextOfKin,
    nextOfKinPhoneNumber: payload.nextOfKinPhoneNumber,
    active: payload.active,
    status: String(body?.status ?? body?.active ?? payload.active),
    payload,
    raw: body,
  };
}

export async function expectDeliveryAgentDetails(
  logisticsService: _LogisticsService,
  token: string,
  deliveryAgent: CreatedDeliveryAgent,
) {
  const response = await logisticsService.getDeliveryAgent(token, deliveryAgent.publicId);
  expect(response.status()).toBe(200);
  const body = await response.json();

  console.log(
    `[Logistics] details ${JSON.stringify({
      publicId: deliveryAgent.publicId,
      phoneNumber: deliveryAgent.phoneNumber,
    })}`,
  );

  expect(String(body.publicId ?? '')).toBe(deliveryAgent.publicId);
  expect(String(body.phoneNumber ?? '')).toBe(deliveryAgent.phoneNumber);
  expect(String(body.identificationType ?? '')).toBe(deliveryAgent.identificationType);
  expect(String(body.identificationNumber ?? '')).toBe(deliveryAgent.identificationNumber);
  expect(String(body.street ?? '')).toBe(deliveryAgent.street);
  expect(String(body.address ?? '')).toBe(deliveryAgent.address);
  expect(String(body.nextOfKin ?? '')).toBe(deliveryAgent.nextOfKin);
  expect(String(body.nextOfKinPhoneNumber ?? '')).toBe(deliveryAgent.nextOfKinPhoneNumber);
  expect(Boolean(body.active)).toBe(deliveryAgent.active);

  const regionReference = String(body.regionPublicId ?? (body.region as { publicId?: string } | undefined)?.publicId ?? '');
  const branchReference = String(body.branchPublicId ?? (body.branch as { publicId?: string } | undefined)?.publicId ?? '');

  if (regionReference) {
    expect(regionReference).toBe(deliveryAgent.regionPublicId);
  } else {
    console.warn(
      `[Logistics] detail response did not surface regionPublicId for ${deliveryAgent.publicId}; skipping strict region assertion`,
    );
  }

  if (branchReference) {
    expect(branchReference).toBe(deliveryAgent.branchPublicId);
  } else {
    console.warn(
      `[Logistics] detail response did not surface branchPublicId for ${deliveryAgent.publicId}; skipping strict branch assertion`,
    );
  }
}

export async function fetchDeliveryAgentItems(
  logisticsService: _LogisticsService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await logisticsService.listDeliveryAgents(token, filters as any);
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = listItems(body);
  console.log(`[Logistics] list ${JSON.stringify({ filters, count: items.length })}`);
  return items;
}

export async function cleanupDeliveryAgent(
  logisticsService: _LogisticsService,
  token: string,
  publicId?: string,
) {
  if (!publicId) {
    return;
  }

  await logisticsService.deleteDeliveryAgent(token, publicId).catch((error) => {
    console.warn(`[Logistics] cleanup skipped for ${publicId}: ${String(error)}`);
  });
}

export function expectDeliveryAgentItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.some(predicate), message).toBeTruthy();
}

export async function buildLogisticsSeeds(
  userManagement: _UserManagementService,
  token: string,
): Promise<LogisticsSeeds> {
  return resolveLogisticsSeeds(userManagement, token);
}

export interface CreatedVehicleOwner {
  publicId: string;
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
  contacts: VehicleOwnerCreatePayload['contacts'];
  status: string;
  payload: VehicleOwnerCreatePayload;
  raw?: VehicleOwnerRecord;
}

export interface CreatedVehicle {
  publicId: string;
  ownerPublicId?: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  insuranceType: VehicleInsuranceType;
  expiryDate: string;
  assignedDriver: string;
  deliveryAgentPublicId: string;
  active: boolean;
  status: string;
  payload: VehicleCreatePayload;
  raw?: VehicleRecord;
}

function normalizeItems<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }

  if (body && typeof body === 'object' && Array.isArray((body as DeliveryAgentListResponse).content)) {
    return (body as DeliveryAgentListResponse).content as T[];
  }

  return [];
}

function futureDate(days = 365) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveVehicleOwnerPayload(
  seeds: LogisticsSeeds,
  overrides?: Partial<VehicleOwnerCreatePayload>,
): VehicleOwnerCreatePayload {
  const contactFirstName = overrides?.ownerFirstName ?? unique('Vehicle Owner Contact First');
  const contactLastName = overrides?.ownerLastName ?? unique('Vehicle Owner Contact Last');
  const contactPhoneNumber = overrides?.phoneNumber ?? `+2557${Date.now().toString().slice(-8)}`;

  return {
    regionPublicId: seeds.regionPublicId,
    ownerFirstName: overrides?.ownerFirstName ?? unique('Vehicle Owner First'),
    ownerLastName: overrides?.ownerLastName ?? unique('Vehicle Owner Last'),
    phoneNumber: overrides?.phoneNumber ?? `+2557${Date.now().toString().slice(-8)}`,
    identificationType: overrides?.identificationType ?? serviceConstants.logistics.vehicleOwner.identificationType.nationalId,
    tinNumber: overrides?.tinNumber ?? `TIN-${Date.now().toString().slice(-6)}`,
    vrnNumber: overrides?.vrnNumber ?? `VRN-${Date.now().toString().slice(-6)}`,
    address: overrides?.address ?? `Vehicle Owner Address ${Date.now().toString().slice(-4)}`,
    street: overrides?.street ?? `Vehicle Owner Street ${Date.now().toString().slice(-4)}`,
    active: overrides?.active ?? true,
    contacts:
      overrides?.contacts ?? [
        {
          firstName: contactFirstName,
          lastName: contactLastName,
          fullName: `${contactFirstName} ${contactLastName}`,
          phone: contactPhoneNumber,
          phoneNumber: contactPhoneNumber,
          primaryPhone: contactPhoneNumber,
          email: `${contactFirstName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
          primaryEmail: `${contactFirstName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.com`,
          jobTitle: 'Owner Contact',
          relationship: 'Owner',
          contactType: 'OWNER',
          active: true,
        },
      ],
  };
}

async function resolveVehicleOwnerPublicId(
  logisticsService: _LogisticsService,
  token: string,
  phoneNumber: string,
  vrnNumber: string,
) {
  const response = await logisticsService.listVehicleOwners(token, {
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = normalizeItems<VehicleOwnerRecord>(body);
  const entity = items.find(
    (item) => String(item.phoneNumber ?? '') === phoneNumber || String(item.vrnNumber ?? '') === vrnNumber,
  );
  expect(entity, `could not find vehicle owner ${phoneNumber}/${vrnNumber} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? '');
  expect(publicId, `vehicle owner response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export function buildVehicleOwnerPayload(
  seeds: LogisticsSeeds,
  overrides?: Partial<VehicleOwnerCreatePayload>,
): VehicleOwnerCreatePayload {
  return resolveVehicleOwnerPayload(seeds, overrides);
}

export async function createVehicleOwner(
  logisticsService: _LogisticsService,
  token: string,
  seeds: LogisticsSeeds,
  overrides?: Partial<VehicleOwnerCreatePayload>,
): Promise<CreatedVehicleOwner> {
  const payload = buildVehicleOwnerPayload(seeds, overrides);
  const response = await logisticsService.createVehicleOwner(token, payload);
  expect([200, 201]).toContain(response.status());

  const body = await response.json();
  const publicId =
    String(body?.publicId ?? body?.vehicleOwnerPublicId ?? '') ||
    (await resolveVehicleOwnerPublicId(logisticsService, token, payload.phoneNumber, payload.vrnNumber));

  console.log(
    `[Logistics] created vehicle owner ${JSON.stringify({
      publicId,
      phoneNumber: payload.phoneNumber,
      regionPublicId: payload.regionPublicId,
    })}`,
  );

  return {
    publicId,
    regionPublicId: payload.regionPublicId,
    ownerFirstName: payload.ownerFirstName,
    ownerLastName: payload.ownerLastName,
    phoneNumber: payload.phoneNumber,
    identificationType: payload.identificationType,
    tinNumber: payload.tinNumber,
    vrnNumber: payload.vrnNumber,
    address: payload.address,
    street: payload.street,
    active: payload.active,
    contacts: payload.contacts,
    status: String(body?.status ?? body?.active ?? payload.active),
    payload,
    raw: body,
  };
}

export async function expectVehicleOwnerDetails(
  logisticsService: _LogisticsService,
  token: string,
  owner: CreatedVehicleOwner,
) {
  const response = await logisticsService.getVehicleOwner(token, owner.publicId);
  expect(response.status()).toBe(200);
  const body = await response.json();

  console.log(
    `[Logistics] owner details ${JSON.stringify({
      publicId: owner.publicId,
      phoneNumber: owner.phoneNumber,
    })}`,
  );

  expect(String(body.publicId ?? '')).toBe(owner.publicId);
  expect(String(body.phoneNumber ?? '')).toBe(owner.phoneNumber);
  expect(String(body.identificationType ?? '')).toBe(owner.identificationType);
  expect(String(body.tinNumber ?? '')).toBe(owner.tinNumber);
  expect(String(body.vrnNumber ?? '')).toBe(owner.vrnNumber);
  expect(String(body.address ?? '')).toBe(owner.address);
  expect(String(body.street ?? '')).toBe(owner.street);
  expect(Boolean(body.active)).toBe(owner.active);

  const regionReference = String(body.regionPublicId ?? (body.region as { publicId?: string } | undefined)?.publicId ?? '');
  if (regionReference) {
    expect(regionReference).toBe(owner.regionPublicId);
  } else {
    console.warn(`[Logistics] owner detail did not surface regionPublicId for ${owner.publicId}; skipping strict region assertion`);
  }
}

export async function fetchVehicleOwnerItems(
  logisticsService: _LogisticsService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await logisticsService.listVehicleOwners(token, filters as any);
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = normalizeItems<VehicleOwnerRecord>(body);
  console.log(`[Logistics] vehicle owners list ${JSON.stringify({ filters, count: items.length })}`);
  return items;
}

export async function cleanupVehicleOwner(logisticsService: _LogisticsService, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await logisticsService.deleteVehicleOwner(token, publicId).catch((error) => {
    console.warn(`[Logistics] vehicle owner cleanup skipped for ${publicId}: ${String(error)}`);
  });
}

function resolveVehiclePayload(
  ownerPublicId: string | undefined,
  deliveryAgentPublicId: string,
  overrides?: Partial<VehicleCreatePayload>,
): VehicleCreatePayload {
  const payload: VehicleCreatePayload = {
    vehicleNumber: overrides?.vehicleNumber ?? `VEH-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    vehicleType: overrides?.vehicleType ?? serviceConstants.logistics.vehicle.type.truck,
    insuranceType: overrides?.insuranceType ?? serviceConstants.logistics.vehicle.insuranceType.comprehensive,
    expiryDate: overrides?.expiryDate ?? futureDate(365),
    assignedDriver: overrides?.assignedDriver ?? unique('Assigned Driver'),
    deliveryAgentPublicId,
    active: overrides?.active ?? true,
  };

  if (ownerPublicId) {
    payload.ownerPublicId = ownerPublicId;
  }

  return payload;
}

async function resolveVehiclePublicId(
  logisticsService: _LogisticsService,
  token: string,
  vehicleNumber: string,
) {
  const response = await logisticsService.listVehicles(token, {
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = normalizeItems<VehicleRecord>(body);
  const entity = items.find((item) => String(item.vehicleNumber ?? '') === vehicleNumber);
  expect(entity, `could not find vehicle ${vehicleNumber} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? '');
  expect(publicId, `vehicle response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export function buildVehiclePayload(
  ownerPublicId: string | undefined,
  deliveryAgentPublicId: string,
  overrides?: Partial<VehicleCreatePayload>,
): VehicleCreatePayload {
  return resolveVehiclePayload(ownerPublicId, deliveryAgentPublicId, overrides);
}

export async function createVehicle(
  logisticsService: _LogisticsService,
  token: string,
  ownerPublicId: string | undefined,
  deliveryAgentPublicId: string,
  overrides?: Partial<VehicleCreatePayload>,
): Promise<CreatedVehicle> {
  const payload = buildVehiclePayload(ownerPublicId, deliveryAgentPublicId, overrides);
  const response = await logisticsService.createVehicle(token, payload);
  expect([200, 201]).toContain(response.status());

  const body = await response.json();
  const publicId =
    String(body?.publicId ?? body?.vehiclePublicId ?? '') ||
    (await resolveVehiclePublicId(logisticsService, token, payload.vehicleNumber));

  console.log(
    `[Logistics] created vehicle ${JSON.stringify({
      publicId,
      vehicleNumber: payload.vehicleNumber,
      ownerPublicId: payload.ownerPublicId,
      deliveryAgentPublicId: payload.deliveryAgentPublicId,
    })}`,
  );

  return {
    publicId,
    ownerPublicId: payload.ownerPublicId,
    vehicleNumber: payload.vehicleNumber,
    vehicleType: payload.vehicleType,
    insuranceType: payload.insuranceType,
    expiryDate: payload.expiryDate,
    assignedDriver: payload.assignedDriver,
    deliveryAgentPublicId: payload.deliveryAgentPublicId,
    active: payload.active,
    status: String(body?.status ?? body?.active ?? payload.active),
    payload,
    raw: body,
  };
}

export async function expectVehicleDetails(logisticsService: _LogisticsService, token: string, vehicle: CreatedVehicle) {
  const response = await logisticsService.getVehicle(token, vehicle.publicId);
  expect(response.status()).toBe(200);
  const body = await response.json();

  console.log(
    `[Logistics] vehicle details ${JSON.stringify({
      publicId: vehicle.publicId,
      vehicleNumber: vehicle.vehicleNumber,
    })}`,
  );

  expect(String(body.publicId ?? '')).toBe(vehicle.publicId);
  expect(String(body.vehicleNumber ?? '')).toBe(vehicle.vehicleNumber);
  expect(String(body.vehicleType ?? '')).toBe(vehicle.vehicleType);
  expect(String(body.insuranceType ?? '')).toBe(vehicle.insuranceType);
  expect(String(body.expiryDate ?? '')).toBe(vehicle.expiryDate);
  expect(String(body.assignedDriver ?? '')).toBe(vehicle.assignedDriver);
  expect(Boolean(body.active)).toBe(vehicle.active);

  const ownerReference = String(body.ownerPublicId ?? (body.owner as { publicId?: string } | undefined)?.publicId ?? '');
  const deliveryAgentReference = String(
    body.deliveryAgentPublicId ?? (body.deliveryAgent as { publicId?: string } | undefined)?.publicId ?? '',
  );

  if (ownerReference) {
    expect(ownerReference).toBe(vehicle.ownerPublicId);
  } else {
    console.warn(`[Logistics] vehicle detail did not surface ownerPublicId for ${vehicle.publicId}; skipping strict owner assertion`);
  }

  if (deliveryAgentReference) {
    expect(deliveryAgentReference).toBe(vehicle.deliveryAgentPublicId);
  } else {
    console.warn(
      `[Logistics] vehicle detail did not surface deliveryAgentPublicId for ${vehicle.publicId}; skipping strict delivery agent assertion`,
    );
  }
}

export async function fetchVehicleItems(
  logisticsService: _LogisticsService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await logisticsService.listVehicles(token, filters as any);
  expect(response.status()).toBe(200);
  const body = await response.json();
  const items = normalizeItems<VehicleRecord>(body);
  console.log(`[Logistics] vehicles list ${JSON.stringify({ filters, count: items.length })}`);
  return items;
}

export async function cleanupVehicle(logisticsService: _LogisticsService, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await logisticsService.deleteVehicle(token, publicId).catch((error) => {
    console.warn(`[Logistics] vehicle cleanup skipped for ${publicId}: ${String(error)}`);
  });
}
