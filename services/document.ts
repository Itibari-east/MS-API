import { request } from '@playwright/test';
import { _DocumentRequests } from '../requests/document';
import { common } from '../utils/common';
import { authHeaders, QueryParams, withQueryParams } from './requestHelpers';

export type DocumentFileUploadPayload = {
  referenceId: string;
  referenceType: string;
  description: string;
  documentRulePublicId: string;
  expiryDate?: string;
  file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  };
};

export class _DocumentService {
  listDocumentRules(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_DocumentRequests.documentRules.list(), params), undefined, authHeaders(token));
  }

  createDocumentRule(token: string, payload: unknown) {
    return common.postResponse(_DocumentRequests.documentRules.create(), payload, authHeaders(token));
  }

  getDocumentRule(token: string, publicId: string) {
    return common.getResponse(_DocumentRequests.documentRules.byPublicId(publicId), undefined, authHeaders(token));
  }

  updateDocumentRule(token: string, publicId: string, payload: unknown) {
    return common.patchResponse(_DocumentRequests.documentRules.byPublicId(publicId), payload, authHeaders(token));
  }

  deleteDocumentRule(token: string, publicId: string) {
    return common.deleteResponse(_DocumentRequests.documentRules.byPublicId(publicId), undefined, authHeaders(token));
  }

  listFiles(token: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_DocumentRequests.files.list(), params), undefined, authHeaders(token));
  }

  uploadFile(token: string, payload: DocumentFileUploadPayload) {
    const multipart = {
      file: payload.file,
    };

    const url = withQueryParams(_DocumentRequests.files.upload(), {
      referenceId: payload.referenceId,
      referenceType: payload.referenceType,
      description: payload.description,
      documentRulePublicId: payload.documentRulePublicId,
      expiryDate: payload.expiryDate,
    });

    return (async () => {
      const apiRequestContext = await request.newContext();
      console.log(`[HTTP] -> POST ${url} ${JSON.stringify({
        referenceId: payload.referenceId,
        referenceType: payload.referenceType,
        description: payload.description,
        documentRulePublicId: payload.documentRulePublicId,
        expiryDate: payload.expiryDate,
        file: { name: payload.file.name, mimeType: payload.file.mimeType },
      })}`);
      const response = await apiRequestContext.post(url, {
        headers: authHeaders(token),
        multipart,
      });
      const raw = await response.text();
      console.log(`[HTTP] <- POST ${url} ${response.status()} ${raw.trim() ? raw.slice(0, 500) : '<empty>'}`);
      return response;
    })();
  }

  deleteFile(token: string, publicId: string) {
    return common.deleteResponse(_DocumentRequests.files.byId(publicId), undefined, authHeaders(token));
  }

  listEvents(token: string, referenceId: string, params?: QueryParams) {
    return common.getResponse(withQueryParams(_DocumentRequests.events.byReferenceId(referenceId), params), undefined, authHeaders(token));
  }
}
