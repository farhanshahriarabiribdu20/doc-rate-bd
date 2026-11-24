import { deriveFromZones, rateForRegion } from './zones.js';

// Quality grade shown as a badge on a chick rate. Missing grade = 'A' (the original behaviour).
export const GRADES = ['A', 'B', 'C', 'none'];

export const GRADE_STYLE = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-amber-500 text-white',
  C: 'bg-slate-500 text-white'
};

export const normalizeGrade = (g) => (GRADES.includes(g) ? g : 'A');

// ---- grade split from the "Master Grades" Excel: A / M / B+ ----------------------------
// item.gradeRates = { A: { zoneId: rate }, M: {...}, 'B+': {...} }  (only the filled cells)
// The site shows three grades. The plain "B" column of the Excel is not imported or shown.
export const MASTER_GRADES = ['A', 'M', 'B+'];
export const IGNORED_GRADES = ['B'];

export const hasGradeRates = (item) => Boolean(item?.gradeRates && MASTER_GRADES.some((g) => item.gradeRates[g] && Object.keys(item.gradeRates[g]).length));

/** Rate of one grade for a region ('all', a division id or a zone id); null when the item has no rate for that grade. */
export function gradeRateFor(item, grade, region) {
  const zones = item?.gradeRates?.[grade];
  if (!zones || !Object.keys(zones).length) return null;
  const { divisionRates, todayRate } = deriveFromZones(zones);
  if (!todayRate) return null;
  return rateForRegion({ todayRate, divisionRates, zoneRates: zones }, region);
}
