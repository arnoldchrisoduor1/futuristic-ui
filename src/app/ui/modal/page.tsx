import { VariantGrid, Variant } from "@/components/showcase/variant-grid";
import { getEntry } from "@/lib/registry";

export default function Page() {
  const entry = getEntry("modal")!;
  return (
    <VariantGrid title={entry.name} description={entry.description}>
      <Variant label="Coming soon">
        <span className="text-sm text-muted-foreground">Not built yet</span>
      </Variant>
    </VariantGrid>
  );
}
