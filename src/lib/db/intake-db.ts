import { Pool, type PoolClient } from "pg";

export const intakePool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });

export async function intakeTransaction<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await intakePool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
