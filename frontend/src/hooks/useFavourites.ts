import { useCallback, useMemo, useState } from "react";

export const useFavourites = () => {
  const [favouriteEntries, setFavouriteEntries] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const toggle = useCallback((entry: string) => {
    setFavouriteEntries((current) => {
      if (current.has(entry)) {
        return new Set([...current].filter((e) => e !== entry));
      }
      return new Set([...current, entry]);
    });
  }, []);

  const isFavourite = useCallback(
    (entry: string) => favouriteEntries.has(entry),
    [favouriteEntries],
  );

  const count = useMemo(() => favouriteEntries.size, [favouriteEntries]);

  return { favouriteEntries, toggle, isFavourite, count };
};
