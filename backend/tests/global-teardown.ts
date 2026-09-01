export default async function globalTeardown() {
  const server = (globalThis as any).__TEST_DB_SERVER__;
  const pglite = (globalThis as any).__PGLITE_INSTANCE__;

  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  if (pglite) {
    await pglite.close();
  }
}
