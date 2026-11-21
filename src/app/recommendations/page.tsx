import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecommendationViews } from "./recommendation-views";

export const metadata: Metadata = {
  title: "Living zone recommendation | Yoo Nai Dee",
  description: "View your current living zone recommendation and revisit saved searches.",
};

export default function RecommendationsPage() {
  return (
    <>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>
      <Suspense fallback={<p className="mt-8" role="status">Loading recommendations…</p>}>
        <RecommendationViews />
      </Suspense>
    </>
  );
}
