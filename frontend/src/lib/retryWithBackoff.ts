import { isAbortError } from "./leaderboardApi";

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 1000;

const delay = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

const attemptWithBackoff = async <T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  attempt: number,
  maxRetries: number,
  baseDelayMs: number,
): Promise<T> => {
  try {
    return await fetchFn(signal);
  } catch (error) {
    if (signal.aborted || isAbortError(error)) {
      throw error;
    }

    if (attempt >= maxRetries) {
      throw error;
    }

    const delayMs = baseDelayMs * Math.pow(2, attempt);
    await delay(delayMs, signal);
    return attemptWithBackoff(
      fetchFn,
      signal,
      attempt + 1,
      maxRetries,
      baseDelayMs,
    );
  }
};

export const retryWithBackoff = async <T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  options?: {
    readonly maxRetries?: number;
    readonly baseDelayMs?: number;
  },
): Promise<T> => {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;

  return attemptWithBackoff(fetchFn, signal, 0, maxRetries, baseDelayMs);
};
