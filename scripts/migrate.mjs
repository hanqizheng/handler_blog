import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

// Compose injects the server's app.env; no local dotenv files are loaded here.
let connection;
try {
  if (!process.env.DATABASE_URL)
    throw new Error("Missing database configuration");
  connection = await mysql.createConnection(process.env.DATABASE_URL);
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(
      new URL("../db/migrations/", import.meta.url),
    ),
  });
  console.log("Database migrations completed");
} catch {
  console.error(
    "Database migration failed; inspect the database on the server",
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
