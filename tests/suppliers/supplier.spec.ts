import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import {
  buildSupplierDeactivatePayload,
  buildSupplierDocumentListParams,
  buildSupplierListParams,
  buildSupplierPerformanceDeliveryParams,
  buildSupplierProductListParams,
  buildSupplierRebateListParams,
  createCompleteSupplier,
  createMultipleSuppliers,
  createSupplierDraft,
} from '../../helpers/supplierFactory';

test.describe.serial('@supplier Supplier API', () => {
  test('creates a complete supplier and verifies detail, list visibility and activity events', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Happy Path');

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    const detail = detailRes.data;
    expect(detail.publicId ?? detail.supplierId).toBe(supplier.publicId);
    expect(detail.name).toBe(supplier.name);
    expect(detail.status).toBeTruthy();

    const listRes = await supplierApi.listSuppliers(token, await buildSupplierListParams(supplier.name));
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
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('exposes created by metadata on supplier detail', async ({ supplierApi, accountingService }) => {
    test.fail(true, 'backend currently omits created_by/createdBy metadata on supplier detail');

    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Metadata');

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    const detail = detailRes.data;
    expect(detail.createdBy ?? detail.created_by).toBeTruthy();
    expect(detail.creationTime ?? detail.creation_time).toBeTruthy();

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('paginates and sorts supplier lists', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Filters');

    const listRes = await supplierApi.listSuppliers(token, {
      ...(await buildSupplierListParams(supplier.name)),
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
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('filters suppliers by name and supplier id using search', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const target = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Search Target');
    const decoy = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Search Decoy');
    const targetSupplierId = String(target.draft?.supplierCode ?? target.draft?.supplierId ?? target.publicId);

    const byNameRes = await supplierApi.listSuppliers(token, await buildSupplierListParams(target.name ?? ''));
    expect(byNameRes.status).toBe(200);
    expect(byNameRes.data.content ?? []).toHaveLength(1);
    expect(byNameRes.data.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: target.publicId,
          supplier: target.name,
        }),
      ]),
    );
    expect(byNameRes.data.content ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: decoy.publicId,
        }),
      ]),
    );

    const byIdRes = await supplierApi.listSuppliers(token, await buildSupplierListParams(targetSupplierId));
    expect(byIdRes.status).toBe(200);
    expect(byIdRes.data.content ?? []).toHaveLength(1);
    expect(byIdRes.data.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: target.publicId,
          supplierId: targetSupplierId,
        }),
      ]),
    );
    expect(byIdRes.data.content ?? []).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: decoy.publicId,
        }),
      ]),
    );
  });

  test('rejects confirming a draft supplier before onboarding is complete', async ({ supplierApi }) => {
    const token = getTokenOrSkip();
    const draft = await createSupplierDraft(supplierApi, token, 'Supplier Draft Only');

    await expect(supplierApi.confirmSupplier(token, draft.publicId)).rejects.toThrow(/missing/i);
  });

  test('keeps a supplier in draft when onboarding is not completed', async ({ supplierApi, accountingService }) => {
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

  test('deactivates a confirmed supplier and blocks duplicate deactivation', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Deactivate');

    const firstDeactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(firstDeactivateRes.status);

    const getAfterDeactivateRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect([200, 404]).toContain(getAfterDeactivateRes.status);
    if (getAfterDeactivateRes.status === 200) {
      expect(getAfterDeactivateRes.data.status).not.toBe('ACTIVE');
    }

    await expect(
      supplierApi.deactivateSupplier(token, supplier.publicId, await buildSupplierDeactivatePayload()),
    ).rejects.toThrow(/already inactive/i);
  });

  test('grants portal access and rejects duplicate portal grants', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Portal Access');

    const grantRes = await supplierApi.grantPortalAccess(token, supplier.publicId);
    expect(grantRes.status).toBe(200);
    expect(grantRes.data.portalAccessGranted).toBeTruthy();

    const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
    expect(detailRes.status).toBe(200);

    await expect(supplierApi.grantPortalAccess(token, supplier.publicId)).rejects.toThrow(/already/i);

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('bulk deactivates multiple suppliers', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const suppliers = await createMultipleSuppliers(supplierApi, accountingService, token, 2, 'Supplier Bulk Deactivate');

    const bulkRes = await supplierApi.bulkDeactivate(token, {
      publicIds: suppliers.map((supplier) => supplier.publicId),
      reasonCode: (await buildSupplierDeactivatePayload()).reasonCode,
    });
    expect([200, 204]).toContain(bulkRes.status);

    for (const supplier of suppliers) {
      const detailRes = await supplierApi.getSupplier(token, supplier.publicId);
      expect(detailRes.status).toBe(200);
      expect(detailRes.data.status).not.toBe('ACTIVE');
    }
  });

  test('rejects supplier requests without authentication', async ({ supplierApi }) => {
    await expect(supplierApi.listSuppliers('', await buildSupplierListParams('auth-missing'))).rejects.toThrow(/401/i);
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

  test('lists supplier documents created during onboarding', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Documents');
    test.skip(!supplier.documentsSupported, 'supplier document endpoints are not available in this environment');

    const listRes = await supplierApi.listDocuments(
      token,
      supplier.publicId,
      await buildSupplierDocumentListParams({ page: 0, size: 20 }),
    );
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.data.content)).toBeTruthy();
    expect(listRes.data.content?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(listRes.data.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentTypeCode: expect.any(String),
          fileName: expect.any(String),
        }),
      ]),
    );

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('lists supplier products and product summary endpoints', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Products');

    const listRes = await supplierApi.listProducts(
      token,
      supplier.publicId,
      await buildSupplierProductListParams({ search: supplier.name, page: 0, size: 20 }),
    );
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.data.content)).toBeTruthy();

    const summaryRes = await supplierApi.getProductSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();
    expect(summaryRes.raw.trim()).not.toBe('');

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('lists supplier rebates and rebate summary endpoints', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Rebates');

    const listRes = await supplierApi.listRebates(
      token,
      supplier.publicId,
      await buildSupplierRebateListParams({
        search: supplier.name,
        periodFrom: '2026-01-01',
        periodTo: '2026-12-31',
        page: 0,
        size: 20,
      }),
    );
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.data.content)).toBeTruthy();

    const summaryRes = await supplierApi.getRebatesSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();
    expect(summaryRes.raw.trim()).not.toBe('');

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });

  test('loads supplier performance summary and recent deliveries', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Performance');

    const summaryRes = await supplierApi.getPerformanceSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();
    expect(summaryRes.raw.trim()).not.toBe('');

    const deliveriesRes = await supplierApi.listPerformanceDeliveries(
      token,
      supplier.publicId,
      await buildSupplierPerformanceDeliveryParams({ page: 0, size: 20 }),
    );
    expect(deliveriesRes.status).toBe(200);
    expect(Array.isArray(deliveriesRes.data.content)).toBeTruthy();

    const deactivateRes = await supplierApi.deactivateSupplier(
      token,
      supplier.publicId,
      await buildSupplierDeactivatePayload(),
    );
    expect([200, 204]).toContain(deactivateRes.status);
  });
});
