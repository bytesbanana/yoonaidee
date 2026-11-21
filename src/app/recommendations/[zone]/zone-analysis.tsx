"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatTransport } from "@/lib/preferences/display";
import { normalizeLocation } from "@/lib/preferences/locations";
import type { ZoneResult } from "@/lib/analyses/result";
import { useLanguage } from "../../providers/language-provider";
import { AnalysisLoader } from "../analysis-loader";
import { ZoneArtwork } from "../zone-artwork";

export function ZoneAnalysis() {
  const { t } = useLanguage();
  const { zone } = useParams<{ zone: string }>();
  const resultId = useSearchParams().get("result");
  const back = (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#164334] hover:underline">
      <ArrowLeft aria-hidden className="size-4" />
      {t("Back to recommendations")}
    </Link>
  );

  return (
    <AnalysisLoader key={`${zone}:${resultId ?? ""}`} zone resultId={resultId} header={back}>
      {(analysis) => {
        const zones = analysis?.result.recommendations ?? [];
        const index = zones.findIndex(({ zoneId }) => zoneId === zone);
        const match = zones[index];
        return match ? <ZoneDetails zone={match} index={index} /> : <p className="mt-4">{t("This zone is unavailable in the saved analysis.")}</p>;
      }}
    </AnalysisLoader>
  );
}

function ZoneDetails({ zone, index }: { zone: ZoneResult; index: number }) {
  const { language, t } = useLanguage();
  const scores = Object.entries(zone.scores ?? {}).filter(([, score]) => score !== null);
  const commute = [
    zone.commute?.minutes != null ? t("{minutes} min", { minutes: zone.commute.minutes }) : null,
    zone.commute?.mode && formatTransport(zone.commute.mode, language),
    zone.commute?.source && (/^[a-z0-9_-]+$/i.test(zone.commute.source)
      ? t(normalizeLocation(zone.commute.source.replace(/[_-]/g, " ")))
      : zone.commute.source),
  ].filter(Boolean).join(" · ");

  return (
    <>
      <header className="mt-3 overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed]">
        <div className="p-6 sm:px-9">
          <h1 className="font-serif text-4xl tracking-tight [overflow-wrap:anywhere] sm:text-5xl">{zone.zoneName}</h1>
          {zone.overallScore != null && <p className="mt-3">{t("Overall score {score}", { score: zone.overallScore })}</p>}
        </div>
        <ZoneArtwork index={index} rank={zone.rank ?? index + 1} detail />
      </header>
      <div className="mt-5 space-y-5">
        {zone.reasoning && <p className="leading-relaxed">{zone.reasoning}</p>}
        {commute && <section><h2 className="font-semibold">{t("Commute")}</h2><p>{commute}</p></section>}
        {scores.length > 0 && (
          <section>
            <h2 className="font-semibold">{t("Score breakdown")}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-white p-4">
              {scores.map(([name, score]) => (
                <div key={name}><dt>{t(normalizeLocation(name.replace(/[_-]/g, " ")))}</dt><dd className="font-semibold">{score}</dd></div>
              ))}
            </dl>
          </section>
        )}
        <DetailsList title={t("Advantages")} items={zone.pros} />
        <DetailsList title={t("Trade-offs")} items={zone.cons} />
        <DetailsList title={t("Nearby places")} items={zone.nearbyPlaces.map(({ name }) => name)} />
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
