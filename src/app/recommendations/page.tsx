import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Current Lifestyle Optimization | Yoo Nai Dee",
};

export default function RecommendationsPage() {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-5 [font-family:var(--font-geist-sans),sans-serif] py-8 text-[#172c24] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#164334]"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Home
        </Link>
        <section className="mt-4 rounded-[2rem] border border-[#dce3d9] bg-white p-7 sm:p-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#eaf1e6] text-[#164334]">
            <Compass aria-hidden="true" className="size-6" />
          </span>
          <h1 className="mt-6 font-serif text-4xl tracking-tight sm:text-5xl">
            Current Lifestyle Optimization
          </h1>
          <p className="mt-4 max-w-sm leading-relaxed text-[#52645a]">
            Open your Yoo Nai Dee chat in LINE to request neighborhood recommendations or revisit your results.
          </p>
        </section>
      </div>
    </main>
  );
}
