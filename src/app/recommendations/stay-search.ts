import { z } from "zod";
import { DEMO_ZONES } from "./demo-zones";

const dayMs = 86_400_000;

export const stayPlanSchema = z.object({
  destination: z.string().trim().min(1, "Enter a work location or area.").max(200),
  moveIn: z.iso.date({ error: "Enter a move-in date." }),
  moveOut: z.iso.date({ error: "Enter a move-out date." }),
  budget: z.number().int().positive("Enter a total rent budget.").max(10_000_000),
}).refine(({ moveIn, moveOut }) => moveOut > moveIn, {
  path: ["moveOut"],
  message: "Move-out must be after move-in.",
});

export const savedSearchSchema = stayPlanSchema.safeExtend({ id: z.uuid() });
export const savedSearchesSchema = z.array(savedSearchSchema);
export type StayPlan = z.infer<typeof stayPlanSchema>;
export type SavedSearch = z.infer<typeof savedSearchSchema>;

const baht = new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const bangkokDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" });

export const formatBaht = (amount: number) => baht.format(amount);
export const formatStayDate = (date: string) => dateFormatter.format(new Date(date));
export const stayNights = (moveIn: string, moveOut: string) => (Date.parse(moveOut) - Date.parse(moveIn)) / dayMs;
export const sampleStayRent = (monthlyRent: number, nights: number) => Math.ceil(monthlyRent * nights / 30);
export const todayInBangkok = () => bangkokDate.format(new Date());

export function samplePlan(): StayPlan {
  const start = Date.parse(todayInBangkok()) + dayMs;
  const moveIn = new Date(start).toISOString().slice(0, 10);
  const moveOut = new Date(start + 42 * dayMs).toISOString().slice(0, 10);
  return { destination: "Asok BTS Station", moveIn, moveOut, budget: 24_000 };
}

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
