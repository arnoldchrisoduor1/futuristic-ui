import { cn } from "../../lib/utils";

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
} as const;

interface VariantGridProps {
  title: string;
  description?: string;
  columns?: keyof typeof columnClasses;
  className?: string;
  children: React.ReactNode;
}

export function VariantGrid({
  title,
  description,
  columns = 3,
  className,
  children,
}: VariantGridProps) {
  return (
    <section className="mb-12">
      <header className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className={cn("grid gap-4", columnClasses[columns], className)}>
        {children}
      </div>
    </section>
  );
}

export function Variant({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div
        className={cn(
          "flex min-h-28 flex-1 items-center justify-center p-6",
          className
        )}
      >
        {children}
      </div>
      <div className="border-t border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
        {label}
      </div>
    </div>
  );
}