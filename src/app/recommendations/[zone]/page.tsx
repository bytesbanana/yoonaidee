import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DEMO_ZONES } from "../demo-zones";
import { findPastResult } from "../demo-results";

const formatRent = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });

type ZonePageProps = {
  params: Promise<{ zone: string }>;
  searchParams: Promise<{ version?: string | string[] }>;
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
  return { title: `${zone.name} | Yoo Nai Dee` };
}

export default async function ZonePage({ params, searchParams }: ZonePageProps) {
  const zone = await getZone(params);
  return (
    <>
      <Suspense fallback={<div aria-hidden="true" className="h-11" />}>
        <ZoneBackLink searchParams={searchParams} />
      </Suspense>

      <header className="mt-4 overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed]">
        <div className="relative aspect-[16/8] bg-[#eaf1e6]">
          <Image src={zone.photo} alt="" fill sizes="(min-width: 832px) 768px, 100vw" className="object-cover" />
        </div>
        <h1 className="p-7 font-serif text-4xl tracking-tight sm:px-10 sm:text-5xl">{zone.name}</h1>
      </header>

      <section className="mt-8" aria-labelledby="properties-heading">
        <h2 id="properties-heading" className="font-serif text-2xl tracking-tight sm:text-3xl">Sample properties</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#52645a]">Listings, rents, sizes, and amenities are fictional. Photos are illustrative.</p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {zone.properties.map((property) => (
            <li key={property.name} className="overflow-hidden rounded-3xl border border-[#dce3d9] bg-white">
              <div className="relative aspect-[16/10] bg-[#eaf1e6]">
                <Image
                  src={property.photo}
                  alt=""
                  fill
                  sizes="(min-width: 832px) 376px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-sm font-semibold text-[#164334]">{property.type}</p>
                <h3 className="mt-2 font-serif text-2xl tracking-tight">{property.name}</h3>
                <p className="mt-2 leading-relaxed text-[#52645a]">{property.description}</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-[#f4f8ef] p-4">
                  <div>
                    <dt className="text-xs text-[#52645a]">Monthly rent</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{formatRent.format(property.monthlyRentThb)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#52645a]">Floor area</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{`${property.areaSqm} m²`}</dd>
                  </div>
                </dl>
                <h4 className="mt-5 text-sm font-semibold">Amenities</h4>
                <ul aria-label="Amenities" className="mt-2 flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <li key={amenity} className="rounded-full border border-[#dce3d9] px-3 py-1 text-xs text-[#164334]">
                      {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

async function ZoneBackLink({ searchParams }: Pick<ZonePageProps, "searchParams">) {
  const pastResult = findPastResult((await searchParams).version);
  const backHref = pastResult ? `/recommendations?version=${pastResult.version}` : "/recommendations";

  return (
    <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-[#164334] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
      <ArrowLeft aria-hidden="true" className="size-4" />
      {pastResult ? `Back to version ${pastResult.version}` : "All zones"}
    </Link>
  );
}
