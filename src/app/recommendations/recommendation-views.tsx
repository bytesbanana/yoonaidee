"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { findPastResult } from "./demo-results";
import { parseSearches, readSearches, subscribeSearches, writeSearches } from "./saved-searches";
import { StayResults } from "./stay-results";
import { formatBaht, formatStayDate } from "./stay-search";

const recommendationsPath = "/recommendations";
const historyHref = `${recommendationsPath}?view=history`;
const searchHref = (id: string) => `${historyHref}&search=${id}`;

export function RecommendationViews() {
  const params = useSearchParams();
  const searchId = params.get("search");
  const previousDemo = findPastResult(params.get("version") ?? undefined);
  const storage = useSyncExternalStore(subscribeSearches, readSearches, () => null);
  const searches = useMemo(() => parseSearches(storage ?? ""), [storage]);
  const [storageError, setStorageError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const [current, ...pastSearches] = searches;
  const history = params.get("view") === "history" || Boolean(previousDemo || (searchId && searchId !== current?.id));
  const selected = pastSearches.find(({ id }) => id === searchId);

  function removePastSearch(id: string) {
    const [latest, ...past] = parseSearches(readSearches());
    const written = writeSearches(latest ? [latest, ...past.filter((item) => item.id !== id)] : []);
    setStorageError(written ? "" : "This browser couldn’t remove the search.");
  }

  function clearPastSearches() {
    if (!window.confirm("Clear all past searches saved in this browser?")) return;
    const [latest] = parseSearches(readSearches());
    const written = writeSearches(latest ? [latest] : []);
    setStorageError(written ? "" : "This browser couldn’t clear past searches.");
    if (written) heading.current?.focus();
  }

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

      {storageError && <p role="alert" className="mt-4 text-sm font-medium text-amber-900">{storageError}</p>}
      {storage === null ? (
        <p className="mt-5 text-sm text-[#52645a]" role="status">Loading saved searches…</p>
      ) : history ? (
        <section className="mt-5" aria-labelledby="past-searches-heading">
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <h2 ref={heading} tabIndex={-1} id="past-searches-heading" className="font-serif text-3xl tracking-tight">
              {selected || previousDemo ? "Past recommendation" : "Past searches"}
            </h2>
            {selected || previousDemo ? (
              <Link href={historyHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#164334] underline underline-offset-4">Back to past searches</Link>
            ) : pastSearches.length > 0 && (
              <button type="button" onClick={clearPastSearches} className="min-h-11 text-sm font-semibold text-[#164334] underline underline-offset-4">Clear past searches</button>
            )}
          </div>
          {selected ? (
            <StayResults search={selected} />
          ) : previousDemo ? (
            <div className="mt-4 rounded-3xl border border-[#dce3d9] bg-white p-5">
              <p className="text-sm text-[#52645a]">Sample areas from {formatStayDate(previousDemo.date)} · {previousDemo.focus}</p>
              <ul className="mt-2 flex flex-wrap gap-x-5">
                {previousDemo.zones.map((zone) => (
                  <li key={zone.slug}>
                    <Link href={{ pathname: `/recommendations/${zone.slug}`, query: { version: previousDemo.version } }}
                      className="inline-flex min-h-11 items-center text-sm text-[#164334] underline underline-offset-4">{zone.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {searchId && <p className="mt-3 text-sm text-[#52645a]">This past search is unavailable in this browser.</p>}
              {pastSearches.length === 0 ? (
                <p className="mt-3 text-sm text-[#52645a]">Earlier recommendations saved in this browser will appear here.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {pastSearches.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 rounded-2xl border border-[#dce3d9] bg-white p-4">
                      <Link href={searchHref(item.id)} className="min-w-0 flex-1 py-1 hover:underline">
                        <p className="break-words font-semibold">{item.destination}</p>
                        <p className="mt-1 text-sm text-[#52645a]">
                          {"moveIn" in item ? `${formatStayDate(item.moveIn)} – ${formatStayDate(item.moveOut)} · ${formatBaht(item.budget)}` : `${formatBaht(item.budget)} monthly rent ceiling`}
                        </p>
                      </Link>
                      <button type="button" onClick={() => removePastSearch(item.id)} aria-label={`Remove search for ${item.destination}`}
                        className="min-h-11 px-1 text-sm text-[#52645a] underline underline-offset-4">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="mt-5" aria-labelledby="recommendation-heading">
          <h2 id="recommendation-heading" className="font-serif text-3xl tracking-tight">Current recommendation</h2>
          {current ? <StayResults search={current} /> : (
            <p className="mt-3 text-sm text-[#52645a]">You have no saved recommendation yet. Use Update recommendation in Your profile.</p>
          )}
        </section>
      )}
    </>
  );
}
