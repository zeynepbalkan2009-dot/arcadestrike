import { PrismaClient } from '@prisma/client';
let _client: PrismaClient | null = null;
export function getPrisma(): PrismaClient {
  if (!_client) {
    if (!process.env.DATABASE_URL) throw new Error('[Prisma] DATABASE_URL not set.');
    _client = new PrismaClient();
  }
  return _client;
}
export async function disconnectPrisma() { if (_client) { await _client.$disconnect(); _client = null; } }
