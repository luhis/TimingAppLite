import { retryWithBackoff } from "./retryWithBackoff";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("retryWithBackoff", () => {
  test("returns result on first successful attempt", async () => {
    const fetchFn = jest.fn().mockResolvedValue("ok");

    const result = await retryWithBackoff(fetchFn, new AbortController().signal);

    expect(result).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure and eventually succeeds", async () => {
    const controller = new AbortController();
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");

    const promise = retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 3,
      baseDelayMs: 100,
    });

    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);

    expect(await promise).toBe("ok");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  test("throws after exhausting all retries", async () => {
    const controller = new AbortController();
    const fetchFn = jest.fn().mockRejectedValue(new Error("always fails"));

    const promise = retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 2,
      baseDelayMs: 10,
    }).catch((error: unknown) => error as Error);

    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(20);
    await jest.advanceTimersByTimeAsync(40);

    const error = await promise;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("always fails");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  test("does not retry when signal is aborted before fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException(
      "The operation was aborted",
      "AbortError",
    );
    const fetchFn = jest.fn().mockRejectedValue(abortError);

    const caughtError = (await retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 3,
    }).catch((error: unknown) => error)) as DOMException;

    expect(caughtError).toBeInstanceOf(DOMException);
    expect(caughtError.name).toBe("AbortError");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("throws abort error immediately without retrying", async () => {
    const controller = new AbortController();
    const abortError = new DOMException(
      "The operation was aborted",
      "AbortError",
    );
    const fetchFn = jest.fn().mockRejectedValue(abortError);

    const caughtError = (await retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 3,
    }).catch((error: unknown) => error)) as DOMException;

    expect(caughtError).toBeInstanceOf(DOMException);
    expect(caughtError.name).toBe("AbortError");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("aborts pending delay when signal is aborted", async () => {
    const controller = new AbortController();
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    const promise = retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 3,
      baseDelayMs: 1000,
    }).catch((error: unknown) => error as DOMException);

    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await jest.advanceTimersByTimeAsync(1000);

    const error = (await promise) as DOMException;
    expect(error).toBeInstanceOf(DOMException);
    expect(error.name).toBe("AbortError");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("uses exponential backoff delays", async () => {
    const controller = new AbortController();
    const recordedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    jest.spyOn(globalThis, "setTimeout").mockImplementation(
      ((fn: (...args: readonly unknown[]) => void, ms: number) => {
        // eslint-disable-next-line functional/immutable-data
        recordedDelays[recordedDelays.length] = ms;
        return originalSetTimeout(fn, ms);
      }) as typeof setTimeout,
    );

    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"))
      .mockResolvedValue("ok");

    const promise = retryWithBackoff(fetchFn, controller.signal, {
      maxRetries: 3,
      baseDelayMs: 100,
    });

    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(200);
    await jest.advanceTimersByTimeAsync(400);

    await promise;

    expect([...recordedDelays]).toEqual([100, 200, 400]);
  });
});
