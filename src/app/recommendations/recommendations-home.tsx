"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import type { SavedAnalysis } from "@/lib/analyses/result";
import { useLanguage } from "../providers/language-provider";
import { AnalysisLoader } from "./analysis-loader";
import { ZoneArtwork } from "./zone-artwork";

export function RecommendationsHome() {
  const { t } = useLanguage();
  const header = (
    <header>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#164334]">{t("Yoo Nai Dee")}</span>
        <Link
          href="/profile"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#c8d9cb] bg-white px-4 text-sm font-semibold text-[#164334] hover:bg-[#eaf1e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334]"
        >
          <UserRound aria-hidden="true" className="size-4" />
          {t("Your profile")}
        </Link>
      </div>
      <h1 className="mt-3 rounded-2xl bg-[#163a2f] px-4 py-4 font-serif text-3xl leading-tight tracking-tight text-[#faf8ed] sm:px-6 sm:py-5 sm:text-4xl">
        {t("Your recommendations")}
      </h1>
    </header>
  );

  return (
    <AnalysisLoader header={header}>
      {(analysis) => analysis ? <AnalysisResults analysis={analysis} /> : (
        <div className="mt-5 rounded-2xl border border-[#dce3d9] bg-white p-5">
          <p className="font-semibold">{t("No recommendations yet")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#52645a]">{t("Start a search in the Yoo Nai Dee LINE chat. Your recommendations will appear here when the search is complete.")}</p>
        </div>
      )}
    </AnalysisLoader>
  );
}

function AnalysisResults({ analysis }: { analysis: SavedAnalysis }) {
  const { t, locale } = useLanguage();
  const { recommendations } = analysis.result;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Bangkok" })
    .format(new Date(analysis.createdAt));

  return (
    <div className="mt-5">
      {analysis.destination && <span className="block font-semibold">{analysis.destination}</span>}
      <time className="text-sm text-[#52645a]" dateTime={analysis.createdAt}>{date}</time>
      {recommendations.length ? (
        <ol role="list" className="mt-4 space-y-4">
          {recommendations.map((zone, index) => (
            <li key={zone.zoneId} className="overflow-hidden rounded-2xl border border-[#dce3d9] bg-white sm:grid sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <ZoneArtwork index={index} rank={zone.rank ?? index + 1} />
              <div className="min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <h2 className="font-serif text-2xl leading-tight [overflow-wrap:anywhere] sm:text-3xl">{zone.zoneName}</h2>
                  {zone.overallScore != null && (
                    <span className="rounded-full bg-[#eaf1e6] px-3 py-1 text-sm font-semibold text-[#164334]">{t("Score {score}", { score: zone.overallScore })}</span>
                  )}
                </div>
                {zone.reasoning && <p className="mt-2 leading-relaxed [overflow-wrap:anywhere]">{zone.reasoning}</p>}
                <Link href={{
                  pathname: `/recommendations/${encodeURIComponent(zone.zoneId)}`,
                  query: { result: analysis.id },
                }} aria-label={t("View zone analysis for {zone}", { zone: zone.zoneName })} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#c8d9cb] px-3 text-sm font-semibold text-[#164334] hover:bg-[#eaf1e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334]">
                  {t("View zone analysis")}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-[#52645a]">{t("This analysis has no recommended zones.")}</p>}
    </div>
  );
}
