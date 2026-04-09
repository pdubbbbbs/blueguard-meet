import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "blueguard-meet.db");

export function initDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Read and execute the init migration
  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init_sqlite.sql");
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, "utf-8");
    db.exec(sql);
    console.log("[Database] Schema initialized at", DB_PATH);
  }

  db.close();
}

// Run if called directly
initDatabase();
