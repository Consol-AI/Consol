/** Client-safe href helpers for work items (no DB imports). */

export function workItemHref(item: {
  id: string;
  process_id: string;
  product_id?: string | null;
}): string {
  if (item.product_id) {
    return `/app/products/${item.product_id}/processes/${item.process_id}?item=${item.id}`;
  }
  return `/app/work/${item.id}`;
}
