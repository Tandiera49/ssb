export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
};

export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

export function getDB(locals: App.Locals): D1Database {
  const db = locals.runtime?.env?.DB as D1Database | undefined;

  if (!db) {
    throw new Error('Binding D1 "DB" tidak tersedia.');
  }

  return db;
}
