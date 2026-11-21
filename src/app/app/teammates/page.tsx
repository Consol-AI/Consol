import { TeammateRoster } from "@/components/teammate-roster";
import { getViewer } from "@/lib/auth";
import { listTeammates } from "@/lib/teammates/registry";

export default async function TeammatesPage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="m-6 rounded-xl bg-[var(--console-surface)] p-8 text-center shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:m-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Sign in required
        </h1>
        <p className="mt-2 text-[13px] text-[var(--console-muted)]">
          Set{" "}
          <code className="rounded bg-[var(--console-panel)] px-1.5 py-0.5 text-[12px]">
            CONSOL_DEMO_AUTH=1
          </code>{" "}
          locally, or publish the app to continue.
        </p>
      </div>
    );
  }

  // Don't probe local agent runtimes during RSC — each probe can hang up to
  // the fetch timeout and blocks the whole navigation. Status refreshes on
  // the teammate chat page (and when starting a turn).
  const teammates = await listTeammates();

  return <TeammateRoster teammates={teammates} />;
}
