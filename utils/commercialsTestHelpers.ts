import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { _CommercialsService } from '../services/commercials';
import { json } from '../helpers/testHelpers';

export type CreatedUom = {
  name: string;
  code: string;
  type: string;
  status: string;
  publicId: string;
};

export async function expectStatuses<T extends { status(): number }>(
  responsePromise: Promise<T>,
  allowedStatuses: number[],
) {
  const response = await responsePromise;
  const status = response.status();
  if (!allowedStatuses.includes(status)) {
    const bodyText = 'text' in response ? await (response as { text(): Promise<string> }).text() : '';
    expect(
      allowedStatuses,
      `Unexpected status ${status}${bodyText ? ` with body: ${bodyText}` : ''}`,
    ).toContain(status);
  }
  return response;
}

export function logUom(message: string, details?: Record<string, unknown>) {
  if (details && Object.keys(details).length > 0) {
    console.log(`[UOM] ${message} ${JSON.stringify(details)}`);
    return;
  }

  console.log(`[UOM] ${message}`);
}

export function uomCode(prefix: string) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${prefix}`.replace(/[^A-Z]/g, '').toUpperCase().slice(0, 4) + suffix;
}

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

export function uomListItems(body: any): Array<Record<string, unknown>> {
  return listItems(body);
}

function findUomByCode(body: any, code: string) {
  return listItems(body).find((item) => item?.code === code);
}

async function resolveUomPublicId(commercials: _CommercialsService, token: string, code: string) {
  const response = await expectStatuses(commercials.listUoms(token, { search: code, page: 0, size: 50 }), [200]);
  const body = await json(response);
  const entity = findUomByCode(body, code);
  expect(entity, `could not find UOM with code ${code} in ${JSON.stringify(body)}`).toBeTruthy();
  const publicId = entity?.publicId;
  expect(publicId, `UOM response should include publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return String(publicId);
}

export async function createUom(
  commercials: _CommercialsService,
  token: string,
  overrides?: Partial<Pick<CreatedUom, 'name' | 'code' | 'type' | 'status'>>,
): Promise<CreatedUom> {
  const name = overrides?.name ?? `UOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const code = overrides?.code ?? uomCode('UOM');
  const type = overrides?.type ?? serviceConstants.commercials.uom.type.weight;
  const status = overrides?.status ?? serviceConstants.commercials.uom.status.active;

  const response = await expectStatuses(
    commercials.createUom(token, {
      name,
      code,
      type,
      description: `Automation ${name}`,
      status,
    }),
    [201],
  );

  const body = await json(response);
  const bodyPublicId = Array.isArray(body) ? body[0]?.publicId : body?.publicId;
  const publicId = bodyPublicId || (await resolveUomPublicId(commercials, token, code));
  logUom('created', { publicId, code, type, status });

  return { name, code, type, status, publicId };
}

export async function expectUomDetails(
  commercials: _CommercialsService,
  token: string,
  uom: CreatedUom,
) {
  const response = await expectStatuses(commercials.getUom(token, uom.publicId), [200]);
  const body = await json(response);
  logUom('details', { publicId: uom.publicId, code: uom.code, type: uom.type, status: uom.status });
  expect(body).toHaveProperty('publicId', uom.publicId);
  expect(body).toHaveProperty('name', uom.name);
  expect(body).toHaveProperty('code', uom.code);
  expect(body).toHaveProperty('type', uom.type);
  expect(body).toHaveProperty('status', uom.status);
}

export async function fetchUomItems(
  commercials: _CommercialsService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await expectStatuses(commercials.listUoms(token, filters), [200]);
  const body = await json(response);
  logUom('list', { filters, count: listItems(body).length });
  return listItems(body);
}

export function expectUomItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}

export async function expectUomListed(
  commercials: _CommercialsService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
  expectedPublicId: string,
) {
  const response = await expectStatuses(commercials.listUoms(token, filters), [200]);
  const body = await json(response);
  const item = listItems(body).find((entry) => entry.publicId === expectedPublicId);
  expect(item, `could not find UOM ${expectedPublicId} in ${JSON.stringify(body)}`).toBeTruthy();
  expect(item).toHaveProperty('publicId', expectedPublicId);
  return body;
}
