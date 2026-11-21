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

export const categoryId = z.enum(Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]);

const preferenceCategory = z.object({
  category: categoryId,
  places: z.array(z.string().trim().min(1).max(120)).max(5),
  weight: z.number().int().min(1).max(100).nullable(),
});

export const preferenceCategories = z.array(preferenceCategory).max(categoryId.options.length);
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
