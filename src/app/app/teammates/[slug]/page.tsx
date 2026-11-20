import Link from "next/link";
import { notFound } from "next/navigation";
import { TeammateChat } from "@/components/teammate-chat";
import { getViewer } from "@/lib/auth";
import { BLANK_DEFAULTS, getPreset } from "@/lib/teammates/presets";
import { getTeammateBySlug } from "@/lib/teammates/registry";
import { refreshTeammateRuntimeStatus } from "@/lib/teammates/runtime";

export default async function TeammateChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  const { slug } = await params;
  const found = await getTeammateBySlug(slug);
  if (!found) notFound();

  const teammate = await refreshTeammateRuntimeStatus(found);
  const preset = teammate.presetId ? getPreset(teammate.presetId) : undefined;
  const starterPrompt =
    preset?.starterPrompt ?? BLANK_DEFAULTS.starterPrompt;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TeammateChat teammate={teammate} starterPrompt={starterPrompt} />
      <p className="sr-only">
        Agent path {teammate.agentPath}.{" "}
        <Link href="/app/teammates">Back to roster</Link>
      </p>
    </div>
  );
}
