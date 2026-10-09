const fs = require('fs');
const path = require('path');

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/generate-postman-collection.cjs <openapi.json> <collection.json>');
}

const spec = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);

function resolve(reference) {
  if (!reference?.$ref) return reference;
  return reference.$ref.slice(2).split('/').reduce((value, key) => value?.[key], spec);
}

function exampleFor(schema, depth = 0) {
  schema = resolve(schema) || {};
  if (depth > 4) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === 'array') return [exampleFor(schema.items, depth + 1)];
  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties || {}).map(([key, value]) => [key, exampleFor(value, depth + 1)]),
    );
  }
  if (schema.format === 'uuid') return `{{${schema.title || 'publicId'}}}`;
  if (schema.format === 'date') return '2026-01-01';
  if (schema.format === 'date-time') return '2026-01-01T00:00:00Z';
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  return 'string';
}

function parameterValue(parameter) {
  if (parameter.example !== undefined) return String(parameter.example);
  const schema = resolve(parameter.schema);
  if (parameter.name === 'pageable') return 'page=0&size=20';
  return String(exampleFor(schema));
}

function requestFor(method, route, operation, inheritedParameters = []) {
  const parameters = [...inheritedParameters, ...(operation.parameters || [])].map(resolve);
  const pathParameters = parameters.filter((parameter) => parameter.in === 'path');
  const queryParameters = parameters.filter((parameter) => parameter.in === 'query');
  const urlPath = route.replace(/\{([^}]+)\}/g, (_, name) => `{{${name}}}`);
  const rawUrl = `{{baseUrl}}${urlPath}`;
  const request = {
    method: method.toUpperCase(),
    header: [],
    url: {
      raw: rawUrl,
      host: ['{{baseUrl}}'],
      path: urlPath.split('/').filter(Boolean),
      query: queryParameters.map((parameter) => ({
        key: parameter.name,
        value: parameterValue(parameter),
        description: parameter.description || '',
        disabled: !parameter.required,
      })),
      variable: pathParameters.map((parameter) => ({ key: parameter.name, value: `{{${parameter.name}}}` })),
    },
    description: operation.description || operation.summary || '',
  };

  const content = operation.requestBody?.content?.['application/json'];
  if (content) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(exampleFor(content.schema), null, 2), options: { raw: { language: 'json' } } };
  }
  return request;
}

const groups = new Map();
for (const [route, pathItem] of Object.entries(spec.paths || {})) {
  const inheritedParameters = pathItem.parameters || [];
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!methods.has(method)) continue;
    const tag = operation.tags?.[0] || 'Other';
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag).push({
      name: `${method.toUpperCase()} ${route} — ${operation.summary || operation.operationId || ''}`.trim(),
      request: requestFor(method, route, operation, inheritedParameters),
    });
  }
}

const collection = {
  info: {
    name: 'Order Service — Dev',
    description: `Generated from the Order Service OpenAPI ${spec.openapi || ''}. The source document currently labels itself "${spec.info?.title || 'unknown'}". Set bearerToken and identifier variables before sending protected or entity-specific requests.`,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{bearerToken}}', type: 'string' }] },
  variable: [
    { key: 'baseUrl', value: 'https://api-micro-dev.itibari.io', type: 'string' },
    { key: 'bearerToken', value: '', type: 'string' },
    { key: 'publicId', value: '', type: 'string' },
    { key: 'storePublicId', value: '', type: 'string' },
  ],
  item: [...groups.entries()].map(([name, item]) => ({ name, item })),
};

fs.writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote ${[...groups.values()].flat().length} requests to ${outputPath}`);
