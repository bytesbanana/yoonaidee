import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { compareSampleAreas, directionsUrl, formatBaht, formatStayDate, stayNights, type SavedSearch } from "./stay-search";

export function StayResults({ search }: { search: SavedSearch }) {
  const dated = "moveIn" in search;
  const nights = dated ? stayNights(search.moveIn, search.moveOut) : 30;
  const areas = compareSampleAreas(nights, search.budget);
  const matches = areas.filter(({ withinBudget }) => withinBudget > 0);
  const shortlist = matches.slice(0, 3);

  function areaCard({ zone, from, withinBudget }: (typeof areas)[number]) {
    return (
      <li key={zone.slug} className="grid overflow-hidden rounded-3xl border border-[#dce3d9] bg-white sm:grid-cols-[1fr_11rem]">
        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="font-serif text-2xl tracking-tight">{zone.name}</h3>
            <p className="text-sm text-[#52645a]">From <strong className="text-base text-[#172c24] tabular-nums">{formatBaht(from)}</strong> / {dated ? "stay" : "month"}</p>
          </div>
          <p className="mt-2 text-sm text-[#52645a]">
            {withinBudget === 1 ? "1 sample listing within budget" : `${withinBudget} sample listings within budget`}
          </p>
          <p className="mt-1 text-sm text-[#52645a]">Minimum stay and availability unconfirmed</p>
          <div className="mt-3 flex flex-wrap gap-x-5">
            <Link href={{ pathname: `/recommendations/${zone.slug}`, query: dated ? { search: search.id, nights, budget: search.budget } : { search: search.id } }}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[#164334] underline underline-offset-4">
              View sample stays
            </Link>
            <a href={directionsUrl(zone.name, search.destination)} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#164334] underline underline-offset-4"
              aria-label={`Check area commute from ${zone.name} to ${search.destination} in Google Maps (opens in a new tab)`}>
              Check area commute <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
        <div className="relative h-28 bg-[#eaf1e6] sm:h-full">
          <Image src={zone.photo} alt="" fill sizes="(min-width: 640px) 176px, 100vw" className="object-cover" />
        </div>
      </li>
    );
  }

  return (
    <>
      <section aria-label="Stay summary" className="mt-5 rounded-3xl border border-[#dce3d9] bg-[#eaf1e6] p-5 sm:p-6">
        <h2 className="flex items-start gap-2 [overflow-wrap:anywhere] font-serif text-2xl tracking-tight">
          <MapPin aria-hidden="true" className="mt-1.5 size-5 shrink-0 text-[#164334]" /> <span className="min-w-0">{search.destination}</span>
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#2f4e40]">
          {dated && (
            <p className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
              <span>{formatStayDate(search.moveIn)} – {formatStayDate(search.moveOut)} · {nights} {nights === 1 ? "night" : "nights"}</span>
            </p>
          )}
          <p>{formatBaht(search.budget)} {dated ? "total rent budget" : "monthly rent ceiling"}</p>
        </div>
      </section>

      <section aria-labelledby="shortlist-heading" className="mt-7">
        <h2 id="shortlist-heading" className="font-serif text-3xl tracking-tight">Sample area shortlist</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#52645a]">
          {dated ? "Ordered by estimated base rent using fictional monthly rates prorated over 30 nights." : "Ordered by fictional monthly base rent."} Fees and deposits are separate.
          Commute links start from the area, so check the route from the exact address before committing.
        </p>
        {shortlist.length > 0 ? (
          <ol className="mt-4 space-y-3">{shortlist.map(areaCard)}</ol>
        ) : (
          <div className="mt-4 rounded-2xl border border-[#dce3d9] bg-white p-5">
            <h3 className="font-semibold">No sample listings fit this budget</h3>
            <p className="mt-1 text-sm text-[#52645a]">The lowest sample estimate is {formatBaht(areas[0].from)}{dated ? " for these dates" : " per month"}.</p>
          </div>
        )}
        {areas.length > shortlist.length && (
          <details className="mt-4 rounded-2xl border border-[#dce3d9] bg-white px-4">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#164334]">See other sample areas</summary>
            <ul className="space-y-3 pb-4">{areas.filter((area) => !shortlist.includes(area)).map(areaCard)}</ul>
          </details>
        )}
      </section>
    </>
  );
}
