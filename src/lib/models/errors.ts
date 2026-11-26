/** Errors that mean "try another provider" rather than "the prompt is bad". */

function statusFromError(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const record = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  for (const value of [record.status, record.statusCode, record.response?.status]) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

/**
 * Rate limits, overloaded providers, and transient capacity failures.
 * Not auth failures, bad requests, or content refusals.
 */
export function isRetryableProviderError(error: unknown): boolean {
  const status = statusFromError(error);
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 529) {
    return true;
  }

  const message = messageFromError(error).toLowerCase();
  if (!message) return false;

  return (
    /rate[\s_-]?limit/.test(message) ||
    /too many requests/.test(message) ||
    /overloaded/.test(message) ||
    /capacity/.test(message) ||
    /resource[\s_-]?exhausted/.test(message) ||
    /quota[\s_-]?(exceeded|exhausted)/.test(message) ||
    /hourly\s+(limit|usage)/.test(message) ||
    /temporarily unavailable/.test(message) ||
    /service unavailable/.test(message) ||
    /\b529\b/.test(message) ||
    /\b429\b/.test(message)
  );
}
