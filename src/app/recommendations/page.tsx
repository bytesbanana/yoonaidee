import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock3, Compass } from "lucide-react";
import { CURRENT_RESULT, RESULT_HISTORY, findPastResult, formatResultDate } from "./demo-results";

export const metadata: Metadata = {
  title: "Current Lifestyle Optimization | Yoo Nai Dee",
};

type RecommendationsPageProps = {
  searchParams: Promise<{ view?: string | string[]; version?: string | string[] }>;
};

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const { view, version } = await searchParams;
  const pastResult = findPastResult(version);
  const showingHistory = view === "history" || version !== undefined;
  const result = showingHistory ? pastResult : CURRENT_RESULT;
  const tabs = [
    { label: "Current", href: "/recommendations", icon: Compass, active: !showingHistory },
    { label: "History", href: "/recommendations?view=history", icon: Clock3, active: showingHistory },
  ];
  return (
    <>
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Home
      </Link>

      <header className="mt-4 rounded-[2rem] bg-[#163a2f] p-7 text-[#faf8ed] sm:p-10">
        <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Current Lifestyle Optimization
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-[#e0e9dd]">
          Browse your latest demo recommendations or revisit an earlier result. Zone photos are illustrative.
        </p>
      </header>

      <nav aria-label="Recommendation views" className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-[#dce3d9] bg-white p-1">
        {tabs.map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334] ${active ? "bg-[#164334] text-white" : "text-[#164334] hover:bg-[#eaf1e6]"}`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      {result ? (
        <section className="mt-8" aria-labelledby="zones-heading">
          {pastResult && (
            <Link href="/recommendations?view=history" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
              <ArrowLeft aria-hidden="true" className="size-4" />
              All previous results
            </Link>
          )}
          <h2 id="zones-heading" className="font-serif text-2xl tracking-tight sm:text-3xl">Top 5 demo zones</h2>
          <p className="mt-2 text-sm text-[#52645a]">
            Version {result.version} · <time dateTime={result.date}>{formatResultDate(result.date)}</time> · {result.focus}
          </p>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2">
            {result.zones.map((zone, index) => (
              <li key={zone.slug}>
                <Link
                  href={{ pathname: `/recommendations/${zone.slug}`, query: pastResult ? { version: pastResult.version } : undefined }}
                  className="group block overflow-hidden rounded-3xl border border-[#dce3d9] bg-white hover:border-[#829e89] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#164334]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#eaf1e6]">
                    <Image
                      src={zone.photo}
                      alt=""
                      fill
                      sizes="(min-width: 832px) 376px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5">
                    <div>
                      <h3 className="font-serif text-2xl tracking-tight">{index + 1}. {zone.name}</h3>
                      <p className="mt-1 text-sm text-[#52645a]">Explore properties</p>
                    </div>
                    <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-[#164334]" />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="mt-8" aria-labelledby="history-heading">
          <h2 id="history-heading" className="font-serif text-2xl tracking-tight sm:text-3xl">Previous results</h2>
          {version !== undefined && (
            <p className="mt-2 text-sm text-[#52645a]">That version is unavailable. Choose a result below.</p>
          )}
          <ul className="mt-4 grid gap-3">
            {RESULT_HISTORY.map((previous) => (
              <li key={previous.version}>
                <Link
                  href={`/recommendations?version=${previous.version}`}
                  className="flex items-center justify-between gap-4 rounded-3xl border border-[#dce3d9] bg-white p-5 hover:border-[#829e89] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#164334]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#52645a]">
                      Version {previous.version} · <time dateTime={previous.date}>{formatResultDate(previous.date)}</time>
                    </p>
                    <h3 className="mt-1 font-serif text-xl tracking-tight">{previous.focus}</h3>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-[#164334]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
