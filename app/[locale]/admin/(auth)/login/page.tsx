import { sql } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";

import { LoginForm } from "./_components/LoginForm";

export const runtime = "nodejs";

export default async function AdminLoginPage() {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminUsers);
  const showSignupLink = (countRow?.count ?? 0) === 0;

  return <LoginForm showSignupLink={showSignupLink} />;
}
