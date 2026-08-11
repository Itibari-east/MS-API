import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _LogisticsService } from '../services/logistics';
import { _UserManagementService } from '../services/userManagement';
import { unique } from './testHelpers';
import {
  DeliveryAgentCreatePayload,
  DeliveryAgentListResponse,
  DeliveryAgentRecord,
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
