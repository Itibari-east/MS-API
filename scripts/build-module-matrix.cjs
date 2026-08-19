#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testsDir = path.resolve(process.cwd(), 'tests');

const moduleMetadata = {
  auth: { moduleName: 'Auth API', tag: '@auth', moduleSlug: 'auth' },
  accounting: { moduleName: 'Accounting API', tag: '@accounting', moduleSlug: 'accounting' },
  commercials: { moduleName: 'Commercials API', tag: '@commercials', moduleSlug: 'commercials' },
  document: { moduleName: 'Document Service API', tag: '@document', moduleSlug: 'document' },
  inventory: { moduleName: 'Inventory API', tag: '@inventory', moduleSlug: 'inventory' },
  logistics: { moduleName: 'Logistics Service API', tag: '@logistics', moduleSlug: 'logistics' },
  pos: { moduleName: 'POS API', tag: '@pos', moduleSlug: 'pos' },
  suppliers: { moduleName: 'Supplier API', tag: '@supplier', moduleSlug: 'supplier' },
  usermanagement: { moduleName: 'User Management API', tag: '@usermanagement', moduleSlug: 'usermanagement' },
};

const preferredOrder = ['auth', 'pos', 'accounting', 'commercials', 'document', 'inventory', 'logistics', 'suppliers', 'usermanagement'];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(filePath));
    } else {
      files.push(filePath);
    }
  }

  return files;
}

function getModuleKey(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const relative = path.relative(testsDir, filePath).replace(/\\/g, '/');

  if (relative === 'auth.spec.ts') {
    return 'auth';
  }

  const [moduleKey] = relative.split('/');
  return moduleKey || normalized;
}

function buildMatrix() {
  if (!fs.existsSync(testsDir)) {
    return { include: [] };
  }

  const specFiles = walk(testsDir).filter((filePath) => filePath.endsWith('.spec.ts'));
  const keys = new Set(specFiles.map(getModuleKey));
  const sortedKeys = [...keys].sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    }

    return left.localeCompare(right);
  });

  const include = sortedKeys.map((moduleKey) => {
    const metadata =
      moduleMetadata[moduleKey] || {
        moduleName: `${moduleKey.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())} API`,
        tag: `@${moduleKey.replace(/[^a-z0-9]+/gi, '').toLowerCase()}`,
        moduleSlug: moduleKey.replace(/[^a-z0-9]+/gi, '').toLowerCase(),
      };

    return {
      moduleKey,
      moduleName: metadata.moduleName,
      moduleSlug: metadata.moduleSlug,
      tag: metadata.tag,
    };
  });

  return { include };
}

process.stdout.write(`${JSON.stringify(buildMatrix())}\n`);
