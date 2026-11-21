"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AnalysisSummary, SavedAnalysis } from "@/lib/analyses/result";
import { AnalysisLoader } from "./analysis-loader";

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
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {recommendations.map((zone) => (
            <li key={zone.zoneId} className="rounded-2xl border border-[#dce3d9] bg-white p-5">
              <h3 className="font-serif text-2xl">{zone.zoneName}</h3>
              <p className="text-sm text-[#52645a]">
                {[zone.rank != null && `Rank ${zone.rank}`, zone.overallScore != null && `Score ${zone.overallScore}`].filter(Boolean).join(" · ")}
              </p>
              {zone.reasoning && <p className="mt-3 text-sm">{zone.reasoning}</p>}
              <Link href={{
                pathname: `/recommendations/${encodeURIComponent(zone.zoneId)}`,
                query: { result: analysis.id, ...(history ? { view: "history" } : {}) },
              }} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#164334] underline">
                View zone analysis
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-[#52645a]">This analysis has no recommended zones.</p>}
      {dataLimitations.length > 0 && (
        <div className="mt-4 text-sm text-[#52645a]">
          <h3 className="font-semibold">Data limitations</h3>
          <ul className="mt-1 list-disc pl-5">{dataLimitations.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
