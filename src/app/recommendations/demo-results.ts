import { DEMO_ZONES } from "./demo-zones";

export const CURRENT_RESULT = {
  date: "2026-11-21",
  version: 3,
  focus: "Balanced Commute and Lifestyle",
  zones: DEMO_ZONES,
};

const PAST_RESULTS = [
  {
    date: "2026-11-14",
    version: 2,
    focus: "Shorter Commute",
    rankedZones: ["sathorn", "phra-khanong", "on-nut", "ari", "lat-phrao"],
  },
  {
    date: "2026-11-07",
    version: 1,
    focus: "Lower Monthly Rent",
    rankedZones: ["on-nut", "lat-phrao", "phra-khanong", "ari", "sathorn"],
  },
];

export const RESULT_HISTORY = PAST_RESULTS.map(({ rankedZones, ...result }) => ({
  ...result,
  zones: rankedZones.map((slug) => {
    const zone = DEMO_ZONES.find((zone) => zone.slug === slug);
    if (!zone) throw new Error(`Unknown demo zone: ${slug}`);
    return zone;
  }),
}));

export function findPastResult(version: string | string[] | undefined) {
  return RESULT_HISTORY.find((result) => String(result.version) === version);
}

export function formatResultDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(date));
}
