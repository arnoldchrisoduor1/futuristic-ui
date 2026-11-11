"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { registry, type ComponentStatus } from "../../lib/registry";
import { useTheme } from "../../components/providers/theme-provider";
import { cn } from "../../lib/utils";

const statusDot: Record<ComponentStatus, string> = {
  planned: "bg-muted-foreground/40",
  "in-progress": "bg-accent",
  done: "bg-primary",
};

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, mounted, toggleTheme } = useTheme();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="border-b border-border px-5 py-5">
        <Link href="/ui" className="text-base font-semibold tracking-tight">
          futuristic-ui
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">Component library</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Components
        </p>
        {registry.map((entry) => {
          const href = `/ui/${entry.slug}`;
          return (
            <NavLink key={entry.slug} href={href} active={pathname === href}>
              <span>{entry.name}</span>
              <span
                className={cn("h-2 w-2 rounded-full", statusDot[entry.status])}
                title={entry.status}
              />
            </NavLink>
          );
        })}

        <p className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Demos
        </p>
        <NavLink
          href="/demos/theme-transition"
          active={pathname === "/demos/theme-transition"}
        >
          Theme transition
        </NavLink>
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => toggleTheme()}
          className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          {mounted ? `Switch to ${theme === "dark" ? "light" : "dark"}` : "Toggle theme"}
        </button>
      </div>
    </aside>
  );
}