import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import {
  buildPackageUnitListParams,
  buildPackageUnitUpdatePayload,
  cleanupPackageUnit,
  createBaseUom,
  createPackageUnit,
  expectPackageUnitDetails,
  expectPackageUnitItems,
  fetchPackageUnitItems,
} from '../../helpers/packageUnitFactory';

test.describe.serial('Commercials Service - Package Units', () => {
  test.setTimeout(100000);

  test('creates a package unit and verifies detail and list visibility', async ({ commercialsService, packageUnitApi }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Base UOM');
    const packageUnit = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      conversionFactor: 12,
      status: serviceConstants.commercials.packageUnit.status.active,
    });

    await expectPackageUnitDetails(packageUnitApi, token, packageUnit);

    const listItems = await fetchPackageUnitItems(packageUnitApi, token, {
      search: packageUnit.code,
      baseUomPublicId: baseUom.publicId,
      status: serviceConstants.commercials.packageUnit.status.active,
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });

    expectPackageUnitItems(
      listItems,
      (item) =>
        String(item.code ?? '').includes(packageUnit.code) &&
        String(item.baseUomPublicId ?? '') === baseUom.publicId &&
        item.status === serviceConstants.commercials.packageUnit.status.active,
      'expected the created package unit to appear in the filtered list',
    );

    await cleanupPackageUnit(packageUnitApi, token, packageUnit.publicId);
    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });

  test('updates a package unit and keeps the package code immutable', async ({ commercialsService, packageUnitApi }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Update Base UOM');
    const packageUnit = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      conversionFactor: 12,
      status: serviceConstants.commercials.packageUnit.status.active,
    });

    const updatedName = unique('Package Unit Updated');
    const updatedDescription = unique('Updated package unit');
    const updateRes = await packageUnitApi.updatePackageUnit(
      token,
      packageUnit.publicId,
      buildPackageUnitUpdatePayload(updatedName, baseUom.publicId, {
        conversionFactor: 24,
        description: updatedDescription,
      }),
    );

    expect(updateRes.status).toBe(200);
    expect(updateRes.data.publicId ?? updateRes.data.packageUnitPublicId ?? updateRes.data.packagingUnitPublicId).toBe(
      packageUnit.publicId,
    );
    expect(updateRes.data.code).toBe(packageUnit.code);
    expect(updateRes.data.name).toBe(updatedName);
    expect(String(updateRes.data.conversionFactor)).toBe('24');
    expect(updateRes.data.description).toBe(updatedDescription);

    await expectPackageUnitDetails(packageUnitApi, token, {
      ...packageUnit,
      name: updatedName,
      conversionFactor: 24,
      description: updatedDescription,
    });

    await cleanupPackageUnit(packageUnitApi, token, packageUnit.publicId);
    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });

  test('toggles package unit status between active and inactive', async ({ commercialsService, packageUnitApi }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Status Base UOM');
    const packageUnit = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      conversionFactor: 12,
      status: serviceConstants.commercials.packageUnit.status.active,
    });

    const inactiveRes = await packageUnitApi.updatePackageUnitStatus(token, packageUnit.publicId, {
      status: serviceConstants.commercials.packageUnit.status.inactive,
    });
    expect(inactiveRes.status).toBe(200);
    expect(inactiveRes.data.status).toBe(serviceConstants.commercials.packageUnit.status.inactive);

    const inactiveDetailRes = await packageUnitApi.getPackageUnit(token, packageUnit.publicId);
    expect(inactiveDetailRes.status).toBe(200);
    expect(inactiveDetailRes.data.status).toBe(serviceConstants.commercials.packageUnit.status.inactive);

    const activeRes = await packageUnitApi.updatePackageUnitStatus(token, packageUnit.publicId, {
      status: serviceConstants.commercials.packageUnit.status.active,
    });
    expect(activeRes.status).toBe(200);
    expect(activeRes.data.status).toBe(serviceConstants.commercials.packageUnit.status.active);

    await cleanupPackageUnit(packageUnitApi, token, packageUnit.publicId);
    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });

  test('filters package units by search, base uom, status, pagination and sort', async ({
    commercialsService,
    packageUnitApi,
  }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Filter Base UOM');
    const first = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      namePrefix: 'Package Filter Alpha',
      codePrefix: 'PKGA',
      conversionFactor: 12,
      status: serviceConstants.commercials.packageUnit.status.active,
    });
    const second = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      namePrefix: 'Package Filter Beta',
      codePrefix: 'PKGB',
      conversionFactor: 24,
      status: serviceConstants.commercials.packageUnit.status.active,
    });

    const firstPage = await fetchPackageUnitItems(packageUnitApi, token, {
      search: 'Package Filter',
      baseUomPublicId: baseUom.publicId,
      status: serviceConstants.commercials.packageUnit.status.active,
      page: 0,
      size: 1,
      sort: 'creationTime,DESC',
    });
    const secondPage = await fetchPackageUnitItems(packageUnitApi, token, {
      search: 'Package Filter',
      baseUomPublicId: baseUom.publicId,
      status: serviceConstants.commercials.packageUnit.status.active,
      page: 1,
      size: 1,
      sort: 'creationTime,DESC',
    });

    expect(firstPage.length).toBe(1);
    expect(secondPage.length).toBe(1);
    expect(firstPage[0].publicId).not.toBe(secondPage[0].publicId);
    expect([first.publicId, second.publicId]).toEqual(
      expect.arrayContaining([String(firstPage[0].publicId), String(secondPage[0].publicId)]),
    );
    expectPackageUnitItems(
      firstPage,
      (item) =>
        String(item.baseUomPublicId ?? '') === baseUom.publicId &&
        String(item.name ?? '').includes('Package Filter') &&
        item.status === serviceConstants.commercials.packageUnit.status.active,
      'expected filtered package units to match the requested search, base UOM and status',
    );

    await cleanupPackageUnit(packageUnitApi, token, first.publicId);
    await cleanupPackageUnit(packageUnitApi, token, second.publicId);
    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });

  test('rejects package unit requests without authentication', async ({ packageUnitApi }) => {
    await expect(packageUnitApi.listPackageUnits('', buildPackageUnitListParams('auth-missing'))).rejects.toThrow(
      /401/i,
    );
  });

  test('returns 404 for an invalid package unit id', async ({ packageUnitApi }) => {
    const token = getTokenOrSkip();
    await expect(packageUnitApi.getPackageUnit(token, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(
      /404|not found/i,
    );
  });

  test('rejects malformed package unit payloads', async ({ commercialsService, packageUnitApi }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Invalid Base UOM');

    await expect(
      packageUnitApi.createPackageUnit(token, {
        name: '',
        code: '',
        baseUomPublicId: baseUom.publicId,
        conversionFactor: 0,
        description: '',
        status: serviceConstants.commercials.packageUnit.status.active,
      }),
    ).rejects.toThrow(/400|422|missing|validation|code|name|conversion|base/i);

    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });

  test('rejects duplicate package unit codes', async ({ commercialsService, packageUnitApi }) => {
    const token = getTokenOrSkip();
    const baseUom = await createBaseUom(commercialsService, token, 'Package Duplicate Base UOM');
    const code = 'PKGQA01';

    const first = await createPackageUnit(packageUnitApi, token, {
      baseUom,
      code,
      conversionFactor: 12,
      status: serviceConstants.commercials.packageUnit.status.active,
    });

    await expect(
      createPackageUnit(packageUnitApi, token, {
        baseUom,
        code,
        conversionFactor: 24,
        status: serviceConstants.commercials.packageUnit.status.active,
      }),
    ).rejects.toThrow(/409|already exists|duplicate|code/i);

    await cleanupPackageUnit(packageUnitApi, token, first.publicId);
    await commercialsService.updateUomStatus(token, baseUom.publicId, {
      status: serviceConstants.commercials.uom.status.inactive,
    });
  });
});
