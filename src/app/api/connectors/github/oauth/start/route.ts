import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { assertOrgAccess, ensureWorkspace } from "@/lib/factory";
import {
  buildGithubAuthorizeUrl,
  createOauthState,
  defaultGithubRedirectUri,
  getGithubOAuthAppConfig,
  githubOAuthConfigured,
} from "@/lib/integrations/github/oauth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const viewer = await requireViewer();
    if (!githubOAuthConfigured()) {
      return NextResponse.redirect(
        new URL(
          "/app/connectors/github?error=oauth_not_configured",
          url.origin,
        ),
      );
    }

    const org = await ensureWorkspace(viewer);
    const orgId = url.searchParams.get("org")?.trim() || org.id;
    if (!(await assertOrgAccess(orgId, viewer.sub))) {
      return NextResponse.redirect(
        new URL("/app/connectors/github?error=forbidden", url.origin),
      );
    }

    const returnTo =
      url.searchParams.get("returnTo")?.trim() || "/app/connectors/github";
    const { clientId } = getGithubOAuthAppConfig();
    const redirectUri = defaultGithubRedirectUri(url.origin);
    const state = createOauthState({
      orgId,
      userSub: viewer.sub,
      returnTo,
    });

    const authorizeUrl = buildGithubAuthorizeUrl({
      clientId,
      redirectUri,
      state,
    });
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "oauth_start_failed";
    return NextResponse.redirect(
      new URL(
        `/app/connectors/github?error=${encodeURIComponent(message)}`,
        url.origin,
      ),
    );
  }
}
