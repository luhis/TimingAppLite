import { renderHook, act } from "@testing-library/react";

import { useFavourites } from "./useFavourites";

describe("useFavourites", () => {
  test("starts with empty set", () => {
    const { result } = renderHook(() => useFavourites());

    expect(result.current.count).toBe(0);
    expect(result.current.isFavourite("1")).toBe(false);
  });

  test("toggle adds entry to favourites", () => {
    const { result } = renderHook(() => useFavourites());

    act(() => {
      result.current.toggle("42");
    });

    expect(result.current.isFavourite("42")).toBe(true);
    expect(result.current.count).toBe(1);
  });

  test("toggle removes entry from favourites", () => {
    const { result } = renderHook(() => useFavourites());

    act(() => {
      result.current.toggle("42");
    });
    act(() => {
      result.current.toggle("42");
    });

    expect(result.current.isFavourite("42")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  test("multiple entries tracked independently", () => {
    const { result } = renderHook(() => useFavourites());

    act(() => {
      result.current.toggle("1");
    });
    act(() => {
      result.current.toggle("2");
    });
    act(() => {
      result.current.toggle("3");
    });

    expect(result.current.count).toBe(3);
    expect(result.current.isFavourite("1")).toBe(true);
    expect(result.current.isFavourite("2")).toBe(true);
    expect(result.current.isFavourite("3")).toBe(true);
    expect(result.current.isFavourite("4")).toBe(false);
  });

  test("removing one entry does not affect others", () => {
    const { result } = renderHook(() => useFavourites());

    act(() => {
      result.current.toggle("1");
    });
    act(() => {
      result.current.toggle("2");
    });
    act(() => {
      result.current.toggle("1");
    });

    expect(result.current.count).toBe(1);
    expect(result.current.isFavourite("1")).toBe(false);
    expect(result.current.isFavourite("2")).toBe(true);
  });

  test("isFavourite reflects current state", () => {
    const { result } = renderHook(() => useFavourites());

    expect(result.current.isFavourite("5")).toBe(false);

    act(() => {
      result.current.toggle("5");
    });

    expect(result.current.isFavourite("5")).toBe(true);
  });
});
