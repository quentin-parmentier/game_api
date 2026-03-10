FROM oven/bun:1

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN bun install

# Copy application sources
COPY src/ ./src/
COPY data/ ./data/
COPY scripts/ ./scripts/

# Note: do NOT run the seed here.
# Run `bun run seed` manually once after the first deploy via the Render shell.
# On Render, set DB_PATH=/data/game.db and mount a Persistent Disk at /data
# so the database survives container restarts and redeploys.

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
