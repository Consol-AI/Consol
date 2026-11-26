import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-5 mb-2 text-[17px] font-semibold tracking-tight text-[var(--console-ink)] first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-5 mb-2 text-[15px] font-semibold tracking-tight text-[var(--console-ink)] first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-[14px] font-semibold text-[var(--console-ink)] first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 text-[13px] font-semibold text-[var(--console-ink)] first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children, className }) => (
    <ul
      className={cn(
        "my-2 space-y-1 pl-5",
        className?.includes("contains-task-list")
          ? "list-none pl-1"
          : "list-disc marker:text-[var(--console-faint)]",
      )}
    >
      {children}
    </ul>
  ),
  ol: ({ children, start }) => (
    <ol
      start={start}
      className="my-2 list-decimal space-y-1 pl-6 marker:text-[var(--console-faint)]"
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  input: ({ checked }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      readOnly
      className="mr-1.5 translate-y-[1px] accent-[var(--console-accent)]"
    />
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--console-accent)] underline decoration-[var(--console-accent)]/30 underline-offset-2 hover:decoration-[var(--console-accent)]"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--console-ink)]">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[var(--console-line)] pl-3 text-[var(--console-muted)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-[var(--console-line)]" />,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-zinc-950 px-3.5 py-3 text-[12px] leading-relaxed text-zinc-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="rounded bg-[var(--console-panel)] px-1 py-0.5 font-mono text-[0.9em] text-[var(--console-ink)]">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[12px]">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-[var(--console-line)] px-2 py-1.5 font-semibold text-[var(--console-ink)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-[var(--console-line)] px-2 py-1.5 align-top">
      {children}
    </td>
  ),
};

const FENCE = /^\s*(```|~~~)/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/;

/**
 * LLM output often starts a list straight under a line of text ("**Delete**"
 * then "7. ..."). CommonMark only lets a list interrupt a paragraph when it
 * is a bullet or starts at 1, so those items collapse into one paragraph.
 * Insert the missing blank line (outside code fences) so they stay lists.
 */
export function normalizeMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const prev = out[out.length - 1];
    if (
      !inFence &&
      LIST_ITEM.test(line) &&
      prev !== undefined &&
      prev.trim() !== "" &&
      !LIST_ITEM.test(prev) &&
      !/^\s/.test(prev) &&
      !/^\s*\|/.test(prev)
    ) {
      out.push("");
    }
    out.push(line);
  }
  return out.join("\n");
}

/** Renders agent / brief markdown (GFM) with console typography. */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 text-[13px] leading-relaxed break-words text-[var(--console-ink)]",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {normalizeMarkdown(children)}
      </ReactMarkdown>
    </div>
  );
}
