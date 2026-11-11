import { Sidebar } from "@//components/showcase/sidebar";

export default function UiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}