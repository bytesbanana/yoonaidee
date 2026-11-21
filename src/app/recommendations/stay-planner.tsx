"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { DEMO_ZONES } from "./demo-zones";
import { findPastResult } from "./demo-results";
import { parseSearches, readSearches, subscribeSearches, writeSearches } from "./saved-searches";
import { StayForm } from "./stay-form";
import { StayResults } from "./stay-results";
import { formatBaht, formatStayDate, type SavedSearch, type StayPlan } from "./stay-search";

const plannerPath = "/recommendations";
const searchHref = (id: string) => `${plannerPath}?search=${id}`;
const historyHref = `${plannerPath}?view=history`;

export function StayPlanner() {
  const params = useSearchParams();
  const searchId = params.get("search");
  const previousDemo = findPastResult(params.get("version") ?? undefined);
  const history = params.get("view") === "history";
  const storage = useSyncExternalStore(subscribeSearches, readSearches, () => null);
  const searches = useMemo(() => parseSearches(storage ?? ""), [storage]);
  const [transientSearch, setTransientSearch] = useState<SavedSearch | null>(null);
  const [draft, setDraft] = useState<Partial<StayPlan>>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const shouldFocusResults = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const search = searches.find(({ id }) => id === searchId)
    ?? (transientSearch?.id === searchId ? transientSearch : null);

  useEffect(() => {
    if (searchId && shouldFocusResults.current) {
      heading.current?.focus();
      shouldFocusResults.current = false;
    }
  }, [searchId, editingId]);

  function runSearch(plan: StayPlan) {
    const existing = searches.find((item) => item.destination === plan.destination && item.moveIn === plan.moveIn
      && item.moveOut === plan.moveOut && item.budget === plan.budget);
    const result = { ...plan, id: existing?.id ?? crypto.randomUUID() };
    const written = writeSearches([result, ...searches.filter(({ id }) => id !== result.id)].slice(0, 20));
    setTransientSearch(written ? null : result);
    setStorageError(written ? "" : "This browser couldn’t save the search.");
    setEditingId(null);
    setDraft(undefined);
    shouldFocusResults.current = true;
    setAnnouncement("Sample area shortlist updated.");
    window.history.pushState(null, "", searchHref(result.id));
  }

  function newStay() {
    setDraft(search ? { budget: search.budget } : undefined);
    setEditingId(null);
    setAnnouncement("");
    window.history.pushState(null, "", plannerPath);
  }

  function removeSearch(id: string) {
    const written = writeSearches(searches.filter((item) => item.id !== id));
    setStorageError(written ? "" : "This browser couldn’t remove the search.");
  }

  return (
    <>
      <header className="mt-3 rounded-[2rem] bg-[#163a2f] p-6 text-[#faf8ed] sm:p-9">
        <h1 ref={heading} tabIndex={-1} className="font-serif text-4xl leading-tight tracking-tight focus-visible:outline-offset-4 sm:text-5xl">
          {history ? "Past searches" : search && editingId !== search.id ? "Recommended areas" : "Plan a short stay"}
        </h1>
        {!history && !search && <p className="mt-3 max-w-lg leading-relaxed text-[#e0e9dd]">Compare Bangkok areas around your next assignment, stay dates, and rent budget.</p>}
      </header>

      <nav aria-label="Stay planner views" className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-[#dce3d9] bg-white p-1">
        {[
          { label: "Stay planner", href: search ? searchHref(search.id) : plannerPath, icon: CalendarDays, active: !history },
          { label: "Past searches", href: historyHref, icon: Clock3, active: history },
        ].map(({ label, href, icon: Icon, active }) => (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold ${active ? "bg-[#164334] text-white" : "text-[#164334] hover:bg-[#eaf1e6]"}`}>
            <Icon aria-hidden="true" className="size-4 shrink-0" /> {label}
          </Link>
        ))}
      </nav>

      <p className="sr-only" role="status">{announcement}</p>
      {storageError && <p role="status" className="mt-4 text-sm font-medium text-amber-900">{storageError}</p>}
      {history ? (
        <section className="mt-5" aria-label="Searches saved on this browser">
          {searches.length === 0 ? (
            <div className="rounded-3xl border border-[#dce3d9] bg-white p-5">
              <p className="text-[#52645a]">Searches you run in this browser will appear here.</p>
              <Link href={plannerPath} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#164334] underline underline-offset-4">Plan a stay <ArrowRight aria-hidden="true" className="size-4" /></Link>
            </div>
          ) : (
            <ul className="space-y-3">
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
      ) : search && editingId !== search.id ? (
        <StayResults search={search} onEdit={() => { setAnnouncement(""); setEditingId(search.id); }} onNew={newStay} />
      ) : (
        <>
          {searchId && storage !== null && !search && <p className="mt-4 text-sm text-[#52645a]">This saved search is unavailable in this browser.</p>}
          <StayForm key={editingId ?? "new"} initial={search ?? draft} onSearch={runSearch}
            onCancel={search ? () => setEditingId(null) : undefined} />
          {!search && (
            <details open={previousDemo ? true : undefined} className="mt-5 rounded-2xl border border-[#dce3d9] bg-white px-4">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#164334]">
                {previousDemo ? "Areas in this previous demo" : "Browse sample properties"}
              </summary>
              <ul className="flex flex-wrap gap-x-5 pb-3">
                {(previousDemo?.zones ?? DEMO_ZONES).map((zone) => (
                  <li key={zone.slug}>
                    <Link href={{ pathname: `/recommendations/${zone.slug}`, query: previousDemo ? { version: previousDemo.version } : undefined }}
                      className="inline-flex min-h-11 items-center text-sm text-[#164334] underline underline-offset-4">{zone.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  );
}
