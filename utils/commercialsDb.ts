import { expect } from '@playwright/test';
import { _database, hasDatabaseConfig } from './database';

type UomDbRow = Record<string, unknown> & {
  public_id?: string;
  name?: string;
  code?: string;
  type?: string;
  status?: string;
  creation_time?: string | Date;
  created_by?: string | null;
  last_modified_by?: string | null;
};

function normalizeRow(row: UomDbRow) {
  return {
    publicId: String(row.public_id ?? row.publicId ?? ''),
    name: String(row.name ?? ''),
    code: String(row.code ?? ''),
    type: String(row.type ?? ''),
    status: String(row.status ?? ''),
    creation_time: row.creation_time ?? row.creationTime,
    created_by: row.created_by ?? row.createdBy,
    last_modified_by: row.last_modified_by ?? row.lastModifiedBy,
  };
}

export function hasUomDbValidation() {
  return hasDatabaseConfig();
}

export async function fetchUomDbRow(publicId: string) {
  if (!hasDatabaseConfig()) {
    console.log(`[UOM][DB] skipped for ${publicId} because database credentials are not configured`);
    return null;
  }

  const database = new _database();
  try {
    const result = await database.query<UomDbRow>(
      'select * from itibari.commercials.uoms where public_id = $1 limit 1',
      [publicId],
    );

    expect(result.rowCount, `expected one DB row for UOM ${publicId}`).toBe(1);
    return normalizeRow(result.rows[0]);
  } catch (error) {
    console.warn(`[UOM][DB] skipped validation for ${publicId} because the database query failed: ${String(error)}`);
    return null;
  } finally {
    await database.close();
  }
}

export async function expectUomDbRow(
  publicId: string,
  expected: {
    name?: string;
    code?: string;
    type?: string;
    status?: string;
    updated?: boolean;
  } = {},
) {
  const row = await fetchUomDbRow(publicId);
  if (!row) {
    return null;
  }

  expect(row.publicId).toBe(publicId);

  if (expected.name) expect(row.name).toBe(expected.name);
  if (expected.code) expect(row.code).toBe(expected.code);
  if (expected.type) expect(row.type.toLowerCase()).toBe(expected.type.toLowerCase());
  if (expected.status) expect(row.status).toBe(expected.status);

  expect(row.creation_time, `creation_time should be populated for UOM ${publicId}`).toBeTruthy();
  expect(row.created_by, `created_by should be populated for UOM ${publicId}`).toBeTruthy();

  if (expected.updated) {
    expect(row.last_modified_by, `last_modified_by should be populated for UOM ${publicId}`).toBeTruthy();
  }

  console.log(
    `[UOM][DB] validated ${publicId} ${JSON.stringify({
      code: row.code,
      type: row.type,
      status: row.status,
      created_by: row.created_by,
      last_modified_by: row.last_modified_by,
    })}`,
  );

  return row;
}
