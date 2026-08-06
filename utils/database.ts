import 'dotenv/config';
import { Pool, PoolConfig, QueryResultRow } from 'pg';

function buildPoolConfig(): PoolConfig | undefined {
  if (process.env.MS_DATABASE_URL) {
    return { connectionString: process.env.MS_DATABASE_URL };
  }

  const host = process.env.PGHOST || process.env.DATABASE_HOST;
  const portValue = process.env.PGPORT || process.env.DATABASE_PORT;
  const port = portValue ? Number(portValue) : undefined;
  const database = process.env.PGDATABASE || process.env.DATABASE_NAME;
  const user = process.env.PGUSER || process.env.DATABASE_USER;
  const password = process.env.PGPASSWORD || process.env.DATABASE_PASSWORD;
  const sslMode = process.env.PGSSLMODE || process.env.MS_DATABASE_SSLMODE;

  if (!host || !database || !user || !password) {
    return undefined;
  }

  return {
    host,
    port,
    database,
    user,
    password,
    connectionTimeoutMillis: Number(process.env.PGCONNECT_TIMEOUT_MS || 5000),
    ssl: sslMode === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

export function hasDatabaseConfig(): boolean {
  return Boolean(buildPoolConfig());
}

let databaseInstance: _database | null = null;
let databaseInitPromise: Promise<_database | null> | null = null;

export class _database {
  private pool?: Pool;

  constructor(config = buildPoolConfig()) {
    if (config) {
      this.pool = new Pool(config);
    }
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
    if (!this.pool) {
      throw new Error('Database credentials are not configured in .env.');
    }

    return this.pool.query<T>(sql, params);
  }

  async close() {
    await this.pool?.end();
  }
}

export async function initializeDatabase(): Promise<_database | null> {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (databaseInitPromise) {
    return databaseInitPromise;
  }

  const config = buildPoolConfig();
  if (!config) {
    return null;
  }

  databaseInitPromise = (async () => {
    const db = new _database(config);
    await db.query('select 1');
    databaseInstance = db;
    return db;
  })();

  try {
    return await databaseInitPromise;
  } finally {
    databaseInitPromise = null;
  }
}

export function getDatabase(): _database | null {
  if (databaseInstance) {
    return databaseInstance;
  }

  const config = buildPoolConfig();
  if (!config) {
    return null;
  }

  databaseInstance = new _database(config);
  return databaseInstance;
}

export async function closeDatabase() {
  await databaseInstance?.close();
  databaseInstance = null;
}
