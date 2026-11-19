"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWorkItemAction } from "@/app/actions";
import { AiPanel } from "@/components/ai-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Message, WorkItem } from "@/lib/factory";

type Props = {
  productId: string;
  processId: string;
  item: WorkItem | null;
  messages: Message[];
};

export function WorkItemSheet({
  productId,
  processId,
  item,
  messages,
}: Props) {
  const router = useRouter();
  const open = Boolean(item);
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(item?.title ?? "");
    setBody(item?.body ?? "");
  }, [item]);

  function close() {
    router.push(`/app/products/${productId}/processes/${processId}`);
  }

  function save() {
    if (!item) return;
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("title", title);
    formData.set("body", body);
    startTransition(async () => {
      await updateWorkItemAction(formData);
      router.refresh();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {item ? (
          <>
            <SheetHeader className="border-b border-[var(--line)]">
              <SheetTitle className="font-[family-name:var(--font-display)] text-2xl">
                Work item
              </SheetTitle>
              <SheetDescription>
                Collaborate with teammates and Forge AI on this card.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 p-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-32"
              />
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className="min-h-[24rem] border-t border-[var(--line)]">
              <AiPanel
                processId={processId}
                workItemId={item.id}
                initialMessages={messages}
                title="Item AI thread"
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
