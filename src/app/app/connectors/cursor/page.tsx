import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CursorApiKeyCard } from "@/components/cursor-api-key-card";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace } from "@/lib/factory";
import { cursorEnvApiKey } from "@/lib/integrations/cursor/client";
import { getPublicCursorConnection } from "@/lib/integrations/cursor/credentials";

export default async function CursorConnectorPage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="m-6 rounded-xl bg-[var(--console-surface)] p-8 text-center shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:m-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Sign in required
        </h1>
      </div>
    );
  }

  const org = await ensureWorkspace(viewer);
  const connection = await getPublicCursorConnection(org.id);
  const connected =
    connection?.status === "connected" && Boolean(connection.account_login);

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <Link
          href="/app/connectors"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
        >
          <ArrowLeft className="size-3" />
          Connectors
        </Link>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Cursor
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
          Connect a Cursor API key so the Build stage can launch Cloud Agents
          against your product&apos;s GitHub repository.
        </p>
      </div>

      <CursorApiKeyCard
        connected={connected}
        accountLogin={connection?.account_login}
        envFallbackConfigured={Boolean(cursorEnvApiKey())}
      />
    </div>
  );
}
