# Eventora Deployment Guide

## Production & Local Docker Deployment

### 1. Docker Compose (Recommended for Full Stack)
The repository includes a ready-to-run `docker-compose.yml` deploying:
- `eventora-postgres`: PostgreSQL 16 Alpine
- `eventora-redis`: Redis 7 Alpine
- `eventora-api`: Express Node.js REST API
- `eventora-worker`: BullMQ Background Worker
- `eventora-web`: Vite React Frontend served via Nginx

```bash
# 1. Clone repository
git clone https://github.com/your-org/eventora.git
cd eventora

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Build and launch all services
docker compose up -d --build

# 4. Run Prisma database migrations and seed data
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

### 2. Standalone Development (Zero External Dependencies)
Eventora includes an embedded ACID database and in-process reconciliation engine that works without installing local PostgreSQL or Redis:

```bash
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the full web app and API.

### 3. Production Cloud Hosting (Vercel / Render / Railway)
- **Database**: Provision managed PostgreSQL on Neon, Supabase, or AWS RDS.
- **Cache & Queue**: Provision managed Redis on Upstash or AWS ElastiCache.
- **API & Worker**: Deploy on Render or Railway with build command `npm run build` and start command `node dist-server/server.js`.
- **Frontend**: Deploy on Vercel or Cloudflare Pages with build command `npm run build` and output directory `dist`.
