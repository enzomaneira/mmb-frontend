import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** Abaixo do breakpoint `md` do Tailwind: celulares. */
export const useIsPhone = () => useMediaQuery("(max-width: 767.98px)");

/** Abaixo do breakpoint `lg` do Tailwind: celulares e iPad em pé. */
export const useIsCompact = () => useMediaQuery("(max-width: 1023.98px)");
