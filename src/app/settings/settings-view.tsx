"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "../profile/profile-view";
import { useLiff } from "../providers/LiffProvider";
import { hasCompleteWeights, type PreferenceCategory } from "@/lib/preferences/categories";
import { formatHousingType, formatPriorityCategory, formatPriorityLocation, formatTransport } from "@/lib/preferences/display";
import { normalizeLocation } from "@/lib/preferences/locations";

type Settings = {
  sessionId: string;
  version: number;
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

function lineAuthHeaders(liff: ReturnType<typeof useLiff>["liffObject"]): Record<string, string> | null {
  const idToken = liff?.getIDToken();
  if (idToken) return { Authorization: `Bearer ${idToken}` };
  const accessToken = liff?.getAccessToken();
  if (accessToken) return { Authorization: `Bearer ${accessToken}`, "X-Line-Token-Type": "access" };
  return null;
}

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
        const headers = lineAuthHeaders(liff);
        const lineProfile = showProfile ? liff.getProfile().catch(() => null) : null;
        if (!headers) {
          if (showProfile) {
            update({ status: "loaded", settings: null, profile: await lineProfile });
          } else {
            update({ status: "error", message: "Sign in with LINE again to load your preferences." });
          }
          return;
        }
        const [response, profile] = await Promise.all([
          fetch("/api/settings", {
            headers,
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
  const preferredModes = settings?.preferredModes.map(formatTransport).filter(Boolean);
  const transport = preferredModes?.join(", ") || (settings?.transport && formatTransport(settings.transport));
  const housingDetails: [string, string | null | undefined][] = [
    ["Destination", settings?.destination && normalizeLocation(settings.destination)],
    ["Monthly Rent Ceiling", settings?.budget ? `฿${settings.budget.toLocaleString("en-TH")}` : null],
    ["Transport", transport],
    ["Housing Types", settings?.housing.map(formatHousingType).filter(Boolean).join(", ")],
  ];
  const signIn = () => liffObject?.login({ redirectUri: window.location.href });
  if (showProfile) {
    const message = liffError ? "Open this page from LINE to load your saved priorities."
      : view.status === "loading" ? "Loading your saved priorities…"
        : view.status === "error" ? view.message
          : view.status === "sign-in" ? "Sign in to see your saved priorities."
            : undefined;
    return (
      <ProfileView
        profile={profile}
        priorities={settings}
        details={housingDetails}
        message={message}
        signIn={view.status === "sign-in" ? signIn : undefined}
        getAuthHeaders={() => lineAuthHeaders(liffObject)}
        reload={() => window.location.reload()}
      />
    );
  }

  const details = housingDetails.filter(([, value]) => value);

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-900 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-3 text-sm font-semibold text-emerald-800">Yoo Nai Dee</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Housing preferences</h1>
        <p className="mt-3 text-sm text-stone-600">Update your preferences in the Yoo Nai Dee LINE chat.</p>

        {liffError && <p className="mt-8 rounded-xl bg-white p-5" role="alert">Could not start LINE sign-in.</p>}
        {!liffError && view.status === "loading" && <p className="mt-8" role="status">Loading your preferences…</p>}
        {view.status === "error" && <p className="mt-8 rounded-xl bg-white p-5" role="alert">{view.message}</p>}
        {view.status === "sign-in" && (
          <button
            className="mt-8 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900"
            onClick={signIn}
          >
            Sign in with LINE
          </button>
        )}

        {view.status === "loaded" && categories.length === 0 && details.length === 0 && (
          <p className="mt-8 rounded-xl bg-white p-5">No housing preferences saved yet. Tell us what you’re looking for in the Yoo Nai Dee LINE chat.</p>
        )}
        {categories.length > 0 && (
          <section aria-labelledby="priorities" className="mt-8 rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-5 py-4">
              <h2 id="priorities" className="text-lg font-semibold">Location priorities</h2>
              <span className={complete ? "text-sm font-semibold text-emerald-800" : "text-sm font-medium text-amber-800"}>
                {total}% {complete ? "total" : "allocated · in progress"}
              </span>
            </div>
            <ul className="divide-y divide-stone-100">
              {categories.map(({ category, places, weight }) => (
                <li key={category} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-medium">{formatPriorityCategory(category)}</p>
                    <p className="mt-1 text-sm text-stone-600">{places.length ? places.map(formatPriorityLocation).join(" · ") : "Any Nearby"}</p>
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
