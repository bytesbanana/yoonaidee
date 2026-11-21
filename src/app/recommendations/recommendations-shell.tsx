import type { ReactNode } from "react";

export function RecommendationsShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-4 pb-8 pt-4 text-[#172c24] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}
