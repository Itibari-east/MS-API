import { request } from '@playwright/test'

export class _common {
    async getResponse(url: string, body?: any, headers?: {[key:string]: string}, timeout = 30000) {
        const apiRequestContext = await request.newContext();
        return await apiRequestContext.get(url, {
            ...(body && { data: body }),
            ...(headers && { headers: headers }),
            timeout
        });
    }

    async postResponse(url: string, body?: any, headers?: {[key:string]: string}, timeout = 30000) {
        const apiRequestContext = await request.newContext();
        return await apiRequestContext.post(url, {
            ...(body && { data: body }),
            ...(headers && { headers: headers }),
            timeout
        });
    }

    async putResponse(url: string, body?: any, headers?: {[key:string]: string}, timeout = 30000) {
        const apiRequestContext = await request.newContext();
        return await apiRequestContext.put(url, {
            ...(body && { data: body }),
            ...(headers && { headers: headers }),
            timeout
        });
    }

    async patchResponse(url: string, body?: any, headers?: {[key:string]: string}, timeout = 30000) {
        const apiRequestContext = await request.newContext();
        return await apiRequestContext.patch(url, {
            ...(body && { data: body }),
            ...(headers && { headers: headers }),
            timeout
        });
    }

    async deleteResponse(url: string, body?: any, headers?: {[key:string]: string}, timeout = 30000) {
        const apiRequestContext = await request.newContext();
        return await apiRequestContext.delete(url, {
            ...(body && { data: body }),
            ...(headers && { headers: headers }),
            timeout
        });
    }
}
export const common = new _common();
