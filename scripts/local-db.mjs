// Local development database: real PostgreSQL 17, no Docker required.
// Starts on port 5433 with a `lilys` database and keeps running until Ctrl+C.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".pgdata");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
});

if (firstRun) {
  console.log("[db] initialising fresh PostgreSQL data dir…");
  await pg.initialise();
}
await pg.start();
if (firstRun) {
  await pg.createDatabase("lilys");
}
console.log("[db] PostgreSQL 17 running on postgresql://postgres:postgres@localhost:5433/lilys");
console.log("[db] press Ctrl+C to stop");

const stop = async () => {
  console.log("\n[db] stopping…");
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
