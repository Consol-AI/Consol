/**
 * A coding agent takes a work item prompt + repo and (eventually) opens a PR.
 * Providers are interchangeable: the Build stage picks one by key
 * (stage config `agent`, default "cursor").
 */

export type CodingAgentRepo = {
  owner: string;
  repo: string;
  baseBranch: string;
};

export type CodingAgentRunState = {
  /** Provider status string (e.g. CREATING, RUNNING, FINISHED, ERROR). */
  status: string;
  prUrl: string | null;
  branch: string | null;
  text: string | null;
};

export type CodingAgentLaunch = CodingAgentRunState & {
  externalAgentId: string;
  externalRunId: string;
  agentUrl: string;
  dryRun: boolean;
};

export interface CodingAgentProvider {
  key: string;
  name: string;
  launch(input: {
    organizationId: string;
    workItemId: string;
    prompt: string;
    title: string;
    repo: CodingAgentRepo;
  }): Promise<CodingAgentLaunch>;
  poll(input: {
    organizationId: string;
    externalAgentId: string;
    externalRunId: string;
  }): Promise<CodingAgentRunState>;
  isTerminal(status: string): boolean;
  isSuccessful(status: string): boolean;
}
