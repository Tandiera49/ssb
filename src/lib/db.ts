export function getDB(locals: App.Locals): D1Database {
  const db = locals.runtime?.env?.DB;
  if (!db) throw new Error('Binding D1 "DB" tidak tersedia.');
  return db;
}

export function getUploads(locals: App.Locals): R2Bucket {
  const bucket = locals.runtime?.env?.UPLOADS;
  if (!bucket) throw new Error('Binding R2 "UPLOADS" tidak tersedia.');
  return bucket;
}

export function getEnv(locals: App.Locals): Env {
  return locals.runtime.env;
}
