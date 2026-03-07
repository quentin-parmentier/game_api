import { Database } from "bun:sqlite";
import { randomBytes } from "crypto";
import { join } from "path";

const dbPath = process.env.DB_PATH ?? join(process.cwd(), "game.db");
const db = new Database(dbPath, { create: true });

db.run("PRAGMA journal_mode=WAL;");

db.run(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`);

export function validateApiKey(key: string): boolean {
  const row = db.query("SELECT id FROM api_keys WHERE key = ?").get(key);
  return row !== null;
}

export function createApiKey(name: string): string {
  const key = randomBytes(32).toString("hex");
  db.run("INSERT INTO api_keys (key, name) VALUES (?, ?)", [key, name]);
  return key;
}

export function getRandomWord(): { word: string; category: string } | null {
  return db
    .query(
      `SELECT w.word, c.name AS category
       FROM words w JOIN categories c ON w.category_id = c.id
       ORDER BY RANDOM() LIMIT 1`
    )
    .get() as { word: string; category: string } | null;
}

export function getRandomWords(count: number): { word: string; category: string }[] {
  return db
    .query(
      `SELECT w.word, c.name AS category
       FROM words w JOIN categories c ON w.category_id = c.id
       ORDER BY RANDOM() LIMIT ?`
    )
    .all(count) as { word: string; category: string }[];
}

export function getWordsByCategory(
  category: string,
  count: number
): { word: string; category: string }[] | null {
  const cat = db
    .query("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)")
    .get(category) as { id: number } | null;
  if (!cat) return null;
  return db
    .query(
      `SELECT w.word, c.name AS category
       FROM words w JOIN categories c ON w.category_id = c.id
       WHERE w.category_id = ?
       ORDER BY RANDOM() LIMIT ?`
    )
    .all(cat.id, count) as { word: string; category: string }[];
}

export function listCategories(): string[] {
  const rows = db.query("SELECT name FROM categories ORDER BY name").all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function seedDatabase(data: Array<{ category: string; words: string[] }>) {
  db.run("DELETE FROM words");
  db.run("DELETE FROM categories");

  const insertCat = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
  const insertWord = db.prepare("INSERT INTO words (word, category_id) VALUES (?, ?)");

  for (const { category, words } of data) {
    insertCat.run(category);
    const cat = db.query("SELECT id FROM categories WHERE name = ?").get(category) as { id: number };
    for (const word of words) {
      insertWord.run(word, cat.id);
    }
  }
}

export default db;
