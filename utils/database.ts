import 'dotenv/config';
import { Pool, PoolConfig, QueryResultRow } from 'pg';

function buildPoolConfig(): PoolConfig | undefined {
  if (process.env.MS_DATABASE_URL) {
    return { connectionString: process.env.MS_DATABASE_URL };
  }

  const host = process.env.PGHOST;
  const port = process.env.PGPORT ? Number(process.env.PGPORT) : undefined;
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
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
    ssl: sslMode === 'require' ? { rejectUnauthorized: false } : undefined,
  };
}

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
