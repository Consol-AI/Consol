import { promises as fs } from "node:fs";
import path from "node:path";
import { createId } from "@/lib/id";
import type { CreateTeammateInput, TeammateRecord } from "./types";

const BASE_PORT = 44001;
const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_PATH = path.join(DATA_DIR, "teammates.json");

async function ensureRegistryFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(REGISTRY_PATH);
  } catch {
    await fs.writeFile(REGISTRY_PATH, "[]\n", "utf8");
  }
}

export async function listTeammates(): Promise<TeammateRecord[]> {
  await ensureRegistryFile();
  const raw = await fs.readFile(REGISTRY_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as TeammateRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getTeammateBySlug(
  slug: string,
): Promise<TeammateRecord | null> {
  const all = await listTeammates();
  return all.find((t) => t.slug === slug) ?? null;
}

async function writeAll(teammates: TeammateRecord[]): Promise<void> {
  await ensureRegistryFile();
  await fs.writeFile(
    REGISTRY_PATH,
    `${JSON.stringify(teammates, null, 2)}\n`,
    "utf8",
  );
}

function nextPort(existing: TeammateRecord[]): number {
  if (existing.length === 0) return BASE_PORT;
  return Math.max(...existing.map((t) => t.port)) + 1;
}

export async function createTeammateRecord(
  input: CreateTeammateInput,
): Promise<TeammateRecord> {
  const existing = await listTeammates();
  if (existing.some((t) => t.slug === input.slug)) {
    throw new Error(`Slug already in use: ${input.slug}`);
  }

  const record: TeammateRecord = {
    id: createId("tm"),
    slug: input.slug,
    name: input.name,
    presetId: input.presetId,
    role: input.role,
    brief: input.brief,
    model: {
      id: input.modelId,
      params: input.modelParams,
    },
    tools: input.tools,
    status: "scaffolded",
    port: nextPort(existing),
    agentPath: `agents/${input.slug}`,
    createdAt: new Date().toISOString(),
  };

  await writeAll([...existing, record]);
  return record;
}

export async function updateTeammateStatus(
  slug: string,
  status: TeammateRecord["status"],
): Promise<TeammateRecord | null> {
  const all = await listTeammates();
  const idx = all.findIndex((t) => t.slug === slug);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], status };
  await writeAll(all);
  return all[idx];
}
