"use client";

import { useTheme } from "../components/providers/theme-provider";

export default function Home() {
  const { theme, mounted, toggleTheme } = useTheme();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">futuristic-ui</h1>
      <button
        onClick={() => toggleTheme()}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm shadow-soft"
      >
        {mounted ? `Switch to ${theme === "dark" ? "light" : "dark"}` : "Toggle theme"}
      </button>
    </main>
  );
}