/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
  }
}
