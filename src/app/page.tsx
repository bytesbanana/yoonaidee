import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Yoo Nai Dee | Short stays in Bangkok",
  description: "Compare Bangkok areas for your next work assignment, stay dates, and rent budget.",
};

const destinations = [
  { href: "/recommendations", title: "Living zone recommendation", description: "View your current recommendation and past searches.", icon: MapPin },
  { href: "/profile", title: "Your profile", description: "Manage your saved LINE preferences.", icon: UserRound },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-5 pt-5 pb-12 text-[#172c24] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 sm:pt-7 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <section className="grid overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed] md:grid-cols-[1fr_1fr]">
          <div className="flex flex-col items-start justify-center px-6 py-9 sm:px-10 md:py-12 lg:px-14 lg:py-16">
            <h1 className="max-w-lg font-serif text-[clamp(2.65rem,5vw,4.4rem)] leading-[1.02] tracking-[-0.05em]">
              Choose your <em className="font-normal text-[#d9edaa]">next stay</em>
            </h1>
            <p className="mt-4 max-w-sm leading-relaxed text-[#e0e9dd]">
              Moving across Bangkok for work? Compare areas around your assignment, travel dates, and total rent budget.
            </p>
          </div>
          <div className="relative min-h-40 sm:min-h-52 md:min-h-[25rem]">
            <Image src="/bangkok-hero.webp" alt="" fill preload sizes="(min-width: 1280px) 576px, (min-width: 768px) 50vw, 100vw" className="object-cover object-[60%_50%]" />
          </div>
        </section>

        <nav aria-label="Main navigation" className="mt-4 grid gap-3 md:grid-cols-2">
          {destinations.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-[#dce3d9] bg-white p-4 hover:border-[#829e89] hover:bg-[#f4f8ef] focus-visible:outline-offset-4 sm:p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf1e6] text-[#164334]">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-0.5 text-sm text-[#52645a]">{description}</p>
              </div>
              <ArrowUpRight aria-hidden="true" className="size-5 text-[#164334]" />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
