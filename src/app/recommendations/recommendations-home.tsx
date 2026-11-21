import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { RecommendationViews } from "./recommendation-views";

export const recommendationsMetadata: Metadata = {
  title: "Your recommendations | Yoo Nai Dee",
  description: "See your Bangkok neighborhood recommendations and revisit past searches.",
};

export function RecommendationsHome() {
  return (
    <>
      <header>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[#164334]">Yoo Nai Dee</span>
          <Link
            href="/profile"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#c8d9cb] bg-white px-4 text-sm font-semibold text-[#164334] hover:bg-[#eaf1e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334]"
          >
            <UserRound aria-hidden="true" className="size-4" />
            Your profile
          </Link>
        </div>
        <h1 className="mt-3 rounded-2xl bg-[#163a2f] px-4 py-4 font-serif text-3xl leading-tight tracking-tight text-[#faf8ed] sm:px-6 sm:py-5 sm:text-4xl">
          Your recommendations
        </h1>
      </header>
      <Suspense fallback={<p className="mt-5" role="status">Loading recommendations…</p>}>
        <RecommendationViews />
      </Suspense>
    </>
  );
}
