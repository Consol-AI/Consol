import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ModelSettingsCard } from "@/components/model-settings-card";
import { getViewer } from "@/lib/auth";
import {
  getActiveModelRef,
  getModelFailoverRefs,
  listConfiguredModelOptions,
  readModelPreference,
} from "@/lib/models";

export default async function ModelsConnectorPage() {
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

  const options = listConfiguredModelOptions();
  const preference = await readModelPreference();
  const activeRef = getActiveModelRef();
  const failoverRefs = getModelFailoverRefs();

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
          Models
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
          Switch providers when Claude hits hourly limits. Forge and agent
          stages use the primary model first, then fail over to the next
          configured provider on rate-limit or capacity errors.
        </p>
      </div>

      <ModelSettingsCard
        options={options}
        activeRef={activeRef}
        failoverRefs={failoverRefs}
        preferenceRef={preference?.modelRef ?? null}
      />
    </div>
  );
}
