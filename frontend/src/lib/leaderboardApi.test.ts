import { getErrorMessage, isAbortError } from "./leaderboardApi";

describe("isAbortError", () => {
  test("returns true for DOMException with name AbortError", () => {
    const error = new DOMException("The operation was aborted", "AbortError");
    expect(isAbortError(error)).toBe(true);
  });

  test("returns false for DOMException with other name", () => {
    const error = new DOMException("Something went wrong", "NotAbortError");
    expect(isAbortError(error)).toBe(false);
  });

  test("returns false for regular Error", () => {
    expect(isAbortError(new Error("test"))).toBe(false);
  });

  test("returns false for null", () => {
    expect(isAbortError(null)).toBe(false);
  });

  test("returns false for string", () => {
    expect(isAbortError("AbortError")).toBe(false);
  });
});

describe("getErrorMessage", () => {
  test("returns message from Error instance", () => {
    expect(getErrorMessage(new Error("something broke"), "fallback")).toBe(
      "something broke",
    );
  });

  test("returns fallback for non-Error value", () => {
    expect(getErrorMessage("string error", "fallback")).toBe("fallback");
  });

  test("returns fallback for null", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
  });

  test("returns fallback for undefined", () => {
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
