import { formatTransport } from "@/lib/preferences/display";
import { normalizeLocation } from "@/lib/preferences/locations";
import type { AnalysisResult } from "./result";

export function formatAnalysisLabel(value: string) {
  return normalizeLocation(value.replace(/[_-]/g, " "));
}

export function formatCommuteSource(source: string) {
  return /^[a-z0-9_-]+$/i.test(source) ? formatAnalysisLabel(source) : source;
}

export function analysisDisplayText(result: AnalysisResult) {
  return result.recommendations.flatMap((zone) => [
    zone.zoneName,
    zone.reasoning,
    ...zone.pros,
    ...zone.cons,
    ...zone.nearbyPlaces.map(({ name }) => name),
    ...Object.entries(zone.scores ?? {}).flatMap(([name, score]) => score === null ? [] : [formatAnalysisLabel(name)]),
    zone.commute?.mode && formatTransport(zone.commute.mode),
    zone.commute?.source && formatCommuteSource(zone.commute.source),
  ]);
}
