import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, json, unique } from '../../helpers/testHelpers';
import {
  createUom,
  expectUomItems,
  expectStatuses,
  expectUomDetails,
  fetchUomItems,
  uomCode,
} from '../../utils/commercialsTestHelpers';
import { expectUomDbRow } from '../../utils/commercialsDb';

test.describe('@commercials Commercials Service - UOMs', () => {
  test.setTimeout(100000);
  test('creates a UOM', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const uom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });
    expect(uom.name).toContain('UOM');
    expect(uom.code).toBeTruthy();
    expect(uom.type).toBe(serviceConstants.commercials.uom.type.weight);
    expect(uom.status).toBe(serviceConstants.commercials.uom.status.active);
    expect(uom.publicId).toBeTruthy();
    expect(serviceConstants.commercials.uom.allowedTypes).toContain(uom.type);
    await expectUomDbRow(uom.publicId, {
      name: uom.name,
      code: uom.code,
      type: uom.type,
      status: uom.status,
    });
  });

  test('gets UOM details', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const uom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.volume,
      status: serviceConstants.commercials.uom.status.active,
    });

    await expectUomDetails(commercialsService, token, uom);
  });

  test('updates a UOM', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const uom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });

    const updatedName = unique('UOM Updated');
    const updatedDescription = unique('Updated UOM');
    const updateRes = await expectStatuses(
      commercialsService.updateUom(token, uom.publicId, {
        name: updatedName,
        code: uom.code,
        type: uom.type,
        description: updatedDescription,
      }),
      [200],
    );

    const updatedBody = await json(updateRes);
    expect(updatedBody).toHaveProperty('publicId', uom.publicId);
    expect(updatedBody).toHaveProperty('name', updatedName);
    expect(updatedBody).toHaveProperty('code', uom.code);
    expect(updatedBody).toHaveProperty('type', uom.type);
    expect(updatedBody).toHaveProperty('description', updatedDescription);

    await expectUomDetails(commercialsService, token, {
      ...uom,
      name: updatedName,
    });
    await expectUomDbRow(uom.publicId, {
      name: updatedName,
      code: uom.code,
      type: uom.type,
      status: uom.status,
      updated: true,
    });
  });

  test('deactivates a UOM', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const uom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });

    const inactiveStatusRes = await expectStatuses(
      commercialsService.updateUomStatus(token, uom.publicId, {
        status: serviceConstants.commercials.uom.status.inactive,
      }),
      [200],
    );
    expect(await json(inactiveStatusRes)).toHaveProperty('status', serviceConstants.commercials.uom.status.inactive);
    await expectUomDetails(commercialsService, token, {
      ...uom,
      status: serviceConstants.commercials.uom.status.inactive,
    });
    await expectUomDbRow(uom.publicId, {
      name: uom.name,
      code: uom.code,
      type: uom.type,
      status: serviceConstants.commercials.uom.status.inactive,
      updated: true,
    });
  });

  test('filters UOMs by search', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const scope = uomCode('SRCH');
    const first = await createUom(commercialsService, token, {
      name: `Search ${scope} Alpha`,
      code: `${scope}A`,
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });
    const second = await createUom(commercialsService, token, {
      name: `Search ${scope} Beta`,
      code: `${scope}B`,
      type: serviceConstants.commercials.uom.type.other,
      status: serviceConstants.commercials.uom.status.active,
    });

    const items = await fetchUomItems(commercialsService, token, {
      search: scope,
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });

    expectUomItems(
      items,
      (item) =>
        String(item.code ?? '').includes(scope) ||
        String(item.name ?? '').includes(scope),
      `expected search results to include scope ${scope}`,
    );
    expect(items.some((item) => item.publicId === first.publicId)).toBeTruthy();
    expect(items.some((item) => item.publicId === second.publicId)).toBeTruthy();
  });

  test('filters UOMs by type', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const scope = uomCode('TYPE');
    const weightUom = await createUom(commercialsService, token, {
      name: `Type ${scope} Weight`,
      code: `${scope}W`,
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });
    await createUom(commercialsService, token, {
      name: `Type ${scope} Area`,
      code: `${scope}A`,
      type: serviceConstants.commercials.uom.type.area,
      status: serviceConstants.commercials.uom.status.active,
    });

    const items = await fetchUomItems(commercialsService, token, {
      search: scope,
      type: serviceConstants.commercials.uom.type.weight,
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });

    expectUomItems(
      items,
      (item) => item.type === serviceConstants.commercials.uom.type.weight,
      'expected all returned UOMs to have the requested type',
    );
    expect(items.some((item) => item.publicId === weightUom.publicId)).toBeTruthy();
    expect(
      items.every((item) =>
        serviceConstants.commercials.uom.allowedTypes.includes(
          String(item.type) as (typeof serviceConstants.commercials.uom.allowedTypes)[number],
        ),
      ),
    ).toBeTruthy();
  });

  test('filters UOMs by status', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const scope = uomCode('STAT');
    await createUom(commercialsService, token, {
      name: `Status ${scope} Active`,
      code: `${scope}A`,
      type: serviceConstants.commercials.uom.type.length,
      status: serviceConstants.commercials.uom.status.active,
    });
    const inactiveUom = await createUom(commercialsService, token, {
      name: `Status ${scope} Inactive`,
      code: `${scope}I`,
      type: serviceConstants.commercials.uom.type.length,
      status: serviceConstants.commercials.uom.status.active,
    });

    await expectStatuses(
      commercialsService.updateUomStatus(token, inactiveUom.publicId, {
        status: serviceConstants.commercials.uom.status.inactive,
      }),
      [200],
    );

    const items = await fetchUomItems(commercialsService, token, {
      search: scope,
      status: serviceConstants.commercials.uom.status.inactive,
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });

    expectUomItems(
      items,
      (item) => item.status === serviceConstants.commercials.uom.status.inactive,
      'expected all returned UOMs to have the requested status',
    );
    expect(items.some((item) => item.publicId === inactiveUom.publicId)).toBeTruthy();
  });

  test('paginates UOMs by page and size', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const scope = uomCode('PAGE');
    const first = await createUom(commercialsService, token, {
      name: `Page ${scope} One`,
      code: `${scope}1`,
      type: serviceConstants.commercials.uom.type.count,
      status: serviceConstants.commercials.uom.status.active,
    });
    const second = await createUom(commercialsService, token, {
      name: `Page ${scope} Two`,
      code: `${scope}2`,
      type: serviceConstants.commercials.uom.type.count,
      status: serviceConstants.commercials.uom.status.active,
    });
    const third = await createUom(commercialsService, token, {
      name: `Page ${scope} Three`,
      code: `${scope}3`,
      type: serviceConstants.commercials.uom.type.count,
      status: serviceConstants.commercials.uom.status.active,
    });

    const firstPage = await fetchUomItems(commercialsService, token, {
      search: scope,
      page: 0,
      size: 1,
      sort: 'creationTime,DESC',
    });
    const secondPage = await fetchUomItems(commercialsService, token, {
      search: scope,
      page: 1,
      size: 1,
      sort: 'creationTime,DESC',
    });
    const thirdPage = await fetchUomItems(commercialsService, token, {
      search: scope,
      page: 2,
      size: 1,
      sort: 'creationTime,DESC',
    });

    expect(firstPage.length).toBe(1);
    expect(secondPage.length).toBe(1);
    expect(thirdPage.length).toBe(1);

    const publicIds = [firstPage[0].publicId, secondPage[0].publicId, thirdPage[0].publicId];
    expect(new Set(publicIds).size).toBe(3);
    expect(publicIds).toEqual(expect.arrayContaining([first.publicId, second.publicId, third.publicId]));
  });

  test('sorts UOMs by creation time descending', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const scope = uomCode('SORT');
    const olderUom = await createUom(commercialsService, token, {
      name: `Sort ${scope} Older`,
      code: `${scope}1`,
      type: serviceConstants.commercials.uom.type.volume,
      status: serviceConstants.commercials.uom.status.active,
    });
    const newerUom = await createUom(commercialsService, token, {
      name: `Sort ${scope} Newer`,
      code: `${scope}2`,
      type: serviceConstants.commercials.uom.type.volume,
      status: serviceConstants.commercials.uom.status.active,
    });

    const items = await fetchUomItems(commercialsService, token, {
      search: scope,
      page: 0,
      size: 2,
      sort: 'creationTime,DESC',
    });

    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].publicId).toBe(newerUom.publicId);
    expect(items[1].publicId).toBe(olderUom.publicId);
  });
});
