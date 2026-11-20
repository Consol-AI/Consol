import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const globalForDb = globalThis as typeof globalThis & {
  __consolPgPool?: pg.Pool;
  __consolPglite?: Promise<PGlite>;
};

/**
 * Railway public TCP proxies use a self-signed cert. When we relax SSL,
 * also strip sslmode from the URL — newer `pg` treats sslmode=require as
 * verify-full and ignores an explicit `ssl` option.
 */
function pgConnection(connectionString: string): {
  connectionString: string;
  ssl?: { rejectUnauthorized: false };
} {
  let relax = process.env.DATABASE_SSL === "0";
  try {
    const host = new URL(connectionString).hostname;
    if (host.endsWith(".rlwy.net") || host.endsWith(".railway.app")) {
      relax = true;
    }
  } catch {
    // ignore malformed URLs; pg will surface the real error
  }
  if (!relax) return { connectionString };

  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString, ssl: { rejectUnauthorized: false } };
  }
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    globalForDb.__consolPgPool ??= new pg.Pool({
      ...pgConnection(databaseUrl),
      max: 5,
    });
    return (await globalForDb.__consolPgPool.query(text, params)).rows as T[];
  }

  globalForDb.__consolPglite ??= startLocal().catch((error: unknown) => {
    globalForDb.__consolPglite = undefined;
    throw error;
  });
  return (await (await globalForDb.__consolPglite).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  // On Vercel, only /tmp is writable. Local/dev uses a durable .data folder.
  const dataDir = process.env.VERCEL
    ? path.join("/tmp", "consol-pglite")
    : path.join(process.cwd(), ".data", "consol");
  await mkdir(dataDir, { recursive: true });
  const db = new PGlite(dataDir);
  await db.exec(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const done = new Set(
    (
      await db.query<{ name: string }>("select name from schema_migrations")
    ).rows.map((row) => row.name),
  );
  const migrationsDir = path.join(process.cwd(), "migrations");
  const files = (await readdir(migrationsDir).catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await db.exec(await readFile(path.join(migrationsDir, file), "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
  }
  return db;
}
