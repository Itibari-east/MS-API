import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, json, unique } from '../../helpers/testHelpers';
import { serviceConstants } from '../../constants/endpoints';
import {
  createDocumentRule,
  createUploadedDocument,
  expectStatuses,
  fetchDocumentRuleItems,
} from '../../utils/documentServiceTestHelpers';

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

test.describe.serial('@document Document Service API', () => {
  test.setTimeout(120000);

  test.describe('Document Rule Management', () => {
    test('creates, gets, updates, lists, and deletes a document rule', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const rule = await createDocumentRule(documentService, token, {
        documentDescription: 'Document rule created for lifecycle coverage',
      });

      const getRes = await expectStatuses(documentService.getDocumentRule(token, rule.publicId), [200]);
      const getBody = await json(getRes);
      expect(getBody).toMatchObject({
        publicId: rule.publicId,
        documentName: rule.documentName,
        entityType: serviceConstants.document.entityType.user,
        entitySubType: serviceConstants.document.entitySubType.profile,
        documentRequired: true,
        documentExpiryCheck: false,
        documentType: serviceConstants.document.documentType.kycDocument,
      });

      const updatedName = `${rule.documentName} Updated`;
      const updatedDescription = 'Updated document rule description';
      const updateRes = await expectStatuses(
        documentService.updateDocumentRule(token, rule.publicId, {
          documentName: updatedName,
          entityType: serviceConstants.document.entityType.user,
          entitySubType: serviceConstants.document.entitySubType.profile,
          documentRequired: true,
          documentExpiryCheck: true,
          documentDescription: updatedDescription,
          documentType: serviceConstants.document.documentType.kycDocument,
        }),
        [200],
      );
      const updateBody = await json(updateRes);
      expect(updateBody).toMatchObject({
        publicId: rule.publicId,
        documentName: updatedName,
        documentDescription: updatedDescription,
        documentExpiryCheck: true,
      });

      const listItemsRes = await fetchDocumentRuleItems(documentService, token, {
        entityType: serviceConstants.document.entityType.user,
        entitySubType: serviceConstants.document.entitySubType.profile,
        documentName: updatedName,
      });
      expect(listItemsRes.some((item) => item.publicId === rule.publicId)).toBeTruthy();
      expect(listItemsRes.every((item) => item.entityType === serviceConstants.document.entityType.user)).toBeTruthy();
      expect(listItemsRes.every((item) => item.entitySubType === serviceConstants.document.entitySubType.profile)).toBeTruthy();

      const noResultItems = await fetchDocumentRuleItems(documentService, token, {
        entityType: serviceConstants.document.entityType.user,
        entitySubType: serviceConstants.document.entitySubType.profile,
        documentName: unique('No Matching Document Rule'),
      });
      expect(noResultItems).toHaveLength(0);

      await expectStatuses(documentService.deleteDocumentRule(token, rule.publicId), [200, 204]);

      const deletedRes = await expectStatuses(documentService.getDocumentRule(token, rule.publicId), [400, 404]);
      const deletedText = await deletedRes.text();
      expect(deletedText.toLowerCase()).toMatch(/not found|invalid|missing|does not exist|error/);
    });

    test('rejects document rule creation with missing required fields', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const response = await documentService.createDocumentRule(token, {
        documentName: '',
        entityType: '',
        entitySubType: '',
        documentRequired: true,
        documentExpiryCheck: false,
        documentDescription: '',
        documentType: '',
      });

      expect([400, 422]).toContain(response.status());
    });

    test('rejects document rule requests without authentication', async ({ documentService }) => {
      const response = await documentService.listDocumentRules('', {
        entityType: serviceConstants.document.entityType.user,
        entitySubType: serviceConstants.document.entitySubType.profile,
      });

      expect([401, 403]).toContain(response.status());
    });

    test('rejects lookup for a malformed document rule public id', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const response = await documentService.getDocumentRule(token, 'not-a-valid-public-id');

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('File Management', () => {
    test('uploads, lists, and deletes a file using a document rule', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const rule = await createDocumentRule(documentService, token, {
        documentDescription: 'Document rule for file upload coverage',
      });
      const uploaded = await createUploadedDocument(documentService, token, rule.publicId, 'Document Upload Coverage');

      const listRes = await expectStatuses(
        documentService.listFiles(token, {
          referenceId: uploaded.referenceId,
          referenceType: uploaded.referenceType,
          documentName: uploaded.description,
          searchParam: uploaded.description,
          page: 0,
          size: 20,
          sort: 'creationTime,DESC',
        }),
        [200],
      );
      const listBody = await json(listRes);
      const items = listItems(listBody);
      expect(items.length, `expected uploaded file in ${JSON.stringify(listBody)}`).toBeGreaterThan(0);
      expect(items.some((item) => String(item.publicId ?? '') === uploaded.publicId)).toBeTruthy();
      expect(items.every((item) => item.referenceId === uploaded.referenceId)).toBeTruthy();
      expect(items.every((item) => item.referenceType === uploaded.referenceType)).toBeTruthy();

      await expectStatuses(documentService.deleteFile(token, uploaded.publicId), [200, 204]);
      await expectStatuses(documentService.deleteDocumentRule(token, rule.publicId), [200, 204]);
    });

    test('rejects file requests without authentication', async ({ documentService }) => {
      const response = await documentService.listFiles('', {
        page: 0,
        size: 10,
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Event Management', () => {
    test('lists events for a reference id after file upload', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const rule = await createDocumentRule(documentService, token, {
        documentDescription: 'Document rule for event coverage',
      });
      const uploaded = await createUploadedDocument(documentService, token, rule.publicId, 'Document Event Coverage');

      const eventRes = await expectStatuses(
        documentService.listEvents(token, uploaded.referenceId, {
          page: 0,
          size: 20,
          sort: 'creationTime,DESC',
        }),
        [200],
      );
      const eventBody = await json(eventRes);
      const items = listItems(eventBody);
      expect(items.length, `expected events for ${uploaded.referenceId} in ${JSON.stringify(eventBody)}`).toBeGreaterThan(0);
      expect(items.every((item) => String(item.referenceId ?? '') === uploaded.referenceId)).toBeTruthy();

      await expectStatuses(documentService.deleteFile(token, uploaded.publicId), [200, 204]);
      await expectStatuses(documentService.deleteDocumentRule(token, rule.publicId), [200, 204]);
    });
  });

  test.describe('Validation and auth negatives', () => {
    test('rejects deleting a non-existent document rule', async ({ documentService }) => {
      const token = getTokenOrSkip();
      const response = await documentService.deleteDocumentRule(token, '00000000-0000-0000-0000-000000000000');

      expect([400, 404]).toContain(response.status());
    });

    test('rejects document rule deletion without authentication', async ({ documentService }) => {
      const response = await documentService.deleteDocumentRule('', '00000000-0000-0000-0000-000000000000');

      expect([401, 403]).toContain(response.status());
    });
  });
});
