FROM oven/bun:1

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN bun install

# Copy application sources
COPY src/ ./src/
COPY data/ ./data/
COPY scripts/ ./scripts/
COPY start.sh ./

RUN chmod +x start.sh

EXPOSE 3000

# start.sh seeds the DB then starts the server.
# On Render free tier, set DB_PATH=/tmp/game.db (writable).
# On Render paid tier with a Persistent Disk mounted at /data, use DB_PATH=/data/game.db.
CMD ["./start.sh"]
