import { promises as fs } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const PREFERENCE_PATH = path.join(DATA_DIR, "model-preference.json");

export type ModelPreference = {
  /** Model ref "<provider>:<model>", e.g. "openai:gpt-4o-mini". */
  modelRef: string;
  updatedAt: string;
};

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Sync read for model resolution on the hot path (chat / workers). */
export function readModelPreferenceSync(): ModelPreference | null {
  try {
    const raw = readFileSync(PREFERENCE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ModelPreference;
    if (typeof parsed?.modelRef === "string" && parsed.modelRef.trim()) {
      return {
        modelRef: parsed.modelRef.trim(),
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : new Date(0).toISOString(),
      };
    }
  } catch {
    // Missing or invalid preference file — use env defaults.
  }
  return null;
}

export async function readModelPreference(): Promise<ModelPreference | null> {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(PREFERENCE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ModelPreference;
    if (typeof parsed?.modelRef === "string" && parsed.modelRef.trim()) {
      return {
        modelRef: parsed.modelRef.trim(),
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : new Date(0).toISOString(),
      };
    }
  } catch {
    // Missing file is fine.
  }
  return null;
}

export async function writeModelPreference(
  modelRef: string,
): Promise<ModelPreference> {
  const trimmed = modelRef.trim();
  if (!trimmed) throw new Error("modelRef required");
  await ensureDataDir();
  const next: ModelPreference = {
    modelRef: trimmed,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(
    PREFERENCE_PATH,
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return next;
}

export async function clearModelPreference(): Promise<void> {
  try {
    await fs.unlink(PREFERENCE_PATH);
  } catch {
    // Already gone.
  }
}
