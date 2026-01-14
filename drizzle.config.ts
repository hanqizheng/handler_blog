import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const isProduction =
  process.env.DRIZZLE_ENV === "production" ||
  process.env.NODE_ENV === "production";
const envFiles = isProduction
  ? [".env.production", ".env.local", ".env"]
  : [".env.local", ".env"];

for (const envFile of envFiles) {
  config({ path: envFile });
}

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
