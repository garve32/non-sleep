import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Avoid throwing at import time on the client – this file must be server-only
  if (typeof window === "undefined") {
    console.warn("DATABASE_URL is not set. API routes that require DB will fail.");
  }
}

export const sql = databaseUrl ? neon(databaseUrl) : (async () => { throw new Error("DATABASE_URL is not configured"); }) as any;


