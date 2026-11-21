import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Compass, MapPin, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Yoo Nai Dee | Find your neighborhood in Bangkok",
  description: "Explore Bangkok neighborhoods around your commute, budget, and lifestyle.",
};

const destinations = [
  {
    href: "/profile",
    title: "Profile",
    description: "Manage your commute, rent budget, and lifestyle priorities.",
    icon: UserRound,
  },
  {
    href: "/recommendations",
    title: "Current Lifestyle Optimization",
    description: "Find out where to see your personalized neighborhood recommendations.",
    icon: Compass,
  },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-5 [font-family:var(--font-geist-sans),sans-serif] pb-12 text-[#172c24] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-3 py-6 sm:py-8">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#164334] text-white">
            <MapPin aria-hidden="true" className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Yoo Nai Dee</p>
            <p lang="th" className="text-xs text-[#52645a]">อยู่ไหนดี</p>
          </div>
        </header>

        <section className="grid overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed] md:grid-cols-[1fr_1.12fr]">
          <div className="flex flex-col justify-center px-7 py-10 sm:px-12 md:px-9 lg:px-14 lg:py-16">
            <h1 className="max-w-lg font-serif text-[clamp(2.75rem,5.5vw,4.4rem)] leading-[0.98] tracking-[-0.055em]">
              Find your place <em className="block font-normal text-[#d9edaa]">in Bangkok.</em>
            </h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[#e0e9dd] lg:text-lg">
              Discover neighborhoods that fit your commute, rent budget, and the things you love to do.
            </p>
          </div>
          <div className="relative min-h-52 sm:min-h-64 md:min-h-[27rem]">
            <Image
              src="/bangkok-hero.webp"
              alt=""
              fill
              preload
              sizes="(min-width: 1280px) 610px, (min-width: 768px) 53vw, 100vw"
              className="object-cover object-[60%_50%]"
            />
          </div>
        </section>

        <nav aria-label="Main navigation" className="mt-5 grid gap-4 md:grid-cols-2">
          {destinations.map(({ href, title, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-labelledby={href.slice(1)}
              className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 rounded-3xl border border-[#dce3d9] bg-white p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#164334] motion-safe:transition-colors hover:border-[#829e89] hover:bg-[#f4f8ef] sm:p-7"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-[#eaf1e6] text-[#164334]">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 self-center">
                <h2 id={href.slice(1)} className="text-lg leading-tight font-semibold tracking-tight sm:text-xl">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#52645a]">{description}</p>
              </div>
              <ArrowUpRight aria-hidden="true" className="mt-1 size-5 text-[#164334] motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
