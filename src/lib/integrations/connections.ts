import { sql } from "@/lib/db";
import { createId } from "@/lib/id";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";

export type OrganizationConnection = {
  id: string;
  organization_id: string;
  provider: string;
  status: string;
  account_id: string;
  account_login: string;
  account_avatar_url: string;
  scope: string;
  access_token_enc: string;
  token_type: string;
  refresh_token_enc: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PublicOrganizationConnection = Omit<
  OrganizationConnection,
  "access_token_enc" | "refresh_token_enc"
>;

function toPublic(
  row: OrganizationConnection,
): PublicOrganizationConnection {
  const {
    access_token_enc: _a,
    refresh_token_enc: _r,
    ...rest
  } = row;
  return rest;
}

export async function getOrganizationConnection(
  organizationId: string,
  provider: string,
): Promise<OrganizationConnection | null> {
  return (
    (
      await sql<OrganizationConnection>(
        `select * from organization_connections
         where organization_id = $1 and provider = $2
         limit 1`,
        [organizationId, provider],
      )
    )[0] ?? null
  );
}

export async function getPublicOrganizationConnection(
  organizationId: string,
  provider: string,
): Promise<PublicOrganizationConnection | null> {
  const row = await getOrganizationConnection(organizationId, provider);
  return row ? toPublic(row) : null;
}

export async function listOrganizationConnections(
  organizationId: string,
): Promise<PublicOrganizationConnection[]> {
  const rows = await sql<OrganizationConnection>(
    `select * from organization_connections
     where organization_id = $1
     order by provider asc`,
    [organizationId],
  );
  return rows.map(toPublic);
}

export async function upsertOrganizationConnection(input: {
  organizationId: string;
  provider: string;
  accountId: string;
  accountLogin: string;
  accountAvatarUrl?: string;
  scope?: string;
  accessToken: string;
  tokenType?: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  createdBy: string;
}): Promise<PublicOrganizationConnection> {
  const accessEnc = encryptSecret(input.accessToken);
  const refreshEnc = input.refreshToken
    ? encryptSecret(input.refreshToken)
    : "";
  const existing = await getOrganizationConnection(
    input.organizationId,
    input.provider,
  );

  if (existing) {
    await sql(
      `update organization_connections set
         status = 'connected',
         account_id = $1,
         account_login = $2,
         account_avatar_url = $3,
         scope = $4,
         access_token_enc = $5,
         token_type = $6,
         refresh_token_enc = $7,
         expires_at = $8,
         updated_at = now()
       where id = $9`,
      [
        input.accountId,
        input.accountLogin,
        input.accountAvatarUrl ?? "",
        input.scope ?? "",
        accessEnc,
        input.tokenType ?? "bearer",
        refreshEnc,
        input.expiresAt?.toISOString() ?? null,
        existing.id,
      ],
    );
    return (await getPublicOrganizationConnection(
      input.organizationId,
      input.provider,
    ))!;
  }

  const id = createId("con");
  await sql(
    `insert into organization_connections (
       id, organization_id, provider, status,
       account_id, account_login, account_avatar_url, scope,
       access_token_enc, token_type, refresh_token_enc, expires_at, created_by
     ) values ($1,$2,$3,'connected',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id,
      input.organizationId,
      input.provider,
      input.accountId,
      input.accountLogin,
      input.accountAvatarUrl ?? "",
      input.scope ?? "",
      accessEnc,
      input.tokenType ?? "bearer",
      refreshEnc,
      input.expiresAt?.toISOString() ?? null,
      input.createdBy,
    ],
  );
  return (await getPublicOrganizationConnection(
    input.organizationId,
    input.provider,
  ))!;
}

export async function deleteOrganizationConnection(
  organizationId: string,
  provider: string,
): Promise<OrganizationConnection | null> {
  const existing = await getOrganizationConnection(organizationId, provider);
  if (!existing) return null;
  await sql(
    `delete from organization_connections
     where organization_id = $1 and provider = $2`,
    [organizationId, provider],
  );
  return existing;
}

export async function getOrganizationAccessToken(
  organizationId: string,
  provider: string,
): Promise<string | null> {
  const row = await getOrganizationConnection(organizationId, provider);
  if (!row || row.status !== "connected" || !row.access_token_enc) {
    return null;
  }
  try {
    return decryptSecret(row.access_token_enc);
  } catch {
    return null;
  }
}
