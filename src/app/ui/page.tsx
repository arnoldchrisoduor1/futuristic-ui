import Link from "next/link";
import { registry } from "../../lib/registry";

export default function UiIndex() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
      <p className="mt-2 text-muted-foreground">
        Every component in the library, with all of its variants.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {registry.map((entry) => (
          <Link
            key={entry.slug}
            href={`/ui/${entry.slug}`}
            className="group rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary/50 hover:shadow-glow"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{entry.name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {entry.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{entry.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}