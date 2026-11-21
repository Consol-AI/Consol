import { notFound } from "next/navigation";
import { StartWorkFlowWizard } from "@/components/start-work-flow-wizard";
import { getViewer } from "@/lib/auth";
import { listFlows } from "@/lib/flows";

export default async function StartWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) notFound();

  const { flow: flowParam } = await searchParams;
  const flows = listFlows();

  return (
    <StartWorkFlowWizard flows={flows} initialFlowKey={flowParam} />
  );
}
