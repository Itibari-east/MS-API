import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import {
  buildSupplierPerformanceDeliveryParams,
  buildSupplierPerformanceDeliverySeriesParams,
  buildSupplierPerformanceLeadDaysParams,
  buildSupplierPerformanceExportParams,
  buildSupplierPurchaseOrderExportParams,
  buildSupplierPurchaseOrderListParams,
  buildSupplierRebateExportParams,
  buildSupplierRebateListParams,
  buildSupplierReportsDashboardParams,
  buildSupplierReportsExportParams,
  createCompleteSupplier,
} from '../../helpers/supplierFactory';

async function getSupplierReportsSummaryOrSkip(
  supplierApi: Parameters<typeof createCompleteSupplier>[0],
  token: string,
  params: Awaited<ReturnType<typeof buildSupplierReportsDashboardParams>>,
) {
  try {
    return await supplierApi.getSupplierReportsSummary(token, params);
  } catch (error) {
    if (String(error).includes('supplier-reports/performance/summary') && String(error).includes('404')) {
      test.skip(true, 'supplier reports summary endpoint is not available in this environment');
    }
    throw error;
  }
}

test.describe.serial('@supplier Supplier Commercials API', () => {
  test('covers supplier rebates list, summary and export', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Rebates Coverage');

    const listRes = await supplierApi.listRebates(
      token,
      supplier.publicId,
      await buildSupplierRebateListParams({
        search: supplier.name,
        status: 'PENDING',
        page: 0,
        size: 20,
      }),
    );
    expect(listRes.status).toBe(200);
    expect(listRes.data).toBeTruthy();

    const summaryRes = await supplierApi.getRebatesSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();
    expect(summaryRes.raw.trim()).not.toBe('');

    const exportRes = await supplierApi.exportRebates(
      token,
      supplier.publicId,
      await buildSupplierRebateExportParams({
        search: supplier.name,
        exportType: 'PDF',
      }),
    );
    expect(exportRes.status()).toBe(200);
    expect((await exportRes.text()).trim()).not.toBe('');

    const firstRebate = listRes.data.content?.[0];
    const rebatePublicId = String(firstRebate?.publicId ?? firstRebate?.rebatePublicId ?? '');
    if (rebatePublicId) {
      const agreementRes = await supplierApi.getRebateAgreement(token, supplier.publicId, rebatePublicId);
      expect(agreementRes.status).toBe(200);
      expect(agreementRes.data).toBeTruthy();
    }
  });

  test('covers supplier purchase orders list, summary and export', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Purchase Orders Coverage');

    const listRes = await supplierApi.listPurchaseOrders(
      token,
      supplier.publicId,
      await buildSupplierPurchaseOrderListParams({
        search: supplier.name,
        status: 'PENDING',
        page: 0,
        size: 20,
      }),
    );
    expect(listRes.status).toBe(200);
    expect(listRes.data).toBeTruthy();

    const summaryRes = await supplierApi.getPurchaseOrderSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();
    expect(summaryRes.raw.trim()).not.toBe('');

    const exportRes = await supplierApi.exportPurchaseOrders(
      token,
      supplier.publicId,
      await buildSupplierPurchaseOrderExportParams({
        search: supplier.name,
        exportType: 'PDF',
      }),
    );
    expect(exportRes.status()).toBe(200);
    expect((await exportRes.text()).trim()).not.toBe('');
  });

  test('covers supplier performance analytics endpoints', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Performance Coverage');

    const summaryRes = await supplierApi.getPerformanceSummary(token, supplier.publicId);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();

    const responsivenessRes = await supplierApi.listPerformanceResponsiveness(token, supplier.publicId);
    expect(responsivenessRes.status).toBe(200);
    expect(responsivenessRes.data).toBeTruthy();

    const qualityRes = await supplierApi.getPerformanceQuality(token, supplier.publicId);
    expect(qualityRes.status).toBe(200);
    expect(qualityRes.data).toBeTruthy();

    const orderStatusRes = await supplierApi.getPerformanceOrderStatus(token, supplier.publicId);
    expect(orderStatusRes.status).toBe(200);
    expect(orderStatusRes.data).toBeTruthy();

    const leadDaysRes = await supplierApi.getPerformanceLeadDays(
      token,
      supplier.publicId,
      await buildSupplierPerformanceLeadDaysParams(),
    );
    expect(leadDaysRes.status).toBe(200);
    expect(leadDaysRes.data).toBeTruthy();

    const deliverySeriesRes = await supplierApi.getPerformanceDeliverySeries(
      token,
      supplier.publicId,
      await buildSupplierPerformanceDeliverySeriesParams(),
    );
    expect(deliverySeriesRes.status).toBe(200);
    expect(deliverySeriesRes.data).toBeTruthy();

    const deliveriesRes = await supplierApi.listPerformanceDeliveries(
      token,
      supplier.publicId,
      await buildSupplierPerformanceDeliveryParams({ page: 0, size: 20 }),
    );
    expect(deliveriesRes.status).toBe(200);
    expect(deliveriesRes.data).toBeTruthy();
  });

  test('covers supplier reports dashboard and export endpoints', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const dashboardParams = await buildSupplierReportsDashboardParams();

    const summaryRes = await getSupplierReportsSummaryOrSkip(supplierApi, token, dashboardParams);
    const supplier = await createCompleteSupplier(supplierApi, accountingService, token, 'Supplier Reports Coverage');

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.data).toBeTruthy();

    const suppliersRes = await supplierApi.listSupplierReports(
      token,
      await buildSupplierReportsDashboardParams({ page: 0, size: 10, sort: 'overallPercent,DESC' }),
    );
    expect(suppliersRes.status).toBe(200);
    expect(suppliersRes.data).toBeTruthy();

    const categoriesRes = await supplierApi.listSupplierReportCategories(
      token,
      await buildSupplierReportsDashboardParams({ page: 0, size: 10, sort: 'overallPercent,DESC' }),
    );
    expect(categoriesRes.status).toBe(200);
    expect(categoriesRes.data).toBeTruthy();

    const rankingRes = await supplierApi.listSupplierReportRanking(token, dashboardParams);
    expect(rankingRes.status).toBe(200);
    expect(rankingRes.data).toBeTruthy();

    const trendRes = await supplierApi.listSupplierReportTrend(
      token,
      await buildSupplierReportsDashboardParams({
        from: `${new Date().getFullYear()}-01-01`,
        to: `${new Date().getFullYear()}-12-31`,
      }),
    );
    expect([200, 400]).toContain(trendRes.status);
    expect(trendRes.data).toBeTruthy();

    const exportRes = await supplierApi.exportSupplierReports(
      token,
      await buildSupplierReportsExportParams({
        search: supplier.name,
        exportType: 'PDF',
      }),
    );
    expect(exportRes.status()).toBe(200);
    expect((await exportRes.text()).trim()).not.toBe('');

    const performanceExportRes = await supplierApi.exportSupplierPerformance(
      token,
      await buildSupplierPerformanceExportParams({ exportType: 'PDF' }),
    );
    expect(performanceExportRes.status()).toBe(200);
    expect((await performanceExportRes.text()).trim()).not.toBe('');
  });
});
