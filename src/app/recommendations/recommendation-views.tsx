"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AnalysisSummary, SavedAnalysis } from "@/lib/analyses/result";
import { AnalysisLoader } from "./analysis-loader";
import { ZoneArtwork } from "./zone-artwork";

const recommendationsPath = "/recommendations";
const historyHref = `${recommendationsPath}?view=history`;
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Bangkok" });

function AnalysisLabel({ analysis }: { analysis: AnalysisSummary }) {
  return (
    <>
      {analysis.destination && <span className="block font-semibold">{analysis.destination}</span>}
      <time className="text-sm text-[#52645a]" dateTime={analysis.createdAt}>{dateFormat.format(new Date(analysis.createdAt))}</time>
    </>
  );
}

export function RecommendationViews() {
  const params = useSearchParams();
  const resultId = params.get("result");
  const history = params.get("view") === "history";
  const query = new URLSearchParams(resultId !== null ? { result: resultId } : history ? { view: "history" } : {}).toString();

  return (
    <>
      <header className="mt-3 rounded-[2rem] bg-[#163a2f] p-6 text-[#faf8ed] sm:p-9">
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Living zone recommendation</h1>
      </header>

      <nav aria-label="Recommendation views" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-[#dce3d9] bg-white p-1">
        {[
          { label: "Current", href: recommendationsPath, active: !history },
          { label: "Past searches", href: historyHref, active: history },
        ].map(({ label, href, active }) => (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold ${active ? "bg-[#164334] text-white" : "text-[#164334] hover:bg-[#eaf1e6]"}`}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="mt-5" aria-labelledby="recommendation-heading">
        <h2 id="recommendation-heading" className="font-serif text-3xl tracking-tight">
          {history ? (resultId === null ? "Past searches" : "Past recommendation") : "Current recommendation"}
        </h2>
        {history && resultId !== null && <Link href={historyHref} className="mt-2 inline-block text-sm underline">Back to past searches</Link>}
        {history && resultId === null ? (
          <AnalysisLoader<{ history: AnalysisSummary[] }> key={query} query={query}>
            {({ history }) => history.length ? (
              <ul className="mt-3 space-y-3">
                {history.map((item) => (
                  <li key={item.id}>
                    <Link href={{ pathname: recommendationsPath, query: { view: "history", result: item.id } }}
                      className="block rounded-2xl border border-[#dce3d9] bg-white p-4 hover:underline">
                      <AnalysisLabel analysis={item} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-[#52645a]">Earlier completed analyses will appear here.</p>}
          </AnalysisLoader>
        ) : (
          <AnalysisLoader<{ analysis: SavedAnalysis | null }> key={query} query={query}>
            {({ analysis }) => analysis ? <AnalysisResults analysis={analysis} history={history} /> : (
              <p className="mt-3 text-sm text-[#52645a]">You have no completed analysis yet. Request one in the Yoo Nai Dee LINE chat.</p>
            )}
          </AnalysisLoader>
        )}
      </section>
    </>
  );
}

function AnalysisResults({ analysis, history }: { analysis: SavedAnalysis; history: boolean }) {
  const { recommendations, dataLimitations } = analysis.result;
  return (
    <div className="mt-3">
      <AnalysisLabel analysis={analysis} />
      {recommendations.length ? (
        <ol role="list" className="mt-4 space-y-4">
          {recommendations.map((zone, index) => (
            <li key={zone.zoneId} role="listitem" className="overflow-hidden rounded-2xl border border-[#dce3d9] bg-white sm:grid sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <ZoneArtwork index={index} rank={zone.rank ?? index + 1} />
              <div className="min-w-0 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <h3 className="font-serif text-2xl leading-tight [overflow-wrap:anywhere] sm:text-3xl">{zone.zoneName}</h3>
                  {zone.overallScore != null && (
                    <span className="rounded-full bg-[#eaf1e6] px-3 py-1 text-sm font-semibold text-[#164334]">Score {zone.overallScore}</span>
                  )}
                </div>
                {zone.reasoning && <p className="mt-2 leading-relaxed [overflow-wrap:anywhere]">{zone.reasoning}</p>}
                <Link href={{
                  pathname: `/recommendations/${encodeURIComponent(zone.zoneId)}`,
                  query: { result: analysis.id, ...(history ? { view: "history" } : {}) },
                }} aria-label={`View zone analysis for ${zone.zoneName}`} className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#c8d9cb] px-3 text-sm font-semibold text-[#164334] hover:bg-[#eaf1e6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334]">
                  View zone analysis
                </Link>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-sm text-[#52645a]">This analysis has no recommended zones.</p>}
      {history && dataLimitations.length > 0 && (
        <div className="mt-4 text-sm text-[#52645a]">
          <h3 className="font-semibold">Data limitations</h3>
          <ul className="mt-1 list-disc pl-5">{dataLimitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
