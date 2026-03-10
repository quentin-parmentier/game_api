# game_api

A Bun-based REST API serving French words by category, with API key authentication and SQLite storage.

## Tech stack

- **Runtime**: [Bun](https://bun.sh) ≥ 1.0
- **Database**: SQLite via `bun:sqlite` (zero external dependencies)
- **Language**: TypeScript

## Project structure

```
├── src/
│   ├── index.ts          # HTTP server & routing
│   ├── db.ts             # SQLite schema + query helpers
│   └── middleware/
│       └── auth.ts       # API key authentication
├── data/
│   └── french-words.ts   # 10 categories × 100 French words
├── scripts/
│   ├── seed.ts           # Populate the database from data/french-words.ts
│   └── generate-key.ts   # Create a new API key
└── tests/
    └── api.test.ts       # Endpoint tests (bun:test)
```

## Getting started

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Install dependencies

```bash
bun install
```

### 3. Seed the database

```bash
bun run seed
# ✅ Seeded 10 categories and 1000 words.
```

### 4. Generate an API key

```bash
bun run generate-key my-app
# ✅ API key created for "my-app":
# <64-char hex key>
```

### 5. Start the server

```bash
# Production
bun run start

# Development (hot reload)
bun run dev
```

The server listens on `http://localhost:3000` by default.

## Environment variables

| Variable       | Default     | Description                                           |
|----------------|-------------|-------------------------------------------------------|
| `PORT`         | `3000`      | Port the server listens on                           |
| `DB_PATH`      | `game.db`   | Path to the SQLite database file                     |
| `ADMIN_SECRET` | *(unset)*   | Secret required to call `POST /api/keys`. Key creation is disabled when unset. |

## API reference

All endpoints under `/api/*` (except `POST /api/keys`) require authentication via one of:

- `Authorization: Bearer <key>` header
- `x-api-key: <key>` header

### `GET /health`

Liveness check. No authentication required.

**Response**
```json
{ "status": "ok" }
```

---

### `POST /api/keys`

Create a new API key. Requires the `x-admin-secret` header matching the `ADMIN_SECRET` env var.

**Request headers**
```
x-admin-secret: <ADMIN_SECRET value>
Content-Type: application/json
```

**Request body**
```json
{ "name": "my-app" }
```

**Response** `201`
```json
{ "key": "a3f2...", "name": "my-app" }
```

---

### `GET /api/word`

Returns a single random French word with its category.

**Response**
```json
{ "word": "guitare", "category": "Musique et arts" }
```

---

### `GET /api/words?count=10`

Returns multiple random French words.

| Parameter | Default | Max  | Description          |
|-----------|---------|------|----------------------|
| `count`   | `10`    | `100`| Number of words      |

**Response**
```json
{
  "count": 10,
  "words": [
    { "word": "forêt", "category": "Nature et environnement" },
    ...
  ]
}
```

---

### `GET /api/words/category/:name?count=10`

Returns random words from a specific category. Category lookup is case-insensitive.

**Response** `200`
```json
{
  "category": "Animaux",
  "count": 10,
  "words": [
    { "word": "dauphin", "category": "Animaux" },
    ...
  ]
}
```

**Response** `404` (unknown category)
```json
{
  "error": "Category \"xyz\" not found.",
  "available_categories": ["Animaux", "Cuisine et gastronomie", ...]
}
```

## Available categories

| Category                     | Words |
|------------------------------|-------|
| Animaux                      | 100   |
| Cuisine et gastronomie       | 100   |
| Sports et loisirs            | 100   |
| Vêtements et mode            | 100   |
| Nature et environnement      | 100   |
| Musique et arts              | 100   |
| Corps humain et santé        | 100   |
| Métiers et professions       | 100   |
| Technologie et informatique  | 100   |
| Voyage et géographie         | 100   |

## Running tests

```bash
bun test
```

The test suite starts the server automatically using the test database and covers all five endpoints.

## Deployment

### Railway

1. Create a new project from this repo on [Railway](https://railway.app).
2. Set the environment variables `ADMIN_SECRET` (and optionally `PORT`, `DB_PATH`) in Railway's settings.
3. Railway auto-detects Bun and runs `bun run start`.
4. After first deploy, open a Railway shell and run `bun run seed` to populate the database.
5. Generate your first API key: `bun run generate-key production`.

### Render

1. Create a **Web Service** on [Render](https://render.com) pointing to this repo.
2. Set **Build command** to `bun install` and **Start command** to `bun run src/index.ts`.
3. Add environment variables in Render's dashboard.
4. Use the Render shell (or a one-off job) to run `bun run seed` and `bun run generate-key`.

> **Tip**: Set `DB_PATH=/data/game.db` and mount a persistent disk at `/data` so the database survives redeploys.

### Keep-alive (GitHub Actions)

Render automatically puts free-tier services to sleep after **15 minutes of inactivity** (subsequent requests then take ~30 s to wake up). To prevent this, a GitHub Actions workflow pings the `/health` endpoint every 10 minutes.

The workflow is already present in `.github/workflows/keep-alive.yml` and activates as soon as the `RENDER_URL` secret is defined.

**Setup:**

1. Go to **Settings → Secrets and variables → Actions** in your GitHub repository.
2. Click **New repository secret**.
3. Name: `RENDER_URL` — Value: the full URL of your Render service (e.g. `https://game-api-xxxx.onrender.com`).

Once the secret is saved, the workflow will run every 10 minutes and keep the service awake. If `RENDER_URL` is not set, the workflow skips gracefully with an explanatory message instead of failing.
