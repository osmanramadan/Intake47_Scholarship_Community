import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getServerlessDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || process.env.VERCEL !== "1") return databaseUrl;

  try {
    const url = new URL(databaseUrl);
    if (url.hostname.includes("pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
      url.searchParams.set("pool_timeout", "20");
      url.searchParams.set("connect_timeout", "20");
      return url.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

const serverlessDatabaseUrl = getServerlessDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(serverlessDatabaseUrl
      ? { datasources: { db: { url: serverlessDatabaseUrl } } }
      : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
