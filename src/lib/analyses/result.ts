import { z } from "zod";

const httpUrl = z.url({ protocol: /^https?$/ });
const namedEvidence = z.object({ name: z.string().min(1) });

const property = z.object({
  title: z.string().min(1),
  rentPrice: z.number().nonnegative().nullish(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
  listingUrl: httpUrl.nullish(),
});

function validItems<T extends z.ZodType>(schema: T) {
  return z.array(z.unknown()).default([]).transform((items) =>
    items.flatMap((item) => {
      const parsed = schema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  );
}

const zone = z.object({
  zoneId: z.string().min(1),
  zoneName: z.string().min(1),
  rank: z.number().int().positive().nullish(),
  overallScore: z.number().nullish(),
  scores: z.record(z.string(), z.number().nullable()).nullish(),
  reasoning: z.string().nullish(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  commute: z.object({
    mode: z.string().nullish(),
    minutes: z.number().nonnegative().nullish(),
    source: z.string().nullish(),
  }).nullish(),
  nearbyPlaces: validItems(namedEvidence),
  properties: validItems(property),
});

export const resultSchema = z.object({
  recommendations: z.array(zone),
  dataLimitations: z.array(z.string()).default([]),
});

export type AnalysisResult = z.output<typeof resultSchema>;
export type ZoneResult = z.output<typeof zone>;
export type AnalysisSummary = { id: string; createdAt: string; destination: string | null };
export type SavedAnalysis = AnalysisSummary & { result: AnalysisResult };
