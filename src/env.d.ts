/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  SESSION_SECRET?: string;
  PUBLIC_SITE_URL?: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
      cf?: Record<string, unknown>;
      caches?: CacheStorage;
    };
    user?: {
      id: string;
      username: string;
      name: string;
      role: string;
      active: boolean;
      playerId?: string;
    };
  }
}
