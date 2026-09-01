import net from 'net';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

export default async function globalSetup() {
  const pgliteInstance = new PGlite();
  const migrationPath = path.join(
    __dirname,
    '../prisma/migrations/20260901000000_init_domain_schema/migration.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await pgliteInstance.exec(migrationSql);

  const testDbServer = net.createServer((socket) => {
    socket.on('data', async (data) => {
      try {
        const response = await pgliteInstance.execProtocolRaw(data);
        socket.write(response);
      } catch {
        // Socket closed or stream error
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    testDbServer.listen(5432, () => {
      resolve();
    });

    testDbServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve();
      } else {
        reject(err);
      }
    });
  });

  (globalThis as any).__TEST_DB_SERVER__ = testDbServer;
  (globalThis as any).__PGLITE_INSTANCE__ = pgliteInstance;
}
