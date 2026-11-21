"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEMO_ZONES } from "./demo-zones";
import { findPastResult } from "./demo-results";
import { parseSearches, readSearches, subscribeSearches, writeSearches } from "./saved-searches";
import { StayForm } from "./stay-form";
import { StayResults } from "./stay-results";
import { formatBaht, formatStayDate, type SavedSearch, type StayPlan } from "./stay-search";

const recommendationsPath = "/recommendations";
const searchHref = (id: string) => `${recommendationsPath}?search=${id}`;
const updateHref = `${recommendationsPath}?view=update`;

export function StayPlanner() {
  const params = useSearchParams();
  const searchId = params.get("search");
  const previousDemo = findPastResult(params.get("version") ?? undefined);
  const updating = params.get("view") === "update";
  const startingFresh = params.get("view") === "new";
  const editing = updating || startingFresh;
  const storage = useSyncExternalStore(subscribeSearches, readSearches, () => null);
  const searches = useMemo(() => parseSearches(storage ?? ""), [storage]);
  const [transientSearch, setTransientSearch] = useState<SavedSearch | null>(null);
  const [storageError, setStorageError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const shouldFocusResults = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentSearch = transientSearch ?? searches[0];
  const requestedSearch = searches.find(({ id }) => id === searchId)
    ?? (transientSearch?.id === searchId ? transientSearch : null);
  const search = searchId ? requestedSearch : previousDemo ? null : currentSearch;
  const showingPastSearch = Boolean(previousDemo || (search && search.id !== currentSearch?.id));

  useEffect(() => {
    if (!editing && shouldFocusResults.current) {
      heading.current?.focus();
      shouldFocusResults.current = false;
    }
  }, [editing]);

  function runSearch(plan: StayPlan) {
    const existing = searches.find((item) => item.destination === plan.destination && item.moveIn === plan.moveIn
      && item.moveOut === plan.moveOut && item.budget === plan.budget);
    const result = { ...plan, id: existing?.id ?? crypto.randomUUID() };
    const written = writeSearches([result, ...searches.filter(({ id }) => id !== result.id)].slice(0, 20));
    setTransientSearch(written ? null : result);
    setStorageError(written ? "" : "This browser couldn’t save the search.");
    shouldFocusResults.current = true;
    setAnnouncement("Sample area shortlist updated.");
    window.history.pushState(null, "", written ? recommendationsPath : searchHref(result.id));
  }

  function removeSearch(id: string) {
    const written = writeSearches(searches.filter((item) => item.id !== id));
    setStorageError(written ? "" : "This browser couldn’t remove the search.");
    if (written && id === searchId) window.history.replaceState(null, "", recommendationsPath);
  }

  function clearSearches() {
    if (!window.confirm("Clear all past searches saved in this browser?")) return;

    const written = writeSearches([]);
    setStorageError(written ? "" : "This browser couldn’t clear past searches.");
    if (written) {
      if (searchId && transientSearch?.id !== searchId) window.history.replaceState(null, "", recommendationsPath);
      heading.current?.focus();
      setAnnouncement("Past searches cleared.");
    }
  }

  const backHref = searchId && requestedSearch ? searchHref(searchId) : recommendationsPath;
  const initialPlan = startingFresh ? { budget: search?.budget } : search ?? undefined;

  return (
    <>
      <header className="mt-3 rounded-[2rem] bg-[#163a2f] p-6 text-[#faf8ed] sm:p-9">
        <h1 ref={heading} tabIndex={-1} className="font-serif text-4xl leading-tight tracking-tight focus-visible:outline-offset-4 sm:text-5xl">
          {editing ? "Update recommendation" : "Living zone recommendation"}
        </h1>
        {editing && <p className="mt-3 max-w-lg leading-relaxed text-[#e0e9dd]">Compare Bangkok areas around your next assignment, stay dates, and rent budget.</p>}
      </header>

      <p className="sr-only" role="status">{announcement}</p>
      {storageError && <p role="status" className="mt-4 text-sm font-medium text-amber-900">{storageError}</p>}
      {storage === null ? (
        <p className="mt-5 text-sm text-[#52645a]" role="status">Loading saved searches…</p>
      ) : editing ? (
        <StayForm key={params.toString()} initial={initialPlan}
          onSearch={runSearch} onCancel={() => window.history.pushState(null, "", backHref)} />
      ) : (
        <>
          <section className="mt-5" aria-labelledby="recommendation-heading">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <h2 id="recommendation-heading" className="font-serif text-3xl tracking-tight">
                {showingPastSearch ? "Past recommendation" : "Current recommendation"}
              </h2>
              {showingPastSearch && <Link href={recommendationsPath} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#164334] underline underline-offset-4">Back to current recommendation</Link>}
            </div>
            {searchId && !search && <p className="mt-2 text-sm text-[#52645a]">This saved search is unavailable in this browser.</p>}
            {search ? (
              <StayResults search={search}
                onEdit={() => window.history.pushState(null, "", `${updateHref}&search=${search.id}`)}
                onNew={() => window.history.pushState(null, "", `${recommendationsPath}?view=new&search=${search.id}`)} />
            ) : (
              <div className="mt-4 rounded-3xl border border-[#dce3d9] bg-white p-5">
                <p className="text-sm text-[#52645a]">
                  {previousDemo ? `Sample areas from ${formatStayDate(previousDemo.date)} · ${previousDemo.focus}` : "You have no saved recommendation yet. Browse sample areas or enter your stay details to get a shortlist."}
                </p>
                <ul aria-label="Sample areas" className="mt-2 flex flex-wrap gap-x-5">
                  {(previousDemo?.zones ?? DEMO_ZONES).map((zone) => (
                    <li key={zone.slug}>
                      <Link href={{ pathname: `/recommendations/${zone.slug}`, query: previousDemo ? { version: previousDemo.version } : undefined }}
                        className="inline-flex min-h-11 items-center text-sm text-[#164334] underline underline-offset-4">{zone.name}</Link>
                    </li>
                  ))}
                </ul>
                {!previousDemo && (
                  <Link href={updateHref} className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-[#164334] px-4 text-sm font-semibold text-white hover:bg-[#225a47]">Get a recommendation</Link>
                )}
              </div>
            )}
          </section>

          <section id="past-searches" className="mt-8" aria-labelledby="past-searches-heading">
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <h2 id="past-searches-heading" className="font-serif text-3xl tracking-tight">Past searches</h2>
              {searches.length > 0 && (
                <button type="button" onClick={clearSearches} className="min-h-11 text-sm font-semibold text-[#164334] underline underline-offset-4">
                  Clear past searches
                </button>
              )}
            </div>
            {searches.length === 0 ? (
              <p className="mt-3 text-sm text-[#52645a]">Searches you run in this browser will appear here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {searches.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 rounded-2xl border border-[#dce3d9] bg-white p-4">
                    <Link href={searchHref(item.id)} className="min-w-0 flex-1 py-1 hover:underline">
                      <p className="break-words font-semibold">{item.destination}</p>
                      <p className="mt-1 text-sm text-[#52645a]">{formatStayDate(item.moveIn)} – {formatStayDate(item.moveOut)} · {formatBaht(item.budget)}</p>
                    </Link>
                    <button type="button" onClick={() => removeSearch(item.id)} aria-label={`Remove search for ${item.destination}, ${formatStayDate(item.moveIn)}`}
                      className="min-h-11 px-1 text-sm text-[#52645a] underline underline-offset-4">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
