import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE = "lsh_session";
const SESSION_DAYS = 30;

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = {
  sub: string;
  role: Role;
};

export async function signSessionToken(user: Pick<User, "id" | "role">): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return { sub: payload.sub, role: (payload.role as Role) ?? "CUSTOMER" };
  } catch {
    return null;
  }
}

export async function createSession(user: Pick<User, "id" | "role">): Promise<void> {
  const token = await signSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/**
 * Current user, freshly loaded from the database (role changes take effect
 * immediately). Memoized per request.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return db.user.findUnique({ where: { id: payload.sub } });
});

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export function isStaff(user: User | null): boolean {
  return user?.role === "ADMIN" || user?.role === "STAFF";
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN";
}

/** Bearer-token auth for the mobile REST API (/api/v1). */
export async function getBearerUser(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const payload = await verifySessionToken(header.slice(7));
  if (!payload) return null;
  return db.user.findUnique({ where: { id: payload.sub } });
}
