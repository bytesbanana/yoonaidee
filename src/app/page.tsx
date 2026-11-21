import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Yoo Nai Dee | Short stays in Bangkok",
  description: "Compare Bangkok areas for your next work assignment, stay dates, and rent budget.",
};

const destinations = [
  { href: "/recommendations", title: "Living zone recommendation", icon: MapPin, primary: true },
  { href: "/profile", title: "Your profile", icon: UserRound, primary: false },
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#f8f7f2] px-4 py-4 text-[#172c24] [font-family:var(--font-geist-sans),sans-serif] sm:px-8 sm:py-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <section className="grid overflow-hidden rounded-[2rem] bg-[#163a2f] text-[#faf8ed] md:grid-cols-[1fr_1fr]">
          <div className="flex flex-col items-start justify-center px-5 py-6 sm:px-10 sm:py-10 lg:px-14 lg:py-16">
            <h1 className="max-w-lg font-serif text-[clamp(2.3rem,5vw,4.4rem)] leading-[1.02] tracking-[-0.05em]">
              Choose your <em className="font-normal text-[#d9edaa]">next stay</em>
            </h1>
            <p className="mt-3 max-w-sm leading-relaxed text-[#e0e9dd]">
              Find a Bangkok neighborhood that fits your work assignment, travel dates, and rent budget.
            </p>
            <nav aria-label="Main navigation" className="mt-5 grid w-full max-w-sm gap-2.5 sm:mt-7">
              {destinations.map(({ href, title, icon: Icon, primary }) => (
                <Link key={href} href={href} className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${primary ? "border-[#d9edaa] bg-[#d9edaa] text-[#163a2f] hover:bg-[#e8f5c9]" : "border-white/40 text-white hover:bg-white/10"}`}>
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                  {title}
                </Link>
              ))}
            </nav>
          </div>
          <div className="relative h-[clamp(5rem,24svh,13rem)] md:h-auto md:min-h-[24rem]">
            <Image src="/bangkok-hero.webp" alt="" fill preload sizes="(min-width: 1280px) 576px, (min-width: 768px) 50vw, 100vw" className="object-cover object-[60%_50%]" />
          </div>
        </section>
      </div>
    </main>
  );
}
