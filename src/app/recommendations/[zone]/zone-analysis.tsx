"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { SavedAnalysis, ZoneResult } from "@/lib/analyses/result";
import { AnalysisLoader } from "../analysis-loader";
import { ZoneArtwork } from "../zone-artwork";

export function ZoneAnalysis() {
  const { zone } = useParams<{ zone: string }>();
  const params = useSearchParams();
  const result = params.get("result");
  const history = params.get("view") === "history";
  const query = new URLSearchParams(result === null ? {} : { result }).toString();

  return (
    <>
      <Link href={{
        pathname: "/recommendations",
        query: { ...(result !== null ? { result } : {}), ...(history ? { view: "history" } : {}) },
      }} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#164334] hover:underline">
        <ArrowLeft aria-hidden className="size-4" />
        Back to recommendations
      </Link>

      <AnalysisLoader<{ analysis: SavedAnalysis | null }> key={query} query={query}>
        {({ analysis }) => {
          const zones = analysis?.result.recommendations ?? [];
          const index = zones.findIndex(({ zoneId }) => zoneId === zone);
          const match = zones[index];
          return match ? <ZoneDetails zone={match} index={index} /> : <p className="mt-4">This zone is unavailable in the saved analysis.</p>;
        }}
      </AnalysisLoader>
    </>
  );
}

function ZoneDetails({ zone, index }: { zone: ZoneResult; index: number }) {
  const scores = Object.entries(zone.scores ?? {}).filter(([, score]) => score !== null);
  const commute = [
    zone.commute?.minutes != null ? `${zone.commute.minutes} min` : null,
    zone.commute?.mode,
    zone.commute?.source,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <header className="mt-3 overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed]">
        <div className="p-6 sm:px-9">
          <h1 className="font-serif text-4xl tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{zone.zoneName}</h1>
          {zone.overallScore != null && <p className="mt-3">Overall score {zone.overallScore}</p>}
        </div>
        <ZoneArtwork index={index} rank={zone.rank ?? index + 1} detail />
      </header>
      <div className="mt-5 space-y-5">
        {zone.reasoning && <p className="leading-relaxed">{zone.reasoning}</p>}
        {commute && <section><h2 className="font-semibold">Commute</h2><p>{commute}</p></section>}
        {scores.length > 0 && (
          <section>
            <h2 className="font-semibold">Score breakdown</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-white p-4">
              {scores.map(([name, score]) => (
                <div key={name}><dt className="capitalize">{name}</dt><dd className="font-semibold">{score}</dd></div>
              ))}
            </dl>
          </section>
        )}
        <DetailsList title="Advantages" items={zone.pros} />
        <DetailsList title="Trade-offs" items={zone.cons} />
        <DetailsList title="Nearby places" items={zone.nearbyPlaces.map(({ name }) => name)} />
        <section>
          <h2 className="font-semibold">Rental listings</h2>
          {zone.properties.length ? (
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {zone.properties.map(({ title, rentPrice, currency, listingUrl }, index) => (
                <li key={index} className="rounded-2xl border border-[#dce3d9] bg-white p-4">
                  <h3 className="font-semibold">{title}</h3>
                  {rentPrice != null && currency && (
                    <p>{new Intl.NumberFormat("en-TH", { style: "currency", currency }).format(rentPrice)} per month</p>
                  )}
                  {listingUrl && <a href={listingUrl} target="_blank" rel="noreferrer" className="text-sm underline">View listing</a>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-1 text-sm text-[#52645a]">This analysis has no saved rental listings for this zone.</p>}
        </section>
      </div>
    </>
  );
}

function DetailsList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <ul className="mt-1 list-disc space-y-1 pl-5">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </section>
  );
}
