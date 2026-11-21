import { z } from "zod";
import { DEMO_ZONES } from "./demo-zones";

const dayMs = 86_400_000;
const searchInput = z.object({
  destination: z.string().trim().min(1).max(200),
  budget: z.number().int().positive().max(10_000_000),
  id: z.uuid(),
});

export const monthlySearchSchema = searchInput.extend({ kind: z.literal("monthly") });

const datedSearchSchema = searchInput.extend({
  moveIn: z.iso.date(),
  moveOut: z.iso.date(),
}).refine(({ moveIn, moveOut }) => moveOut > moveIn);

export const savedSearchesSchema = z.array(z.union([datedSearchSchema, monthlySearchSchema]));
export type SavedSearch = z.infer<typeof savedSearchesSchema>[number];

const baht = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export const formatBaht = (amount: number) => baht.format(amount);
export const formatStayDate = (date: string) => dateFormatter.format(new Date(date));
export const stayNights = (moveIn: string, moveOut: string) => (Date.parse(moveOut) - Date.parse(moveIn)) / dayMs;
export const sampleStayRent = (monthlyRent: number, nights: number) => Math.ceil(monthlyRent * nights / 30);
export function compareSampleAreas(nights: number, budget: number) {
  return DEMO_ZONES.map((zone) => {
    const costs = zone.properties.map((property) => sampleStayRent(property.monthlyRentThb, nights));
    return {
      zone,
      from: Math.min(...costs),
      withinBudget: costs.filter((cost) => cost <= budget).length,
    };
  }).sort((a, b) => a.from - b.from);
}

export function directionsUrl(zone: string, destination: string) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${zone}, Bangkok`,
    destination: `${destination}, Bangkok`,
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
