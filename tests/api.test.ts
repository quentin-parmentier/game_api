import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createApiKey, seedDatabase } from "../src/db.ts";
import { frenchWords } from "../data/french-words.ts";
import type { Subprocess } from "bun";

let apiKey: string;
let serverProcess: Subprocess;

beforeAll(async () => {
  // Seed data and create a test API key in the same DB the server uses
  seedDatabase(frenchWords);
  apiKey = createApiKey("test");

  // Start the server as a child process on a dedicated test port
  serverProcess = Bun.spawn(["bun", "run", "src/index.ts"], {
    env: { ...process.env, PORT: "3001" },
    stdout: "ignore",
    stderr: "ignore",
  });

  // Wait for the server to be ready
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://localhost:3001/health");
      if (res.ok) break;
    } catch {
      await Bun.sleep(100);
    }
  }
});

afterAll(() => {
  serverProcess?.kill();
});

const BASE_URL = "http://localhost:3001";

// Helper
function authedFetch(path: string) {
  return fetch(`${BASE_URL}${path}`, {
    headers: { "x-api-key": apiKey },
  });
}

describe("GET /health", () => {
  test("returns 200 with status ok (no auth required)", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("GET /api/word", () => {
  test("requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/word`);
    expect(res.status).toBe(401);
  });

  test("returns a single word with category", async () => {
    const res = await authedFetch("/api/word");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.word).toBe("string");
    expect(typeof body.category).toBe("string");
    expect(body.word.length).toBeGreaterThan(0);
  });
});

describe("GET /api/words", () => {
  test("requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/words`);
    expect(res.status).toBe(401);
  });

  test("returns default 10 words", async () => {
    const res = await authedFetch("/api/words");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(10);
    expect(Array.isArray(body.words)).toBe(true);
    expect(body.words.length).toBe(10);
  });

  test("respects count query parameter", async () => {
    const res = await authedFetch("/api/words?count=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(5);
    expect(body.words.length).toBe(5);
  });

  test("caps count at 100", async () => {
    const res = await authedFetch("/api/words?count=200");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.words.length).toBeLessThanOrEqual(100);
  });

  test("each word has word and category fields", async () => {
    const res = await authedFetch("/api/words?count=3");
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const item of body.words) {
      expect(typeof item.word).toBe("string");
      expect(typeof item.category).toBe("string");
    }
  });
});

describe("GET /api/words/category/:name", () => {
  test("requires authentication", async () => {
    const res = await fetch(`${BASE_URL}/api/words/category/Animaux`);
    expect(res.status).toBe(401);
  });

  test("returns words from a valid category", async () => {
    const res = await authedFetch("/api/words/category/Animaux");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe("Animaux");
    expect(Array.isArray(body.words)).toBe(true);
    expect(body.words.length).toBeGreaterThan(0);
  });

  test("is case-insensitive for category lookup", async () => {
    const res = await authedFetch("/api/words/category/animaux");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.words.length).toBeGreaterThan(0);
  });

  test("returns 404 for unknown category with available_categories list", async () => {
    const res = await authedFetch("/api/words/category/inexistant");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("inexistant");
    expect(Array.isArray(body.available_categories)).toBe(true);
    expect(body.available_categories.length).toBeGreaterThan(0);
  });

  test("respects count parameter", async () => {
    const res = await authedFetch("/api/words/category/Animaux?count=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(5);
    expect(body.words.length).toBe(5);
  });
});
