import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { serviceConstants } from '../constants/endpoints';
import { _DocumentService, DocumentFileUploadPayload } from '../services/document';
import { json, unique } from '../helpers/testHelpers';

export type CreatedDocumentRule = {
  publicId: string;
  documentName: string;
  entityType: string;
  entitySubType: string;
  documentRequired: boolean;
  documentExpiryCheck: boolean;
  documentDescription: string;
  documentType: string;
};

export type UploadedDocumentFile = {
  publicId: string;
  referenceId: string;
  referenceType: string;
  description: string;
  documentRulePublicId: string;
  fileName: string;
};

export function expectStatuses<T extends { status(): number }>(responsePromise: Promise<T>, allowedStatuses: number[]) {
  return responsePromise.then((response) => {
    const status = response.status();
    if (!allowedStatuses.includes(status)) {
      expect(allowedStatuses, `Unexpected status ${status}`).toContain(status);
    }

    return response;
  });
}

function listItems(body: any): Array<Record<string, unknown>> {
  if (Array.isArray(body)) {
    return body as Array<Record<string, unknown>>;
  }

  return Array.isArray(body?.content) ? (body.content as Array<Record<string, unknown>>) : [];
}

function firstItem(body: any) {
  return Array.isArray(body) ? body[0] : body?.content?.[0] ?? body;
}

export function futureDate(days = 30) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function documentRuleName(prefix = 'Document Rule') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function documentReferenceId() {
  return randomUUID();
}

export function documentFileBuffer(label: string) {
  return Buffer.from(`document-service:${label}:${Date.now()}`);
}

export function extractDocumentRule(body: any): CreatedDocumentRule {
  const item = firstItem(body);
  return {
    publicId: String(item?.publicId ?? ''),
    documentName: String(item?.documentName ?? ''),
    entityType: String(item?.entityType ?? ''),
    entitySubType: String(item?.entitySubType ?? ''),
    documentRequired: Boolean(item?.documentRequired),
    documentExpiryCheck: Boolean(item?.documentExpiryCheck),
    documentDescription: String(item?.documentDescription ?? ''),
    documentType: String(item?.documentType ?? ''),
  };
}

export async function createDocumentRule(
  documentService: _DocumentService,
  token: string,
  overrides?: Partial<Pick<CreatedDocumentRule, 'documentName' | 'entityType' | 'entitySubType' | 'documentRequired' | 'documentExpiryCheck' | 'documentDescription' | 'documentType'>>,
): Promise<CreatedDocumentRule> {
  const payload = {
    documentName: overrides?.documentName ?? unique('QA Document Rule'),
    entityType: overrides?.entityType ?? serviceConstants.document.entityType.user,
    entitySubType: overrides?.entitySubType ?? serviceConstants.document.entitySubType.profile,
    documentRequired: overrides?.documentRequired ?? true,
    documentExpiryCheck: overrides?.documentExpiryCheck ?? false,
    documentDescription: overrides?.documentDescription ?? 'Document rule created by automation',
    documentType: overrides?.documentType ?? serviceConstants.document.documentType.kycDocument,
  };

  const response = await expectStatuses(documentService.createDocumentRule(token, payload), [200, 201]);
  const body = await json(response);
  const rule = extractDocumentRule(body);

  expect(rule.publicId, `document rule response missing publicId: ${JSON.stringify(body)}`).toBeTruthy();
  return rule;
}

export async function fetchDocumentRuleItems(
  documentService: _DocumentService,
  token: string,
  filters: Record<string, string | number | boolean | null | undefined>,
) {
  const response = await expectStatuses(documentService.listDocumentRules(token, filters), [200]);
  const body = await json(response);
  return listItems(body);
}

export async function createUploadedDocument(
  documentService: _DocumentService,
  token: string,
  rulePublicId: string,
  label: string,
): Promise<UploadedDocumentFile> {
  const referenceId = documentReferenceId();
  const description = `${label}-${Date.now()}`;
  const fileName = `${label.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  const payload: DocumentFileUploadPayload = {
    referenceId,
    referenceType: serviceConstants.document.referenceType.user,
    description,
    documentRulePublicId: rulePublicId,
    expiryDate: futureDate(60),
    file: {
      name: fileName,
      mimeType: 'application/pdf',
      buffer: documentFileBuffer(label),
    },
  };

  const response = await expectStatuses(documentService.uploadFile(token, payload), [200, 201]);
  const body = await json(response);
  const item = firstItem(body);
  const publicId = String(item?.publicId ?? item?.documentPublicId ?? '');

  expect(publicId, `upload response missing publicId: ${JSON.stringify(body)}`).toBeTruthy();

  return {
    publicId,
    referenceId,
    referenceType: payload.referenceType,
    description,
    documentRulePublicId: rulePublicId,
    fileName,
  };
}

