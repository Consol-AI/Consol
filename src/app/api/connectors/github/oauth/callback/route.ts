import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { assertOrgAccess } from "@/lib/factory";
import { upsertOrganizationConnection } from "@/lib/integrations/connections";
import {
  defaultGithubRedirectUri,
  exchangeGithubCode,
  fetchGithubUser,
  getGithubOAuthAppConfig,
  parseOauthState,
} from "@/lib/integrations/github/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    const desc =
      url.searchParams.get("error_description") || errorParam || "denied";
    return NextResponse.redirect(
      new URL(
        `/app/connectors/github?error=${encodeURIComponent(desc)}`,
        url.origin,
      ),
    );
  }

  try {
    const viewer = await requireViewer();
    const code = url.searchParams.get("code")?.trim() ?? "";
    const state = url.searchParams.get("state")?.trim() ?? "";
    if (!code || !state) {
      throw new Error("Missing OAuth code or state");
    }

    const payload = parseOauthState(state);
    if (payload.userSub !== viewer.sub) {
      throw new Error("OAuth state user mismatch");
    }
    if (!(await assertOrgAccess(payload.orgId, viewer.sub))) {
      throw new Error("Forbidden");
    }

    const { clientId, clientSecret } = getGithubOAuthAppConfig();
    const redirectUri = defaultGithubRedirectUri(url.origin);
    const token = await exchangeGithubCode({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    const user = await fetchGithubUser(token.access_token);

    await upsertOrganizationConnection({
      organizationId: payload.orgId,
      provider: "github",
      accountId: String(user.id),
      accountLogin: user.login,
      accountAvatarUrl: user.avatar_url,
      scope: token.scope ?? "",
      accessToken: token.access_token,
      tokenType: token.token_type ?? "bearer",
      createdBy: viewer.sub,
    });

    const returnTo = payload.returnTo?.startsWith("/app/")
      ? payload.returnTo
      : "/app/connectors/github";
    const dest = new URL(returnTo, url.origin);
    dest.searchParams.set("connected", "1");
    return NextResponse.redirect(dest);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(
        `/app/connectors/github?error=${encodeURIComponent(message)}`,
        url.origin,
      ),
    );
  }
}
