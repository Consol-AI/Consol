"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
      <SheetContent className="w-full gap-0 overflow-y-auto border-l border-[var(--console-line)] bg-[var(--console-surface)] sm:max-w-xl">
        {item ? (
          <>
            <SheetHeader className="border-b border-[var(--console-line)] px-4 py-4 text-left">
              <SheetTitle className="text-[18px] font-semibold tracking-tight text-[var(--console-ink)]">
                Work item
              </SheetTitle>
              <SheetDescription className="text-[13px] text-[var(--console-muted)]">
                Collaborate with teammates and Forge AI on this card.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3 p-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--console-muted)]">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--console-muted)]">
                  Brief
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-32 border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
                />
              </div>
              <Button
                type="button"
                onClick={save}
                disabled={pending}
                className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className="min-h-[24rem] border-t border-[var(--console-line)]">
              <AiPanel
                processId={processId}
                workItemId={item.id}
                initialMessages={messages}
                title="Item AI"
                embedded
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
