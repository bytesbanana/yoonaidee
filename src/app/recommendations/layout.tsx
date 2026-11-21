import type { ReactNode } from "react";

export default function RecommendationsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-5 py-8 text-[#172c24] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">{children}</div>
    </main>
  );
}
