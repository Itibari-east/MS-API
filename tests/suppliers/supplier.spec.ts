import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import {
  buildSupplierDeactivatePayload,
  buildSupplierListParams,
  createCompleteSupplier,
  createMultipleSuppliers,
  createSupplierDraft,
} from '../../helpers/supplierFactory';

test.describe.serial('Supplier API', () => {
  test('creates a complete supplier and verifies detail, list visibility and activity events', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, token, 'Supplier Happy Path');

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    const detail = detailRes.data;
    expect(detail.publicId ?? detail.supplierId).toBe(supplier.publicId);
    expect(detail.name).toBe(supplier.name);
    expect(detail.status).toBeTruthy();

    const listRes = await supplierApi.listSuppliers(token, buildSupplierListParams(supplier.name));
    expect(listRes.status).toBe(200);

    const listBody = listRes.data;
    expect(listBody.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: supplier.publicId,
        }),
      ]),
    );

    const activityRes = await supplierApi.listActivity(token, supplier.publicId, {
      page: 0,
      size: 20,
      sort: 'occurredAt,DESC',
    });
    expect(activityRes.status).toBe(200);

    const activityBody = activityRes.data;
    expect(activityBody.content?.length ?? 0).toBeGreaterThan(0);
    expect(activityBody.content?.[0]?.occurredAt).toBeTruthy();

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('exposes created by metadata on supplier detail', async ({ supplierApi }) => {
    test.fail(true, 'backend currently omits created_by/createdBy metadata on supplier detail');

    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, token, 'Supplier Metadata');

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    const detail = detailRes.data;
    expect(detail.createdBy ?? detail.created_by).toBeTruthy();
    expect(detail.creationTime ?? detail.creation_time).toBeTruthy();

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('paginates and sorts supplier lists', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, token, 'Supplier Filters');

    const listRes = await supplierApi.listSuppliers(token, {
      ...buildSupplierListParams(supplier.name),
      search: supplier.name,
      status: 'ACTIVE',
      page: 0,
      size: 1,
      sort: 'creationTime,DESC',
    });
    expect(listRes.status).toBe(200);

    const body = listRes.data;
    expect(body.pageSize ?? body.size).toBe(1);
    expect(body.content?.length ?? 0).toBeGreaterThan(0);
    expect(body.content?.[0]?.publicId).toBe(supplier.publicId);

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('rejects confirming a draft supplier before onboarding is complete', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const draft = await createSupplierDraft(supplierApi, token, 'Supplier Draft Only');

    await expect(supplierApi.confirmSupplier(token, draft.publicId)).rejects.toThrow(/missing/i);
  });

  test('keeps a supplier in draft when onboarding is not completed', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const draft = await createSupplierDraft(supplierApi, token, 'Supplier Left In Draft');

    const detailRes = await supplierApi.getSupplier(token, draft.publicId);
    expect(detailRes.status).toBe(200);
    expect(detailRes.data.status).toBe('DRAFT');
    expect(detailRes.data.onboardingStep).toBe(1);

    const listRes = await supplierApi.listSuppliers(token, {
      search: draft.name,
      status: 'DRAFT',
      page: 0,
      size: 20,
      sort: 'creationTime,DESC',
    });
    expect(listRes.status).toBe(200);
    expect(listRes.data.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: draft.publicId,
          status: 'DRAFT',
        }),
      ]),
    );
  });

  test('deactivates a confirmed supplier and blocks duplicate deactivation', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, token, 'Supplier Deactivate');

    const firstDeactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(firstDeactivateRes.status);

    const getAfterDeactivateRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect([200, 404]).toContain(getAfterDeactivateRes.status);
    if (getAfterDeactivateRes.status === 200) {
      expect(getAfterDeactivateRes.data.status).not.toBe('ACTIVE');
    }

    await expect(
      supplierApi.deactivateSupplier(token, supplier.publicId, buildSupplierDeactivatePayload()),
    ).rejects.toThrow(/already inactive/i);
  });

  test('grants portal access and rejects duplicate portal grants', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, token, 'Supplier Portal Access');

    const grantRes = await supplierApi.grantPortalAccess(token, supplier.publicId);
    expect(grantRes.status).toBe(200);
    expect(grantRes.data.portalAccessGranted).toBeTruthy();

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    await expect(supplierApi.grantPortalAccess(token, supplier.publicId)).rejects.toThrow(/already/i);

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('bulk deactivates multiple suppliers', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const suppliers = await createMultipleSuppliers(supplierApi, token, 2, 'Supplier Bulk Deactivate');

    const bulkRes = await supplierApi.bulkDeactivate(token, {
      publicIds: suppliers.map((supplier) => supplier.publicId),
      reasonCode: buildSupplierDeactivatePayload().reasonCode,
    });
    expect([200, 204]).toContain(bulkRes.status);

    for (const supplier of suppliers) {
      const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
      expect(detailRes.status).toBe(200);
      expect(detailRes.data.status).not.toBe('ACTIVE');
    }
  });

  test('rejects supplier requests without authentication', async ({ supplierApi }) => {
    await expect(supplierApi.listSuppliers('', buildSupplierListParams('auth-missing'))).rejects.toThrow(/401/i);
  });

  test('returns 404 for an invalid supplier id', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    await expect(
      supplierApi.getSupplier(token, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/404|not found/i);
  });

  test('rejects malformed supplier draft payloads', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    await expect(
      supplierApi.createDraft(token, {
        name: '',
        supplierTypeCode: '',
      } as any),
    ).rejects.toThrow(/400|422|missing|validation|supplier type/i);
  });
});
