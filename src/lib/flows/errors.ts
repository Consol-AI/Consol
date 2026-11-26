/**
 * Thrown when flow work tries to advance an item that was stopped or deleted
 * while it ran. The worker treats it as a clean cancellation, not a failure.
 */
export class FlowStoppedError extends Error {
  constructor(message = "This flow was stopped.") {
    super(message);
    this.name = "FlowStoppedError";
  }
}

export function isFlowStoppedError(error: unknown): error is FlowStoppedError {
  return (
    error instanceof FlowStoppedError ||
    (error instanceof Error && error.name === "FlowStoppedError")
  );
}

/** True for items that must not start or advance any more work. */
export function isStoppedStatus(status: string): boolean {
  return status === "stopped";
}
