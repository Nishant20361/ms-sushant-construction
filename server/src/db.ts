import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Format DATABASE_URL with safe connection_limit if needed for Supabase pooler
function getSafeDatabaseUrl(): string | undefined {
  const url = config.databaseUrl;
  if (!url) return undefined;
  // If connection_limit is not specified and it is postgres/supabase, limit to 3-5 connections per container
  if (url.startsWith("postgres") && !url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connection_limit=3&pool_timeout=15`;
  }
  return url;
}

const safeUrl = getSafeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: safeUrl ? { db: { url: safeUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;


