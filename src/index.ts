import { authenticate } from "./middleware/auth.ts";
import {
  getRandomWord,
  getRandomWords,
  getWordsByCategory,
  listCategories,
  createApiKey,
} from "./db.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function parseCount(url: URL, defaultCount = 10): number {
  const raw = url.searchParams.get("count");
  if (!raw) return defaultCount;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1) return defaultCount;
  if (n > 100) return 100;
  return n;
}

const server = Bun.serve({
  port: process.env.PORT ?? 3000,

  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (path === "/health") {
      return json({ status: "ok" });
    }

    // POST /api/keys – create a new API key (protected by ADMIN_SECRET env var)
    if (req.method === "POST" && path === "/api/keys") {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        return json({ error: "Key creation is disabled (ADMIN_SECRET not set)." }, 403);
      }
      const provided = req.headers.get("x-admin-secret");
      if (provided !== adminSecret) {
        return json({ error: "Invalid admin secret." }, 403);
      }
      return req.json().then((body: { name?: string }) => {
        const name = body?.name ?? "unnamed";
        const key = createApiKey(name);
        return json({ key, name }, 201);
      }).catch(() => json({ error: "Invalid JSON body." }, 400));
    }

    // All /api/* routes require authentication
    const auth = authenticate(req);
    if (!auth.valid) {
      return json({ error: auth.error }, 401);
    }

    // GET /api/word
    if (req.method === "GET" && path === "/api/word") {
      const result = getRandomWord();
      if (!result) return json({ error: "No words found. Run the seed script first." }, 404);
      return json(result);
    }

    // GET /api/words
    if (req.method === "GET" && path === "/api/words") {
      const count = parseCount(url);
      const results = getRandomWords(count);
      return json({ count: results.length, words: results });
    }

    // GET /api/words/category/:category
    const categoryMatch = path.match(/^\/api\/words\/category\/(.+)$/);
    if (req.method === "GET" && categoryMatch) {
      const category = decodeURIComponent(categoryMatch[1]);
      const count = parseCount(url);
      const results = getWordsByCategory(category, count);
      if (results === null) {
        const categories = listCategories();
        return json({ error: `Category "${category}" not found.`, available_categories: categories }, 404);
      }
      return json({ category, count: results.length, words: results });
    }

    return json({ error: "Not found." }, 404);
  },
});

console.log(`🎮 Game API running on http://localhost:${server.port}`);
