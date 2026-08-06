import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { serviceConstants } from '../../constants/endpoints';
import { getTokenOrSkip, json, unique } from '../../helpers/testHelpers';
import {
  createUom,
  expectStatuses,
  expectUomDetails,
} from '../../utils/commercialsTestHelpers';

test.describe('Commercials Service - UOMs', () => {
  test('creates, updates and fetches a UOM', async ({ commercialsService }) => {
    const token = getTokenOrSkip();
    const uom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });

    await expectUomDetails(commercialsService, token, uom);

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
  });

  test('lists and filters UOMs by type, status and search', async ({ commercialsService }) => {
    const token = getTokenOrSkip();

    const activeWeightUom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.weight,
      status: serviceConstants.commercials.uom.status.active,
    });
    const activeVolumeUom = await createUom(commercialsService, token, {
      type: serviceConstants.commercials.uom.type.volume,
      status: serviceConstants.commercials.uom.status.active,
    });

    const inactiveStatusRes = await expectStatuses(
      commercialsService.updateUomStatus(token, activeVolumeUom.publicId, {
        status: serviceConstants.commercials.uom.status.inactive,
      }),
      [200],
    );
    expect(await json(inactiveStatusRes)).toHaveProperty('status', serviceConstants.commercials.uom.status.inactive);

    const byTypeRes = await expectStatuses(
      commercialsService.listUoms(token, {
        type: serviceConstants.commercials.uom.type.weight,
        status: serviceConstants.commercials.uom.status.active,
        page: 0,
        size: 20,
        sort: 'creationTime,DESC',
      }),
      [200],
    );
    const byTypeBody = await json(byTypeRes);
    const byTypeItems = (byTypeBody.content ?? []) as Array<Record<string, unknown>>;
    expect(byTypeItems.length).toBeGreaterThan(0);
    expect(byTypeItems.every((item) => item.type === serviceConstants.commercials.uom.type.weight)).toBeTruthy();
    expect(byTypeItems.every((item) => item.status === serviceConstants.commercials.uom.status.active)).toBeTruthy();
    expect(byTypeItems.some((item) => item.publicId === activeWeightUom.publicId)).toBeTruthy();

    const byStatusRes = await expectStatuses(
      commercialsService.listUoms(token, {
        type: serviceConstants.commercials.uom.type.volume,
        status: serviceConstants.commercials.uom.status.inactive,
        page: 0,
        size: 20,
        sort: 'creationTime,DESC',
      }),
      [200],
    );
    const byStatusBody = await json(byStatusRes);
    const byStatusItems = (byStatusBody.content ?? []) as Array<Record<string, unknown>>;
    expect(byStatusItems.length).toBeGreaterThan(0);
    expect(byStatusItems.every((item) => item.type === serviceConstants.commercials.uom.type.volume)).toBeTruthy();
    expect(byStatusItems.every((item) => item.status === serviceConstants.commercials.uom.status.inactive)).toBeTruthy();
    expect(byStatusItems.some((item) => item.publicId === activeVolumeUom.publicId)).toBeTruthy();

    const searchRes = await expectStatuses(
      commercialsService.listUoms(token, {
        search: activeWeightUom.code,
        page: 0,
        size: 20,
        sort: 'creationTime,DESC',
      }),
      [200],
    );
    const searchBody = await json(searchRes);
    const searchItems = (searchBody.content ?? []) as Array<Record<string, unknown>>;
    expect(searchItems.length).toBeGreaterThan(0);
    expect(searchItems.every((item) => item.code === activeWeightUom.code)).toBeTruthy();
    expect(searchItems.some((item) => item.publicId === activeWeightUom.publicId)).toBeTruthy();
  });
});
