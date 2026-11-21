import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { DEMO_ZONES } from "../demo-zones";
import { findPastResult } from "../demo-results";
import { formatBaht, sampleStayRent } from "../stay-search";

const stayQuery = z.object({
  search: z.uuid(),
  nights: z.coerce.number().int().min(1).max(3_652_424),
  budget: z.coerce.number().int().min(1).max(10_000_000),
});

type ZonePageProps = {
  params: Promise<{ zone: string }>;
  searchParams: Promise<{ version?: string | string[]; search?: string | string[]; nights?: string | string[]; budget?: string | string[] }>;
};

async function getZone(params: ZonePageProps["params"]) {
  const { zone } = await params;
  const match = DEMO_ZONES.find(({ slug }) => slug === zone);
  if (!match) notFound();
  return match;
}

export function generateStaticParams() {
  return DEMO_ZONES.map(({ slug }) => ({ zone: slug }));
}

export async function generateMetadata({ params }: ZonePageProps): Promise<Metadata> {
  const zone = await getZone(params);
  return { title: `Sample stays in ${zone.name} | Yoo Nai Dee` };
}

export default async function ZonePage({ params, searchParams }: ZonePageProps) {
  const zone = await getZone(params);
  return (
    <Suspense fallback={<p className="mt-8" role="status">Loading sample stays…</p>}>
      <ZoneStays zone={zone} searchParams={searchParams} />
    </Suspense>
  );
}

async function ZoneStays({ zone, searchParams }: {
  zone: Awaited<ReturnType<typeof getZone>>;
  searchParams: ZonePageProps["searchParams"];
}) {
  const query = await searchParams;
  const stay = stayQuery.safeParse(query).data;
  const searchId = z.uuid().safeParse(query.search).data;
  const previous = findPastResult(query.version);
  const backHref = {
    pathname: "/recommendations",
    query: searchId ? { search: searchId } : previous ? { version: previous.version } : undefined,
  };
  const properties = [...zone.properties].sort((a, b) => a.monthlyRentThb - b.monthlyRentThb);

  return (
    <>
      <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-offset-4">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {searchId ? "Back to your shortlist" : "Back to recommendations"}
      </Link>

      <header className="mt-3 rounded-[2rem] bg-[#163a2f] p-6 text-[#faf8ed] sm:p-9">
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Sample stays in {zone.name}</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-[#e0e9dd]">
          These listings and rents are fictional. Photos are illustrative.
          {stay && " Stay estimates use sample monthly rent prorated over 30 nights, before fees and deposits."}
        </p>
      </header>

      <section className="mt-6" aria-label="Sample listings">
        {stay && <p className="mb-4 text-sm font-medium text-[#52645a]">{stay.nights} {stay.nights === 1 ? "night" : "nights"} · {formatBaht(stay.budget)} total rent budget</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {properties.map((property) => {
            const estimate = stay ? sampleStayRent(property.monthlyRentThb, stay.nights) : null;
            return (
              <li key={property.name} className="flex flex-col overflow-hidden rounded-3xl border border-[#dce3d9] bg-white">
                <div className="flex-1 p-5">
                  <p className="text-sm font-medium text-[#52645a]">{property.type} · {property.areaSqm} m²</p>
                  <h2 className="mt-1 font-serif text-2xl tracking-tight">{property.name}</h2>
                  {estimate !== null && stay && (
                    <p className="mt-3">
                      <strong className="text-xl tabular-nums">{formatBaht(estimate)}</strong> <span className="text-sm text-[#52645a]">estimated base rent</span>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-[#52645a]">{formatBaht(property.monthlyRentThb)} sample monthly rent</p>
                  {estimate !== null && stay && (
                    <p className="mt-2 text-sm font-semibold text-[#164334]">
                      {estimate <= stay.budget ? "Within rent budget" : `${formatBaht(estimate - stay.budget)} above rent budget`}
                    </p>
                  )}
                  <dl className="mt-4 grid gap-2 rounded-xl bg-[#f4f8ef] p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-x-3"><dt>Minimum stay</dt><dd className="font-medium">Unconfirmed</dd></div>
                    <div className="flex flex-wrap justify-between gap-x-3"><dt>Date availability</dt><dd className="font-medium">Unconfirmed</dd></div>
                    <div className="flex flex-wrap justify-between gap-x-3"><dt>Cash due at move-in</dt><dd className="font-medium">Unknown</dd></div>
                    <div className="flex flex-wrap justify-between gap-x-3"><dt>Refundable deposit</dt><dd className="font-medium">Unknown</dd></div>
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-[#52645a]">{property.description}</p>
                  <ul aria-label="Amenities" className="mt-2 flex flex-wrap gap-2">
                    {property.amenities.map((amenity) => (
                      <li key={amenity} className="rounded-full border border-[#dce3d9] px-2.5 py-1 text-xs text-[#164334]">{amenity}</li>
                    ))}
                  </ul>
                </div>
                <div className="relative aspect-[16/9] bg-[#eaf1e6]">
                  <Image src={property.photo} alt="" fill sizes="(min-width: 832px) 376px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
