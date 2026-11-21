import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey(): Buffer | null {
  const raw =
    process.env.CONNECTOR_TOKEN_SECRET?.trim() ||
    process.env.GITHUB_CLIENT_SECRET?.trim() ||
    "";
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

/** Encrypt a connector secret for at-rest storage. */
export function encryptSecret(plaintext: string): string {
  const key = encryptionKey();
  if (!key) {
    // Dev fallback: reversible encoding when no secret is configured.
    return `plain.${Buffer.from(plaintext, "utf8").toString("base64url")}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  if (payload.startsWith("plain.")) {
    return Buffer.from(payload.slice("plain.".length), "base64url").toString(
      "utf8",
    );
  }
  const key = encryptionKey();
  if (!key) {
    throw new Error("CONNECTOR_TOKEN_SECRET (or GITHUB_CLIENT_SECRET) is required to decrypt tokens");
  }
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
