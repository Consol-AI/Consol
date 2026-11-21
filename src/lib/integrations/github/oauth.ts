import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GITHUB_OAUTH_SCOPES = ["repo", "read:user"].join(" ");

export type GithubOAuthAppConfig = {
  clientId: string;
  clientSecret: string;
};

export type GithubTokenResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
};

export type GithubUser = {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
};

export function githubOAuthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID?.trim() &&
      process.env.GITHUB_CLIENT_SECRET?.trim(),
  );
}

export function getGithubOAuthAppConfig(): GithubOAuthAppConfig {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}

function stateSecret(): string {
  return (
    process.env.CONNECTOR_TOKEN_SECRET?.trim() ||
    process.env.GITHUB_CLIENT_SECRET?.trim() ||
    "consol-dev-oauth-state"
  );
}

export type OauthStatePayload = {
  orgId: string;
  userSub: string;
  nonce: string;
  exp: number;
  returnTo?: string;
};

export function createOauthState(input: {
  orgId: string;
  userSub: string;
  returnTo?: string;
}): string {
  const payload: OauthStatePayload = {
    orgId: input.orgId,
    userSub: input.userSub,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
    returnTo: input.returnTo,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function parseOauthState(state: string): OauthStatePayload {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature");
  }
  const payload = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as OauthStatePayload;
  if (!payload.orgId || !payload.userSub || !payload.exp) {
    throw new Error("Malformed OAuth state");
  }
  if (Date.now() > payload.exp) {
    throw new Error("OAuth state expired");
  }
  return payload;
}

export function buildGithubAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string;
}): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.scopes ?? GITHUB_OAUTH_SCOPES);
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeGithubCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<GithubTokenResponse> {
  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub token exchange failed (${response.status})`);
  }
  const body = (await response.json()) as GithubTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (body.error || !body.access_token) {
    throw new Error(
      body.error_description || body.error || "GitHub token exchange failed",
    );
  }
  return body;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub user lookup failed (${response.status})`);
  }
  return (await response.json()) as GithubUser;
}

export async function revokeGithubToken(input: {
  clientId: string;
  clientSecret: string;
  accessToken: string;
}): Promise<void> {
  const basic = Buffer.from(
    `${input.clientId}:${input.clientSecret}`,
  ).toString("base64");
  const response = await fetch(
    `https://api.github.com/applications/${input.clientId}/token`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Basic ${basic}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: input.accessToken }),
    },
  );
  if (!response.ok && response.status !== 404) {
    // Best-effort revoke; connection row is still deleted locally.
    console.warn(`GitHub token revoke returned ${response.status}`);
  }
}

export function defaultGithubRedirectUri(origin: string): string {
  const configured = process.env.GITHUB_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  return `${origin.replace(/\/$/, "")}/api/connectors/github/oauth/callback`;
}
