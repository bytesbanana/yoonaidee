"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, MapPin, Wallet } from "lucide-react";
import { useLiff } from "../providers/LiffProvider";
import { lineAuthHeaders } from "@/lib/line/liff-auth";
import { formatBaht, samplePlan, sampleStayRent, stayNights, stayPlanSchema, todayInBangkok, type StayPlan } from "./stay-search";

const inputClass = "min-h-12 w-full rounded-xl border border-[#aebcb0] bg-white px-3 text-base text-[#172c24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#164334]";

export function StayForm({ initial, onSearch, onCancel }: {
  initial?: Partial<StayPlan>;
  onSearch: (plan: StayPlan) => void;
  onCancel?: () => void;
}) {
  const { liffObject } = useLiff();
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [moveIn, setMoveIn] = useState(initial?.moveIn ?? "");
  const [moveOut, setMoveOut] = useState(initial?.moveOut ?? "");
  const [budget, setBudget] = useState(initial?.budget?.toString() ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);
  const [lineMessage, setLineMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const pendingImport = useRef<AbortController | null>(null);
  const nightCount = stayNights(moveIn, moveOut);

  useEffect(() => () => pendingImport.current?.abort(), []);

  async function importLineDetails() {
    const headers = lineAuthHeaders(liffObject);
    if (!headers) {
      setLineMessage("Sign in to LINE again to reuse your preferences.");
      return;
    }

    const controller = new AbortController();
    pendingImport.current = controller;
    setImporting(true);
    setLineMessage("");
    try {
      const response = await fetch("/api/settings", {
        headers, cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Settings unavailable");
      const { settings } = await response.json();
      if (!settings?.destination && !settings?.budget) {
        setLineMessage("No saved destination or rent budget in LINE yet.");
        return;
      }
      if (settings.destination) {
        setDestination((current) => current.trim() ? current : settings.destination);
      }
      if (settings.budget) setMonthlyBudget(settings.budget);
      setLineMessage("Saved LINE preferences loaded.");
    } catch {
      if (!controller.signal.aborted) setLineMessage("Couldn’t load your LINE preferences. Try again.");
    } finally {
      if (!controller.signal.aborted) setImporting(false);
    }
  }

  function useExample() {
    const example = samplePlan();
    setDestination(example.destination);
    setMoveIn(example.moveIn);
    setMoveOut(example.moveOut);
    setBudget(String(example.budget));
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = stayPlanSchema.safeParse({ destination, moveIn, moveOut, budget: Number(budget) });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onSearch(result.data);
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-3xl border border-[#dce3d9] bg-white p-5 sm:p-7" aria-labelledby="stay-form-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="stay-form-heading" className="font-serif text-2xl tracking-tight">{onCancel ? "Edit your stay" : "Your stay details"}</h2>
        <button type="button" onClick={useExample} className="min-h-11 text-sm font-semibold text-[#164334] underline underline-offset-4">
          Fill in an example
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="min-w-0 space-y-1.5 text-sm font-medium">
          <span className="flex items-center gap-2"><MapPin aria-hidden="true" className="size-4" /> Work location or area</span>
          <input required maxLength={200} value={destination} onChange={(event) => setDestination(event.target.value)}
            placeholder="e.g. Asok BTS Station" className={inputClass} />
        </label>

        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2">
          <label className="min-w-0 space-y-1.5 text-sm font-medium">
            <span className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4" /> Move in</span>
            <input required type="date" value={moveIn} min={onCancel && initial?.moveIn ? undefined : todayInBangkok()}
              onChange={(event) => setMoveIn(event.target.value)} className={inputClass} />
          </label>
          <label className="min-w-0 space-y-1.5 text-sm font-medium">
            <span className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4" /> Move out</span>
            <input required type="date" value={moveOut} min={moveIn || todayInBangkok()}
              onChange={(event) => setMoveOut(event.target.value)} className={inputClass} />
          </label>
        </div>

        <label className="min-w-0 space-y-1.5 text-sm font-medium">
          <span className="flex items-center gap-2"><Wallet aria-hidden="true" className="size-4" /> Total rent budget (THB)</span>
          <input required type="number" inputMode="numeric" min={1} max={10_000_000} value={budget}
            onChange={(event) => setBudget(event.target.value)} placeholder="e.g. 24000" className={inputClass} />
        </label>
      </div>

      {(liffObject?.isLoggedIn() || monthlyBudget) && (
        <div className="mt-3">
          <button type="button" disabled={importing} onClick={importLineDetails}
            className="min-h-11 text-sm font-semibold text-[#164334] underline underline-offset-4 disabled:opacity-60">
            {importing ? "Loading LINE preferences…" : "Use saved LINE preferences"}
          </button>
          {lineMessage && <p role="status" className="text-sm text-[#52645a]">{lineMessage}</p>}
          {monthlyBudget && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 text-sm">
              <span>Saved rent ceiling {formatBaht(monthlyBudget)} per month</span>
              <button type="button" disabled={!(nightCount > 0)} onClick={() => setBudget(String(Math.min(10_000_000, sampleStayRent(monthlyBudget, nightCount))))}
                className="min-h-11 font-semibold text-[#164334] underline underline-offset-4 disabled:text-[#52645a]">
                {nightCount > 0 ? "Apply to these dates" : "Enter dates to use this budget"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm font-medium text-red-800">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#164334] px-5 text-sm font-semibold text-white hover:bg-[#225a47] sm:flex-none">
          Compare sample areas <ArrowRight aria-hidden="true" className="size-4" />
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-[#aebcb0] px-4 text-sm font-semibold">Cancel</button>}
      </div>
      <p className="mt-3 text-xs text-[#52645a]">Searches are saved in this browser.</p>
    </form>
  );
}
