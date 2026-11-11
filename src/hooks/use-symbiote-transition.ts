"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "../components/providers/theme-provider";
import {
  runSymbioteTransition,
  type SymbioteConfig,
} from "../components/effects/symbiote-transition";

export function useSymbioteTransition(overrides?: Partial<SymbioteConfig>) {
  const { theme, mounted, toggleTheme } = useTheme();
  const busy = useRef(false);
  const overridesRef = useRef(overrides);

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  const toggle = useCallback(() => {
    if (busy.current) return;

    // Respect reduced motion: swap instantly, no goo
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      toggleTheme();
      return;
    }

    const target = theme === "dark" ? "light" : "dark";
    busy.current = true;
    toggleTheme((swap) => {
      runSymbioteTransition(swap, { ...overridesRef.current, target }).finally(
        () => {
          busy.current = false;
        }
      );
    });
  }, [theme, toggleTheme]);

  return { theme, mounted, toggle };
}