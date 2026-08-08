import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip } from '../../helpers/testHelpers';
import { SUPPLIER_FIXTURES, buildSupplierDocumentExportParams, buildSupplierDocumentListParams, createSupplierWithUploadedDocument } from '../../helpers/supplierFactory';

test.describe.serial('Supplier Documents API', () => {
  test.setTimeout(100000);

  test('uploads a supplier document and lists it', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const seed = await createSupplierWithUploadedDocument(supplierApi, accountingService, token, 'Supplier Docs Upload');
    const documentId = String(seed.document.publicId ?? seed.document.documentPublicId ?? '');

    expect(documentId).toBeTruthy();
    expect(seed.document.documentTypeCode).toBe(SUPPLIER_FIXTURES.secondaryDocumentTypeCode);
    expect(seed.document.fileName).toContain('supplier-upload');

    const listRes = await supplierApi.listDocuments(
      token,
      seed.supplier.publicId,
      await buildSupplierDocumentListParams({
        search: seed.document.fileName,
        documentTypeCode: seed.document.documentTypeCode,
      }),
    );
    expect(listRes.status).toBe(200);
    expect(listRes.data.content ?? []).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          publicId: documentId,
          fileName: seed.document.fileName,
          documentTypeCode: seed.document.documentTypeCode,
        }),
      ]),
    );
  });

  test('sends a renewal reminder and exposes view and download URLs', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const seed = await createSupplierWithUploadedDocument(
      supplierApi,
      accountingService,
      token,
      'Supplier Docs Reminder',
      SUPPLIER_FIXTURES.secondaryDocumentTypeCode,
      '2026-08-09',
    );
    const documentId = String(seed.document.publicId ?? seed.document.documentPublicId ?? '');

    const reminderRes = await supplierApi.sendDocumentRenewalReminder(token, seed.supplier.publicId, documentId);
    expect([200, 204]).toContain(reminderRes.status());

    const viewRes = await supplierApi.viewDocument(token, seed.supplier.publicId, documentId);
    expect(viewRes.status()).toBe(200);
    expect(await viewRes.text()).toContain('stub://files/view/');

    const downloadRes = await supplierApi.downloadDocument(token, seed.supplier.publicId, documentId);
    expect(downloadRes.status()).toBe(200);
    expect(await downloadRes.text()).toContain('stub://files/download/');
  });

  test('exports supplier documents', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const seed = await createSupplierWithUploadedDocument(supplierApi, accountingService, token, 'Supplier Docs Export');

    const exportRes = await supplierApi.exportDocuments(
      token,
      seed.supplier.publicId,
      await buildSupplierDocumentExportParams({
        search: seed.document.fileName,
      }),
    );
    expect(exportRes.status()).toBe(200);

    const exportBody = await exportRes.text();
    expect(exportBody.trim()).not.toBe('');
    expect(exportRes.headers()['content-type'] ?? '').toBeTruthy();
  });

  test('rejects supplier document requests without authentication', async ({ supplierApi }) => {
    await expect(
      supplierApi.listDocuments('', '00000000-0000-0000-0000-000000000000', await buildSupplierDocumentListParams()),
    ).rejects.toThrow(/401/i);
  });

  test('returns 404 for an invalid supplier document id', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const seed = await createSupplierWithUploadedDocument(supplierApi, accountingService, token, 'Supplier Docs Invalid');

    await expect(
      supplierApi.viewDocument(token, seed.supplier.publicId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(/404|not found/i);
  });

  test('rejects malformed supplier document upload payloads', async ({ supplierApi, accountingService }) => {
    const token = getTokenOrSkip();
    const seed = await createSupplierWithUploadedDocument(supplierApi, accountingService, token, 'Supplier Docs Invalid Payload');

    await expect(
      supplierApi.uploadDocument(token, seed.supplier.publicId, {
        documentTypeCode: '',
        storageKey: 'stub/storage/key-invalid',
        fileName: 'invalid-upload.pdf',
        contentType: 'application/pdf',
        file: {
          name: 'invalid-upload.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('invalid-upload'),
        },
      } as any),
    ).rejects.toThrow(/400|422|missing|validation|document/i);
  });
});
