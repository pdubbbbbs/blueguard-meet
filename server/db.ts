import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { InsertUser, users, meetings, InsertMeeting } from "../drizzle/schema";
import { ENV } from './_core/env';
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "blueguard-meet.db");

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite);
  }
  return _db;
}

export function upsertUser(user: InsertUser): void {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = getDb();

  try {
    const existing = db.select().from(users).where(eq(users.openId, user.openId)).limit(1).all();

    if (existing.length > 0) {
      const updateSet: Record<string, unknown> = {};
      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        updateSet[field] = value ?? null;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        updateSet.role = 'admin';
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = new Date();
      }

      db.update(users).set(updateSet).where(eq(users.openId, user.openId)).run();
    } else {
      const values: InsertUser = {
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.openId === ENV.ownerOpenId ? 'admin' : (user.role ?? 'user'),
        lastSignedIn: user.lastSignedIn ?? new Date(),
      };
      db.insert(users).values(values).run();
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export function getUserByOpenId(openId: string) {
  const db = getDb();
  const result = db.select().from(users).where(eq(users.openId, openId)).limit(1).all();
  return result.length > 0 ? result[0] : undefined;
}

// ===== Meeting Helpers =====

export function createMeeting(data: InsertMeeting) {
  const db = getDb();
  db.insert(meetings).values(data).run();
  const result = db.select().from(meetings).where(eq(meetings.roomId, data.roomId)).limit(1).all();
  return result[0];
}

export function getMeetingByRoomId(roomId: string) {
  const db = getDb();
  const result = db.select().from(meetings).where(eq(meetings.roomId, roomId)).limit(1).all();
  return result.length > 0 ? result[0] : null;
}

export function endMeeting(roomId: string) {
  const db = getDb();
  db.update(meetings).set({ isActive: false, endedAt: new Date() }).where(eq(meetings.roomId, roomId)).run();
}

export function verifyHostSecret(roomId: string, hostSecret: string): boolean {
  const db = getDb();
  const result = db.select({ hostSecret: meetings.hostSecret })
    .from(meetings).where(eq(meetings.roomId, roomId)).limit(1).all();
  if (result.length === 0) return false;
  return result[0].hostSecret === hostSecret;
}
