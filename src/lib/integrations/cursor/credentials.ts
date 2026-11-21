import {
  getOrganizationAccessToken,
  upsertOrganizationConnection,
  deleteOrganizationConnection,
  getPublicOrganizationConnection,
  type PublicOrganizationConnection,
} from "@/lib/integrations/connections";
import { cursorEnvApiKey } from "@/lib/integrations/cursor/client";

export const CURSOR_PROVIDER = "cursor";

export async function getCursorApiKey(
  organizationId: string,
): Promise<string | null> {
  const fromDb = await getOrganizationAccessToken(
    organizationId,
    CURSOR_PROVIDER,
  );
  if (fromDb?.trim()) return fromDb.trim();
  return cursorEnvApiKey();
}

export async function saveCursorApiKey(input: {
  organizationId: string;
  apiKey: string;
  createdBy: string;
  accountLogin?: string;
}): Promise<PublicOrganizationConnection> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) throw new Error("Cursor API key is required");
  return upsertOrganizationConnection({
    organizationId: input.organizationId,
    provider: CURSOR_PROVIDER,
    accountId: "cursor-api-key",
    accountLogin: input.accountLogin?.trim() || "API key",
    scope: "cloud-agents",
    accessToken: apiKey,
    tokenType: "bearer",
    createdBy: input.createdBy,
  });
}

export async function clearCursorApiKey(
  organizationId: string,
): Promise<void> {
  await deleteOrganizationConnection(organizationId, CURSOR_PROVIDER);
}

export async function getPublicCursorConnection(
  organizationId: string,
): Promise<PublicOrganizationConnection | null> {
  return getPublicOrganizationConnection(organizationId, CURSOR_PROVIDER);
}

export async function cursorConnectionConfigured(
  organizationId: string,
): Promise<boolean> {
  const key = await getCursorApiKey(organizationId);
  return Boolean(key);
}
