import { z } from "zod";

export const categoryLabels = {
  work: ["Work", "ที่ทำงาน"],
  school: ["School or university", "โรงเรียนหรือมหาวิทยาลัย"],
  daycare: ["Daycare", "ศูนย์ดูแลเด็ก"],
  family: ["Family or partner", "ครอบครัวหรือคนรัก"],
  coworking: ["Coworking space", "พื้นที่ทำงานร่วมกัน"],
  supermarket: ["Supermarket", "ซูเปอร์มาร์เก็ต"],
  market: ["Fresh market", "ตลาดสด"],
  convenienceStore: ["Convenience store", "ร้านสะดวกซื้อ"],
  pharmacy: ["Pharmacy", "ร้านขายยา"],
  laundry: ["Laundry", "ร้านซักรีด"],
  bank: ["Bank or ATM", "ธนาคารหรือตู้เอทีเอ็ม"],
  restaurant: ["Restaurant", "ร้านอาหาร"],
  streetFood: ["Street food or food court", "สตรีทฟู้ดหรือศูนย์อาหาร"],
  cafe: ["Café", "คาเฟ่"],
  nightMarket: ["Night market", "ตลาดกลางคืน"],
  nightlife: ["Nightlife", "สถานบันเทิงกลางคืน"],
  gym: ["Gym", "ยิม"],
  hobby: ["Hobby or activity", "งานอดิเรกหรือกิจกรรม"],
  park: ["Park", "สวนสาธารณะ"],
  sports: ["Sports court or field", "สนามกีฬา"],
  pool: ["Swimming pool", "สระว่ายน้ำ"],
  runningCycling: ["Running or cycling route", "เส้นทางวิ่งหรือปั่นจักรยาน"],
  mall: ["Shopping mall", "ห้างสรรพสินค้า"],
  cinema: ["Cinema", "โรงภาพยนตร์"],
  museum: ["Museum or gallery", "พิพิธภัณฑ์หรือแกลเลอรี"],
  sightseeing: ["Sightseeing or landmark", "สถานที่ท่องเที่ยวหรือแลนด์มาร์ก"],
  library: ["Library", "ห้องสมุด"],
  transit: ["Public transit", "ขนส่งสาธารณะ"],
  expressway: ["Expressway access", "ทางขึ้นทางด่วน"],
  airport: ["Airport", "สนามบิน"],
  hospital: ["Hospital", "โรงพยาบาล"],
  clinic: ["Clinic", "คลินิก"],
  vet: ["Veterinary clinic", "คลินิกสัตวแพทย์"],
  petPark: ["Pet-friendly park", "สวนที่พาสัตว์เลี้ยงเข้าได้"],
  worship: ["Place of worship", "ศาสนสถาน"],
} as const;

export const profileCategoryPresets = ["work", "school", "transit", "supermarket", "restaurant", "gym", "park", "hobby"] as const;

const catalogIds = Object.keys(categoryLabels) as (keyof typeof categoryLabels)[];
export const maxPreferenceCategories = catalogIds.length;
export const maxCustomCategoryNameLength = 60;
export const categoryId = z.union([
  z.enum(catalogIds),
  z.string().max("custom:".length + maxCustomCategoryNameLength).regex(/^custom:[^\s\u0000-\u001F\u007F](?:[^\u0000-\u001F\u007F]*[^\s\u0000-\u001F\u007F])?$/),
]);

export function categoryLabel(category: string, language: "en" | "th" = "en") {
  if (category.startsWith("custom:")) return category.slice("custom:".length);
  return categoryLabels[category as keyof typeof categoryLabels][language === "th" ? 1 : 0];
}

function normalizeCategoryName(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function categoryFromName(value: string) {
  const name = value.normalize("NFC").trim().replace(/\s+/g, " ");
  const normalized = normalizeCategoryName(name);
  return catalogIds.find((id) => categoryLabels[id].some((label) => normalizeCategoryName(label) === normalized))
    ?? `custom:${name}`;
}

export function categoryKey(category: string) {
  return category.startsWith("custom:") ? normalizeCategoryName(categoryFromName(categoryLabel(category))) : normalizeCategoryName(category);
}

const googleMapsLink = /^https:\/\/(?:maps\.app\.goo\.gl\/[^\s]+|goo\.gl\/maps\/[^\s]+|maps\.google\.com[/?][^\s]*|(?:www\.)?google\.com\/maps(?:[/?#][^\s]*)?)$/i;

export function isGoogleMapsLink(value: string) {
  return value.length <= 2048 && googleMapsLink.test(value);
}

export const preferencePlaces = z.array(z.union([
  z.string().trim().min(1).max(120),
  z.string().trim().max(2048).regex(googleMapsLink),
])).max(5);

const preferenceCategory = z.object({
  category: categoryId,
  places: preferencePlaces,
  weight: z.number().int().min(1).max(100).nullable(),
});

export const preferenceCategories = z.array(preferenceCategory).max(maxPreferenceCategories);
export type PreferenceCategory = z.infer<typeof preferenceCategory>;

export function hasCompleteWeights(categories: Pick<PreferenceCategory, "weight">[]) {
  return categories.length > 0
    && categories.every(({ weight }) => weight !== null)
    && categories.reduce((sum, { weight }) => sum + (weight ?? 0), 0) === 100;
}

export function suggestWeights(categories: PreferenceCategory[]) {
  const allocated = categories.reduce((sum, { weight }) => sum + (weight ?? 0), 0);
  const missing = categories.filter(({ weight }) => weight === null).length;
  const remaining = 100 - allocated;
  const keepExisting = missing > 0 && remaining >= missing;
  const total = keepExisting ? remaining : 100;
  const count = keepExisting ? missing : categories.length;
  let extra = total % count;
  return categories.map((category) => {
    if (keepExisting && category.weight !== null) return category;
    const weight = Math.floor(total / count) + (extra > 0 ? 1 : 0);
    extra -= 1;
    return { ...category, weight };
  });
}
