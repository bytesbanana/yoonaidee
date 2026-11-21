import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DEMO_ZONES } from "./demo-zones";

export const metadata: Metadata = {
  title: "Current Lifestyle Optimization | Yoo Nai Dee",
};

export default function RecommendationsPage() {
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
          Explore five sample Bangkok zones and the types of homes you could browse in each. Photos are illustrative.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="zones-heading">
        <h2 id="zones-heading" className="font-serif text-2xl tracking-tight sm:text-3xl">Top 5 demo zones</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {DEMO_ZONES.map((zone) => (
            <li key={zone.slug}>
              <Link
                href={`/recommendations/${zone.slug}`}
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
                    <h3 className="font-serif text-2xl tracking-tight">{zone.name}</h3>
                    <p className="mt-1 text-sm text-[#52645a]">Explore properties</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-[#164334]" />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
