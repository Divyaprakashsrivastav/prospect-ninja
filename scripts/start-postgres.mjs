import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { createRequire } from "node:module";

const { loadEnvLocal, parseDatabaseUrl } = createRequire(import.meta.url)(
  "./loadEnvLocal.js",
);

async function main() {
  loadEnvLocal();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
  const databaseDir = path.join(process.cwd(), "data", "postgres");
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port,
    persistent: true,
    autoRehydrateSymlinks: true,
    onLog: (message) => {
      const text = String(message);
      if (/password/i.test(text)) {
        return;
      }
      const line = text.trim();
      if (line) {
        console.log("[postgres]", line);
      }
    },
  });

  try {
    await pg.initialise();
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.log("[postgres] init skipped:", text.split("\n")[0]);
  }

  await pg.start();
  try {
    await pg.createDatabase(cfg.database);
  } catch {
    // Cluster user databases are often created by initdb.
  }

  console.log(`PostgreSQL is listening on localhost:${cfg.port}`);
  await new Promise(() => {
    // Keep the cluster running until the process is stopped.
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Failed to start PostgreSQL.");
  process.exit(1);
});
