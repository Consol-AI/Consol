/** Client-safe href helpers for work items (no DB imports). */

export function workItemHref(item: { id: string }): string {
  return `/app/work/${item.id}`;
}
