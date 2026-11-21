import { notFound } from "next/navigation";
import { WorkJobsList } from "@/components/work-jobs-list";
import { getViewer } from "@/lib/auth";
import {
  ensureWorkspace,
  listOrganizationWorkItems,
} from "@/lib/factory";

export default async function WorkPage() {
  const viewer = await getViewer();
  if (!viewer) notFound();

  const org = await ensureWorkspace(viewer);
  const items = await listOrganizationWorkItems(org.id);

  return <WorkJobsList items={items} />;
}
