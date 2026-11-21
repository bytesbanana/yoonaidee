"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type PlacesLibrary = {
  PlaceAutocompleteElement: new () => HTMLElement;
};

type MapsWindow = Window & {
  google?: { maps?: { importLibrary?: (name: "places") => Promise<PlacesLibrary> } };
  initProfileGoogleMaps?: () => void;
};

type PlaceSelectEvent = Event & {
  placePrediction: { placeId: string };
};

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
let placesLibrary: Promise<PlacesLibrary> | undefined;

function loadPlaces(key: string): Promise<PlacesLibrary> {
  if (!placesLibrary) {
    const browser = window as MapsWindow;
    placesLibrary = new Promise<void>((resolve, reject) => {
      if (browser.google?.maps?.importLibrary) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      const params = new URLSearchParams({ key, loading: "async", callback: "initProfileGoogleMaps" });
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;

      const timeout = window.setTimeout(fail, 15000);
      function fail() {
        window.clearTimeout(timeout);
        delete browser.initProfileGoogleMaps;
        script.remove();
        reject(new Error("Google Maps did not load"));
      }

      script.onerror = fail;
      browser.initProfileGoogleMaps = () => {
        window.clearTimeout(timeout);
        delete browser.initProfileGoogleMaps;
        resolve();
      };
      document.head.append(script);
    }).then(() => {
      const library = browser.google?.maps?.importLibrary?.("places");
      if (!library) throw new Error("Google Places is unavailable");
      return library;
    }).catch((error) => {
      placesLibrary = undefined;
      throw error;
    });
  }

  return placesLibrary;
}

export function GooglePlacePicker({ categoryLabel, onSelect }: {
  categoryLabel: string;
  onSelect: (url: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const choosePlace = useEffectEvent((event: Event) => {
    const { placeId } = (event as PlaceSelectEvent).placePrediction;
    if (!placeId) return;

    const url = new URL("https://www.google.com/maps/search/");
    url.search = new URLSearchParams({ api: "1", query: "Google Maps location", query_place_id: placeId }).toString();
    if (onSelect(url.href)) {
      setFeedback("Location added. Save priorities to keep it.");
      setOpen(false);
    } else {
      setFeedback("This location is already listed or the category has five locations.");
    }
  });

  useEffect(() => {
    const container = host.current;
    if (!open || !container || !mapsKey) return;

    let active = true;
    let picker: HTMLElement | undefined;
    const onPlace = (event: Event) => choosePlace(event);
    const onError = () => {
      if (active) setFeedback("Google Maps search couldn’t load. You can still enter an address or paste a link.");
    };

    void loadPlaces(mapsKey).then(({ PlaceAutocompleteElement }) => {
      if (!active) return;

      picker = new PlaceAutocompleteElement();
      picker.setAttribute("aria-label", `Search Google Maps for ${categoryLabel}`);
      picker.style.width = "100%";
      picker.addEventListener("gmp-select", onPlace);
      picker.addEventListener("gmp-error", onError);
      container.replaceChildren(picker);
      setFeedback("");
    }).catch(onError);

    return () => {
      active = false;
      picker?.removeEventListener("gmp-select", onPlace);
      picker?.removeEventListener("gmp-error", onError);
      picker?.remove();
    };
  }, [categoryLabel, open]);

  if (!mapsKey) {
    return (
      <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium text-emerald-800 underline">
        Open Google Maps to copy a link
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setFeedback(open ? "" : "Loading Google Maps search…");
          setOpen(!open);
        }}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
      >
        <MapPin aria-hidden className="size-4" />
        {open ? "Close Google Maps search" : "Choose from Google Maps"}
      </button>
      {open && <div ref={host} className="mt-2 min-w-0" />}
      {feedback && <p role="status" className="mt-2 text-xs text-stone-600">{feedback}</p>}
    </div>
  );
}
