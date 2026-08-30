# ArcadeStrike — 1v1 Online Fighting Game

Real-time competitive fighting game built with Phaser 3 + Colyseus.

## Controls
| Key | Action |
|-----|--------|
| ← → | Move |
| ↑ | Jump |
| Z | Attack |
| X | Block |

## Stack
- **Client:** Phaser 3 + TypeScript + Vite
- **Server:** Colyseus + Fastify + Node.js
- **Database:** PostgreSQL + Prisma
- **Deploy:** Render (server) + Vercel (client)

## Local Development

```bash
# Terminal 1 — Server
cd server
cp .env.example .env   # edit DATABASE_URL
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev

# Terminal 2 — Client
cd client
npm install
npm run dev
```
