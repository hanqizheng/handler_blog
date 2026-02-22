import { eq } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export type CurrentAdminUser = {
  id: number;
  email: string;
  role: "owner" | "admin";
  totpSecret: string;
  createdBy: number | null;
};

export const getCurrentAdminUser = async (): Promise<CurrentAdminUser | null> => {
  const session = await getAdminSession();
  if (!session) return null;

  if (session.actorType === "dev") {
    return {
      id: session.sub,
      email: session.email,
      role: "owner",
      totpSecret: "",
      createdBy: null,
    };
  }

  const [user] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      role: adminUsers.role,
      totpSecret: adminUsers.totpSecret,
      createdBy: adminUsers.createdBy,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.sub))
    .limit(1);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role === "owner" ? "owner" : "admin",
    totpSecret: user.totpSecret,
    createdBy: user.createdBy,
  };
};

export const ensureOwnerAdminUser = async (): Promise<
  | {
      ok: true;
      user: CurrentAdminUser;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: "unauthorized" | "forbidden";
    }
> => {
  const user = await getCurrentAdminUser();
  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  if (user.role !== "owner") {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return { ok: true, user };
};
