import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { parse as parseCookieHeader } from "cookie";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const ADMIN_USER: User = {
  id: 1,
  openId: "admin",
  name: "Admin",
  email: null,
  loginMethod: "admin-key",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Check admin cookie (set by /api/admin/login)
  const cookies = parseCookieHeader(opts.req.headers.cookie || "");
  if (cookies.admin_token && cookies.admin_token === ENV.adminSecret) {
    user = ADMIN_USER;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
