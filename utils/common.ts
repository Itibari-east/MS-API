import { APIResponse, request } from '@playwright/test'

type HeadersRecord = { [key: string]: string }

function prettyBody(body: unknown) {
  if (body === undefined) {
    return ''
  }

  try {
    return JSON.stringify(body)
  } catch {
    return '[unserializable body]'
  }
}

function responsePreview(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return '<empty>'
  }

  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed
}

function redactHeaders(headers?: HeadersRecord) {
  if (!headers) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase() === 'authorization' ? 'Bearer [REDACTED]' : value,
    ]),
  )
}

async function logResponse(method: string, url: string, response: APIResponse) {
  const status = response.status()
  const raw = await response.text()
  console.log(`[HTTP] <- ${method} ${url} ${status} ${responsePreview(raw)}`)
  return response
}

export class _common {
  async getResponse(url: string, body?: any, headers?: HeadersRecord, timeout = 30000) {
    const apiRequestContext = await request.newContext()
    const requestHeaders = redactHeaders(headers)
    console.log(
      `[HTTP] -> GET ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}${requestHeaders ? ` ${prettyBody(requestHeaders)}` : ''}`,
    )
    const response = await apiRequestContext.get(url, {
      ...(body && { data: body }),
      ...(headers && { headers }),
      timeout,
    })
    return logResponse('GET', url, response)
  }

  async postResponse(url: string, body?: any, headers?: HeadersRecord, timeout = 30000) {
    const apiRequestContext = await request.newContext()
    const requestHeaders = redactHeaders(headers)
    console.log(
      `[HTTP] -> POST ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}${requestHeaders ? ` ${prettyBody(requestHeaders)}` : ''}`,
    )
    const response = await apiRequestContext.post(url, {
      ...(body && { data: body }),
      ...(headers && { headers }),
      timeout,
    })
    return logResponse('POST', url, response)
  }

  async putResponse(url: string, body?: any, headers?: HeadersRecord, timeout = 30000) {
    const apiRequestContext = await request.newContext()
    const requestHeaders = redactHeaders(headers)
    console.log(
      `[HTTP] -> PUT ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}${requestHeaders ? ` ${prettyBody(requestHeaders)}` : ''}`,
    )
    const response = await apiRequestContext.put(url, {
      ...(body && { data: body }),
      ...(headers && { headers }),
      timeout,
    })
    return logResponse('PUT', url, response)
  }

  async patchResponse(url: string, body?: any, headers?: HeadersRecord, timeout = 30000) {
    const apiRequestContext = await request.newContext()
    const requestHeaders = redactHeaders(headers)
    console.log(
      `[HTTP] -> PATCH ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}${requestHeaders ? ` ${prettyBody(requestHeaders)}` : ''}`,
    )
    const response = await apiRequestContext.patch(url, {
      ...(body && { data: body }),
      ...(headers && { headers }),
      timeout,
    })
    return logResponse('PATCH', url, response)
  }

  async deleteResponse(url: string, body?: any, headers?: HeadersRecord, timeout = 30000) {
    const apiRequestContext = await request.newContext()
    const requestHeaders = redactHeaders(headers)
    console.log(
      `[HTTP] -> DELETE ${url}${body !== undefined ? ` ${prettyBody(body)}` : ''}${requestHeaders ? ` ${prettyBody(requestHeaders)}` : ''}`,
    )
    const response = await apiRequestContext.delete(url, {
      ...(body && { data: body }),
      ...(headers && { headers }),
      timeout,
    })
    return logResponse('DELETE', url, response)
  }
}

export const common = new _common()
