export type ComponentStatus = "planned" | "in-progress" | "done";

export interface RegistryEntry {
  name: string;
  slug: string;
  description: string;
  status: ComponentStatus;
}

// Adding a component to the gallery = adding one line here.
export const registry: RegistryEntry[] = [
  { name: "Button", slug: "button", description: "Actions in every variant, size, and state.", status: "planned" },
  { name: "Input", slug: "input", description: "Text fields, validation states, and adornments.", status: "planned" },
  { name: "Navbar", slug: "navbar", description: "Top navigation layouts and mobile menus.", status: "planned" },
  { name: "Footer", slug: "footer", description: "Page footers from minimal to multi-column.", status: "planned" },
  { name: "Card", slug: "card", description: "Content containers and surface styles.", status: "planned" },
  { name: "Modal", slug: "modal", description: "Dialogs, confirmations, and overlays.", status: "planned" },
];

export function getEntry(slug: string) {
  return registry.find((entry) => entry.slug === slug);
}