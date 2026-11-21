"use client";

import { useEffect, useState } from "react";
import { useLiff } from "../providers/LiffProvider";
import { categoryLabels, hasCompleteWeights, type PreferenceCategory } from "@/lib/preferences/categories";

type Settings = {
  categories: PreferenceCategory[];
  budget: number | null;
  transport: string | null;
  preferredModes: string[];
  destination: string | null;
  housing: string[];
};

type LineProfile = { displayName: string; pictureUrl?: string };

type View =
  | { status: "loading" | "sign-in" }
  | { status: "error"; message: string }
  | { status: "loaded"; settings: Settings | null; profile: LineProfile | null };

export function SettingsView({ showProfile = false }: { showProfile?: boolean }) {
  const { liffObject, liffError, isReady } = useLiff();
  const [view, setView] = useState<View>({ status: "loading" });

  useEffect(() => {
    if (!isReady || !liffObject) return;
    const liff = liffObject;
    let cancelled = false;
    const controller = new AbortController();
    const update = (next: View) => { if (!cancelled) setView(next); };

    async function load() {
      try {
        if (!liff.isLoggedIn()) {
          update({ status: "sign-in" });
          return;
        }
        const token = liff.getIDToken();
        const lineProfile = showProfile ? liff.getProfile().catch(() => null) : null;
        if (!token) {
          if (showProfile) {
            update({ status: "loaded", settings: null, profile: await lineProfile });
          } else {
            update({ status: "error", message: "LINE did not provide an ID token. Open this page again from the LINE menu." });
          }
          return;
        }
        const [response, profile] = await Promise.all([
          fetch("/api/settings", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: controller.signal,
          }),
          lineProfile,
        ]);
        const result = await response.json();
        if (!response.ok) {
          update({ status: "error", message: result.error ?? "Could not load your settings." });
          return;
        }
        update({ status: "loaded", settings: result.settings, profile });
      } catch {
        update({ status: "error", message: "Could not connect to LINE. Try reopening this page." });
      }
    }

    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [isReady, liffObject, showProfile]);

  const settings = view.status === "loaded" ? view.settings : null;
  const profile = view.status === "loaded" ? view.profile : null;
  const categories = settings?.categories ?? [];
  const total = categories.reduce((sum, { weight }) => sum + (weight ?? 0), 0);
  const complete = hasCompleteWeights(categories);
  const transport = settings?.preferredModes.join(", ") || settings?.transport?.replaceAll("_", " ");
  const housingDetails = [
    ["Destination", settings?.destination],
    ["Monthly rent ceiling", settings?.budget ? `฿${settings.budget.toLocaleString("en-TH")}` : null],
    ["Transport", transport],
    ["Housing types", settings?.housing.join(", ")],
  ];
  const details = showProfile
    ? [["LINE display name", profile?.displayName], ...housingDetails]
    : housingDetails.filter(([, value]) => value);

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-900 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-emerald-800">Yoo Nai Dee</p>
        <div className="flex items-center gap-4">
          {profile?.pictureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.pictureUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {showProfile ? "Your profile" : "Housing preferences"}
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-600">Update your preferences in the Yoo Nai Dee LINE chat.</p>

        {liffError && <p className="mt-8 rounded-xl bg-white p-5" role="alert">Could not start LINE sign-in.</p>}
        {!liffError && view.status === "loading" && <p className="mt-8" role="status">Loading your preferences…</p>}
        {view.status === "error" && <p className="mt-8 rounded-xl bg-white p-5" role="alert">{view.message}</p>}
        {view.status === "sign-in" && (
          <button
            className="mt-8 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900"
            onClick={() => liffObject?.login({ redirectUri: window.location.href })}
          >
            Sign in with LINE
          </button>
        )}

        {!showProfile && view.status === "loaded" && categories.length === 0 && details.length === 0 && (
          <p className="mt-8 rounded-xl bg-white p-5">No housing preferences saved yet. Tell us what you’re looking for in the Yoo Nai Dee LINE chat.</p>
        )}
        {(showProfile || categories.length > 0) && (
          <section aria-labelledby="priorities" className="mt-8 rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-4">
              <h2 id="priorities" className="text-lg font-semibold">Location priorities</h2>
              {categories.length > 0 && (
                <span className={complete ? "text-sm font-semibold text-emerald-800" : "text-sm font-medium text-amber-800"}>
                  {total}% {complete ? "total" : "allocated · in progress"}
                </span>
              )}
            </div>
            {categories.length === 0 && <p className="px-5 py-4 text-stone-600">—</p>}
            <ul className="divide-y divide-stone-100">
              {categories.map(({ category, places, weight }) => (
                <li key={category} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-medium">{categoryLabels[category][0]}</p>
                    <p className="mt-1 text-sm text-stone-600">{places.length ? places.join(" · ") : "Any nearby"}</p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">{weight === null ? "Pending" : `${weight}%`}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {details.length > 0 && (
          <dl className="mt-6 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-stone-600">{label}</dt>
                <dd className="mt-1 font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </main>
  );
}
