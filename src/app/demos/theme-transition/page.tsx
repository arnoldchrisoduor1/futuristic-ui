"use client";

import { useState } from "react";
import Link from "next/link";
import { useSymbioteTransition } from "../../../hooks/use-symbiote-transition";
import type { Origin } from "../../../components/effects/symbiote-transition";

const ORIGINS: Origin[] = ["top-right", "top-left", "bottom-right", "bottom-left"];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

export default function ThemeTransitionDemo() {
  const [origin, setOrigin] = useState<Origin>("top-right");
  const [tendrils, setTendrils] = useState(26);
  const [branches, setBranches] = useState(3);
  const [durationMs, setDurationMs] = useState(2400);
  const [trail, setTrail] = useState(0.3);
  const [thickness, setThickness] = useState(1);

  const { theme, mounted, toggle } = useSymbioteTransition({
    origin,
    tendrils,
    branches,
    durationMs,
    trail,
    thickness,
  });

  const next = theme === "dark" ? "light" : "dark";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-8 py-4">
        <Link href="/ui" className="text-sm text-muted-foreground hover:text-foreground">
          ← Gallery
        </Link>
        <span className="text-sm text-muted-foreground">Theme transition demo</span>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-16">
        <p className="text-sm uppercase tracking-widest text-primary">Symbiote transition</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Switch themes. Let it spread.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          A symbiote crawls across the page and the new theme appears behind it
          as it passes, one continuous motion from start to finish.
        </p>

        <button
          onClick={toggle}
          className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {mounted ? `Switch to ${next} mode` : "Switch theme"}
        </button>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {["Surface", "Elevated", "Muted"].map((name, i) => (
            <div
              key={name}
              className={
                i === 0
                  ? "rounded-lg border border-border bg-surface p-6 shadow-soft"
                  : i === 1
                  ? "rounded-lg border border-border bg-surface-elevated p-6 shadow-soft"
                  : "rounded-lg border border-border bg-muted p-6"
              }
            >
              <h3 className="font-medium">{name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Sample content so you can see every token change theme.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
                  Primary
                </span>
                <span className="rounded-full border border-border px-3 py-1 text-xs">
                  Outline
                </span>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-14 rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-5 font-medium">Tune the effect</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Origin corner</p>
              <div className="grid grid-cols-2 gap-2">
                {ORIGINS.map((o) => (
                  <button
                    key={o}
                    onClick={() => setOrigin(o)}
                    className={
                      "rounded-md border px-3 py-2 text-sm transition-colors " +
                      (origin === o
                        ? "border-primary bg-muted text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/60")
                    }
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Slider label="Main tendrils" value={tendrils} min={8} max={60} step={1} onChange={setTendrils} />
              <Slider label="Branches per tendril" value={branches} min={0} max={6} step={1} onChange={setBranches} />
              <Slider label="Total duration (ms)" value={durationMs} min={1200} max={5000} step={100} onChange={setDurationMs} />
              <Slider label="Trail length" value={trail} min={0.1} max={0.6} step={0.05} onChange={setTrail} />
              <Slider label="Thickness" value={thickness} min={0.5} max={1.8} step={0.1} onChange={setThickness} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}