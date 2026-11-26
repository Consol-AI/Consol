import { HomeChat } from "@/components/home-chat";
import { getViewer } from "@/lib/auth";
import {
  buildWorkspaceBrief,
  ensureWorkspace,
  listFlows,
  listMessages,
} from "@/lib/factory";
import { knownRepos, listProposals } from "@/lib/proposals";
import { toProposalFlowOption } from "@/lib/proposals/types";

export default async function AppHomePage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="m-6 rounded-xl bg-[var(--console-surface)] p-8 text-center shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:m-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Sign in required
        </h1>
        <p className="mt-2 text-[13px] text-[var(--console-muted)]">
          Consol uses your Cursor identity when published as a private or team
          app. Locally, set{" "}
          <code className="rounded bg-[var(--console-panel)] px-1.5 py-0.5 text-[12px]">
            CONSOL_DEMO_AUTH=1
          </code>{" "}
          or publish the app to continue.
        </p>
      </div>
    );
  }

  const org = await ensureWorkspace(viewer);
  const [brief, messages, proposals, repos] = await Promise.all([
    buildWorkspaceBrief(org.id),
    listMessages({ organizationId: org.id }),
    listProposals(org.id),
    knownRepos(),
  ]);

  return (
    <HomeChat
      organizationId={org.id}
      orgName={org.name}
      initialMessages={messages}
      initialProposals={proposals}
      flows={listFlows().map(toProposalFlowOption)}
      knownRepos={repos}
      attention={brief.attention}
      needsYou={brief.needsYou}
      agentsWorking={brief.agentsWorking}
    />
  );
}
