# ArcadeStrike — 1v1 Online Fighting Game

Real-time competitive 1v1 fighting game.

## Play
🎮 **[Play Now →](https://arcadestrike.vercel.app)**

## Controls
| Key | Action |
|-----|--------|
| ← → | Move left/right |
| ↑ | Jump |
| Z | Attack |
| X | Block |

## How to Play
1. Open the game link
2. Click **FIND MATCH**
3. Wait for an opponent
4. Fight! Win 2 rounds to win the match

## Tech Stack
- **Client:** Phaser 3 + TypeScript + Vite → Vercel
- **Server:** Colyseus + Fastify + Node.js → Render
- **Database:** PostgreSQL + Prisma
- **Real-time:** WebSocket (Colyseus rooms)

## Local Development
```bash
# Server
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev

# Client (new terminal)
cd client
npm install
npm run dev
```
