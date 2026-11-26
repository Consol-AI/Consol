/**
 * Agent stages append their output to the work item body as
 * `---\n### <Stage> (<Agent>)\n<markdown>` (see runAgentStage). Split it back
 * apart so the page can show the human brief and each agent draft separately.
 */
export type AgentOutput = { heading: string; content: string };

const SECTION = /(?:^|\n)---\n### ([^\n]+)\n/g;
// The flow-inputs block written at creation (formatFlowInputsBlock).
const INPUTS_BLOCK = /(?:^|\n)### Inputs\n(?:- [^\n]*(?:\n|$))*/;

export function splitBriefSections(raw: string): {
  brief: string;
  outputs: AgentOutput[];
} {
  const body = raw.replace(/\r\n?/g, "\n");
  const matches = [...body.matchAll(SECTION)];
  const stripInputs = (text: string) => text.replace(INPUTS_BLOCK, "\n").trim();
  if (matches.length === 0) return { brief: stripInputs(body), outputs: [] };
  const brief = stripInputs(body.slice(0, matches[0].index));
  const outputs = matches.map((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? body.length;
    return { heading: match[1].trim(), content: body.slice(start, end).trim() };
  });
  return { brief, outputs };
}
