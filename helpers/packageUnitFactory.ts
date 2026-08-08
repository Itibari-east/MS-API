import { expect } from '@playwright/test';
import { serviceConstants } from '../constants/endpoints';
import { PackageUnitApi } from '../services/packageUnit';
import { CreatedUom, createUom, expectUomDetails, uomCode } from '../utils/commercialsTestHelpers';
import { unique } from './testHelpers';
import { PackageUnitRecord } from '../types/packageUnit';

export interface CreatedPackageUnit {
  publicId: string;
  name: string;
  code: string;
  baseUomPublicId: string;
  conversionFactor: number | string;
  status: string;
  description?: string;
  packageUnit?: PackageUnitRecord;
  baseUom?: CreatedUom;
}

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

async function resolvePackageUnitPublicId(packageUnitApi: PackageUnitApi, token: string, code: string) {
  const response = await packageUnitApi.listPackageUnits(token, {
    search: code,
    page: 0,
    size: 50,
    sort: 'creationTime,DESC',
  });
  expect(response.status).toBe(200);
  const entity = listItems(response.data).find((item) => item?.code === code);
  expect(entity, `could not find package unit with code ${code} in ${JSON.stringify(response.data)}`).toBeTruthy();
  const publicId = String(entity?.publicId ?? entity?.packageUnitPublicId ?? entity?.packagingUnitPublicId ?? '');
  expect(publicId, `package unit response should include a publicId: ${JSON.stringify(entity)}`).toBeTruthy();
  return publicId;
}

export function buildPackageUnitCreatePayload(
  name: string,
  code: string,
  baseUomPublicId: string,
  overrides?: Partial<Pick<CreatedPackageUnit, 'conversionFactor' | 'description' | 'status'>>,
) {
  return {
    name,
    code,
    baseUomPublicId,
    conversionFactor: overrides?.conversionFactor ?? 12,
    description: overrides?.description ?? `Automation ${name}`,
    status: overrides?.status ?? serviceConstants.commercials.packageUnit.status.active,
  };
}

export function buildPackageUnitUpdatePayload(
  name: string,
  baseUomPublicId: string,
  overrides?: Partial<Pick<CreatedPackageUnit, 'conversionFactor' | 'description'>>,
) {
  return {
    name,
    baseUomPublicId,
    conversionFactor: overrides?.conversionFactor ?? 24,
    description: overrides?.description ?? `Updated ${name}`,
  };
}

export function buildPackageUnitStatusPayload(status: string = serviceConstants.commercials.packageUnit.status.active) {
  return { status };
}

export function buildPackageUnitListParams(search?: string, baseUomPublicId?: string, status?: string) {
  return {
    search,
    baseUomPublicId,
    status: status ?? serviceConstants.commercials.packageUnit.status.active,
    page: 0,
    size: 20,
    sort: 'creationTime,DESC',
  };
}

export async function createBaseUom(
  commercialsService: { createUom: (...args: any[]) => Promise<any> },
  token: string,
  namePrefix = 'Package Base UOM',
) {
  const baseUom = await createUom(commercialsService as any, token, {
    name: unique(namePrefix),
    code: uomCode('BASE'),
    type: serviceConstants.commercials.uom.type.count,
    status: serviceConstants.commercials.uom.status.active,
  });
  await expectUomDetails(commercialsService as any, token, baseUom);
  return baseUom;
}

export async function createPackageUnit(
  packageUnitApi: PackageUnitApi,
  token: string,
  options?: {
    namePrefix?: string;
    codePrefix?: string;
    code?: string;
    baseUom?: CreatedUom;
    conversionFactor?: number | string;
    description?: string;
    status?: string;
  },
): Promise<CreatedPackageUnit> {
  const name = unique(options?.namePrefix ?? 'Package Unit');
  const normalizedPrefix = (options?.code ?? options?.codePrefix ?? 'PKG')
    .replace(/[^A-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);
  const code =
    options?.code ??
    `${normalizedPrefix}${Date.now().toString().slice(-5)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(
      0,
      10,
    );
  const baseUom = options?.baseUom;
  const baseUomPublicId = baseUom?.publicId ?? '';
  const response = await packageUnitApi.createPackageUnit(
    token,
    buildPackageUnitCreatePayload(name, code, baseUomPublicId, {
      conversionFactor: options?.conversionFactor,
      description: options?.description,
      status: options?.status,
    }),
  );
  expect([200, 201]).toContain(response.status);

  const publicId =
    String(response.data?.publicId ?? response.data?.packageUnitPublicId ?? response.data?.packagingUnitPublicId ?? '') ||
    (await resolvePackageUnitPublicId(packageUnitApi, token, code));

  console.log(
    `[PackageUnit] created ${JSON.stringify({
      publicId,
      code,
      baseUomPublicId,
      conversionFactor: options?.conversionFactor ?? 12,
    })}`,
  );

  return {
    publicId,
    name,
    code,
    baseUomPublicId,
    conversionFactor: options?.conversionFactor ?? 12,
    status: options?.status ?? serviceConstants.commercials.packageUnit.status.active,
    description: options?.description ?? `Automation ${name}`,
    packageUnit: response.data,
    baseUom,
  };
}

export async function expectPackageUnitDetails(
  packageUnitApi: PackageUnitApi,
  token: string,
  packageUnit: CreatedPackageUnit,
) {
  const response = await packageUnitApi.getPackageUnit(token, packageUnit.publicId);
  expect(response.status).toBe(200);
  const body = response.data;
  console.log(`[PackageUnit] details ${JSON.stringify({ publicId: packageUnit.publicId, code: packageUnit.code })}`);
  expect(body.publicId ?? body.packageUnitPublicId ?? body.packagingUnitPublicId).toBe(packageUnit.publicId);
  expect(body.name).toBe(packageUnit.name);
  expect(body.code).toBe(packageUnit.code);
  expect(String(body.baseUomPublicId ?? body.baseUom?.publicId ?? '')).toBe(packageUnit.baseUomPublicId);
  expect(String(body.conversionFactor)).toBe(String(packageUnit.conversionFactor));
  expect(body.status).toBe(packageUnit.status);
}

export async function fetchPackageUnitItems(
  packageUnitApi: PackageUnitApi,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await packageUnitApi.listPackageUnits(token, filters as any);
  expect(response.status).toBe(200);
  const body = response.data;
  console.log(`[PackageUnit] list ${JSON.stringify({ filters, count: listItems(body).length })}`);
  return listItems(body);
}

export function expectPackageUnitItems(
  items: Array<Record<string, unknown>>,
  predicate: (item: Record<string, unknown>) => boolean,
  message: string,
) {
  expect(items.length, message).toBeGreaterThan(0);
  expect(items.every(predicate), message).toBeTruthy();
}

export async function cleanupPackageUnit(packageUnitApi: PackageUnitApi, token: string, publicId?: string) {
  if (!publicId) {
    return;
  }

  await packageUnitApi
    .updatePackageUnitStatus(token, publicId, buildPackageUnitStatusPayload(serviceConstants.commercials.packageUnit.status.inactive))
    .catch((error) => {
      console.warn(`[PackageUnit] cleanup skipped for ${publicId}: ${String(error)}`);
    });
}
