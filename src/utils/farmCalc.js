// Pure helpers + reference tables for the farm tools. Reference figures are typical/approximate
// (broiler catalogue-style targets); real results depend on breed, season and management.

export const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---- Broiler reference by age (days): body weight kg, cumulative FCR, feed g/bird/day ----
export const BROILER_REF = [
  { day: 7, weight: 0.19, fcr: 0.9 },
  { day: 14, weight: 0.49, fcr: 1.1 },
  { day: 21, weight: 0.95, fcr: 1.25 },
  { day: 28, weight: 1.55, fcr: 1.4 },
  { day: 35, weight: 2.2, fcr: 1.55 },
  { day: 42, weight: 2.85, fcr: 1.7 }
];

// feed per bird per day (g) for each week of age
export const BROILER_DAILY_G = [20, 55, 95, 135, 170, 200];

export const refFcrAt = (day) => {
  const d = Math.max(1, n(day));
  if (d <= BROILER_REF[0].day) return BROILER_REF[0].fcr;
  for (let i = 1; i < BROILER_REF.length; i++) {
    const a = BROILER_REF[i - 1];
    const b = BROILER_REF[i];
    if (d <= b.day) return a.fcr + ((b.fcr - a.fcr) * (d - a.day)) / (b.day - a.day);
  }
  return BROILER_REF[BROILER_REF.length - 1].fcr;
};

/** Cumulative feed (kg) one bird eats up to and including `day`. */
export const cumulativeFeedKg = (day) => {
  let g = 0;
  for (let d = 1; d <= Math.floor(n(day)); d++) g += BROILER_DAILY_G[Math.min(5, Math.floor((d - 1) / 7))];
  return g / 1000;
};

/** FCR from total feed and live weight sold/present. */
export const fcrOf = (feedKg, totalWeightKg) => (n(totalWeightKg) > 0 ? n(feedKg) / n(totalWeightKg) : 0);

/** Feed plan: kg and 50kg bags needed per week for `chicks` birds up to `targetDay`. */
export const feedPlan = (chicks, targetDay) => {
  const rows = [];
  let total = 0;
  const days = Math.max(0, Math.floor(n(targetDay)));
  for (let w = 0; w * 7 < days; w++) {
    const daysInWeek = Math.min(7, days - w * 7);
    const kg = (n(chicks) * BROILER_DAILY_G[Math.min(5, w)] * daysInWeek) / 1000;
    total += kg;
    rows.push({ week: w + 1, perDayKg: (n(chicks) * BROILER_DAILY_G[Math.min(5, w)]) / 1000, kg, bags: kg / 50 });
  }
  return { rows, totalKg: total, totalBags: total / 50 };
};

// ---- Shed space ----
export const SPACE_PER_BIRD_SQFT = { broiler: 1.0, sonali: 1.5, layer: 2.0, breeder: 3.0 };

export function shedCapacity({ lengthFt, widthFt, type, summer }) {
  const area = n(lengthFt) * n(widthFt);
  const per = (SPACE_PER_BIRD_SQFT[type] || 1) * (summer ? 1.2 : 1); // give more room in summer
  const birds = per > 0 ? Math.floor(area / per) : 0;
  return {
    area,
    perBirdSqft: per,
    birds,
    feeders: Math.ceil(birds / 40), // hanging/tray feeders
    bellDrinkers: Math.ceil(birds / 80),
    nipples: Math.ceil(birds / 10),
    brooderAreaSqft: Math.round(birds * 0.3) // first-week brooding area
  };
}

// ---- Vaccine schedule (common practice in Bangladesh; confirm with a vet / company) ----
export const VACCINES = {
  broiler: [
    { day: 1, name: 'মারেক্স (হ্যাচারিতে)', note: 'সাধারণত হ্যাচারিতে দেওয়া থাকে' },
    { day: 4, name: 'রাণীক্ষেত + আইবি (BCRDV/B1)', note: 'চোখে/নাকে ড্রপ' },
    { day: 10, name: 'গামবোরো (IBD) ১ম ডোজ', note: 'পানিতে' },
    { day: 17, name: 'গামবোরো (IBD) বুস্টার', note: 'পানিতে' },
    { day: 21, name: 'রাণীক্ষেত (ল্যাসোটা) বুস্টার', note: 'পানিতে' }
  ],
  sonali: [
    { day: 1, name: 'মারেক্স (হ্যাচারিতে)', note: 'সাধারণত হ্যাচারিতে দেওয়া থাকে' },
    { day: 5, name: 'রাণীক্ষেত + আইবি (BCRDV/B1)', note: 'চোখে/নাকে ড্রপ' },
    { day: 11, name: 'গামবোরো (IBD) ১ম ডোজ', note: 'পানিতে' },
    { day: 18, name: 'গামবোরো (IBD) বুস্টার', note: 'পানিতে' },
    { day: 22, name: 'রাণীক্ষেত (ল্যাসোটা) বুস্টার', note: 'পানিতে' },
    { day: 35, name: 'ফাউল পক্স', note: 'উইং-ওয়েব' },
    { day: 42, name: 'রাণীক্ষেত (R2B/ল্যাসোটা)', note: 'পানিতে/ইনজেকশন' }
  ],
  layer: [
    { day: 1, name: 'মারেক্স (হ্যাচারিতে)', note: 'সাধারণত হ্যাচারিতে দেওয়া থাকে' },
    { day: 5, name: 'রাণীক্ষেত + আইবি (BCRDV/B1)', note: 'চোখে/নাকে ড্রপ' },
    { day: 11, name: 'গামবোরো (IBD) ১ম ডোজ', note: 'পানিতে' },
    { day: 18, name: 'গামবোরো (IBD) বুস্টার', note: 'পানিতে' },
    { day: 22, name: 'রাণীক্ষেত (ল্যাসোটা) বুস্টার', note: 'পানিতে' },
    { day: 35, name: 'ফাউল পক্স', note: 'উইং-ওয়েব' },
    { day: 56, name: 'রাণীক্ষেত (R2B) + আইবি', note: 'ইনজেকশন/পানিতে' },
    { day: 84, name: 'কলেরা / করাইজা', note: 'পশুচিকিৎসকের পরামর্শে' },
    { day: 112, name: 'রাণীক্ষেত + আইবি + ইডিএস (কিল্ড)', note: 'ডিম পাড়ার আগে, ইনজেকশন' }
  ]
};

export const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d;
};
export const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const daysBetween = (fromIso, toIso) =>
  Math.round((new Date(`${toIso}T00:00:00`) - new Date(`${fromIso}T00:00:00`)) / 86400000);

/** Vaccine rows with calendar date and days-from-today; `day` is the age in days where day 1 = hatch/arrival date. */
export function vaccineRows(hatchIso, type, todayIso = isoToday()) {
  return (VACCINES[type] || []).map((v) => {
    const date = addDays(hatchIso, v.day - 1);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { ...v, date, iso, inDays: daysBetween(todayIso, iso) };
  });
}

// ---- Brooding guide: temperature by age ----
export const BROODING = [
  { from: 0, to: 7, tempC: [32, 35], humidity: '60-70%', lightH: 23 },
  { from: 8, to: 14, tempC: [29, 32], humidity: '55-65%', lightH: 20 },
  { from: 15, to: 21, tempC: [26, 29], humidity: '50-60%', lightH: 18 },
  { from: 22, to: 28, tempC: [23, 26], humidity: '50-60%', lightH: 16 },
  { from: 29, to: 99, tempC: [21, 23], humidity: '50-60%', lightH: 16 }
];
export const brooderFor = (age) => BROODING.find((b) => n(age) >= b.from && n(age) <= b.to) || BROODING[BROODING.length - 1];
export const cToF = (c) => Math.round((c * 9) / 5 + 32);

// ---- Profit + sensitivity ----
export function batchProfit({ chicks, chickPrice, feedBagPrice, feedPerBirdKg, medPerBird, mortalityPct, weightKg, salePerKg }) {
  const c = n(chicks);
  const invest = c * n(chickPrice) + c * n(feedPerBirdKg) * (n(feedBagPrice) / 50) + c * n(medPerBird);
  const alive = c * (1 - n(mortalityPct) / 100);
  const kg = alive * n(weightKg);
  const revenue = kg * n(salePerKg);
  return { invest, kg, revenue, profit: revenue - invest, breakEvenPerKg: kg > 0 ? invest / kg : 0 };
}

// ---- Layer ----
export function layerDaily({ birds, henDayPct, eggPrice, feedG, feedBagPrice, otherPerBird }) {
  const eggs = (n(birds) * n(henDayPct)) / 100;
  const revenue = eggs * n(eggPrice);
  const feedCost = ((n(birds) * n(feedG)) / 1000) * (n(feedBagPrice) / 50);
  const other = n(birds) * n(otherPerBird);
  const cost = feedCost + other;
  return { eggs, revenue, feedCost, other, cost, profit: revenue - cost, costPerEgg: eggs > 0 ? cost / eggs : 0 };
}

// ---- Feed mix ----
// protein %, energy kcal ME/kg (typical values)
export const INGREDIENTS = {
  maize: { name: 'ভুট্টা', cp: 8.5, me: 3350 },
  sbm: { name: 'সয়াবিন মিল', cp: 44, me: 2300 },
  ricePolish: { name: 'রাইস পলিশ', cp: 12, me: 2800 },
  riceBran: { name: 'চালের কুঁড়া', cp: 12.5, me: 2400 },
  fishMeal: { name: 'ফিশ মিল', cp: 55, me: 2800 },
  mbm: { name: 'মিট-বোন মিল', cp: 45, me: 2400 },
  concentrate: { name: 'প্রোটিন কনসেনট্রেট', cp: 50, me: 2600 },
  oil: { name: 'সয়াবিন তেল', cp: 0, me: 8800 },
  dcp: { name: 'ডিসিপি', cp: 0, me: 0 },
  limestone: { name: 'পাথর গুঁড়া (লাইমস্টোন)', cp: 0, me: 0 },
  salt: { name: 'লবণ', cp: 0, me: 0 },
  premix: { name: 'প্রিমিক্স', cp: 0, me: 0 }
};

export const FEED_TARGETS = {
  starter: { label: 'স্টার্টার (১–১০ দিন)', cp: [21, 23], me: [2950, 3050] },
  grower: { label: 'গ্রোয়ার (১১–২৪ দিন)', cp: [19, 21], me: [3050, 3150] },
  finisher: { label: 'ফিনিশার (২৫+ দিন)', cp: [17, 19], me: [3150, 3250] }
};

export function feedMix(rows) {
  const total = rows.reduce((s, r) => s + n(r.pct), 0);
  let cp = 0;
  let me = 0;
  let cost = 0;
  rows.forEach((r) => {
    const ing = INGREDIENTS[r.key];
    if (!ing) return;
    cp += (n(r.pct) * ing.cp) / 100;
    me += (n(r.pct) * ing.me) / 100;
    cost += (n(r.pct) * n(r.price)) / 100;
  });
  return { total, cp, me, costPerKg: cost, costPerBag: cost * 50 };
}

// ---- Mortality loss ----
/** deaths: array of { day, count }. Cost of a dead bird = chick + feed eaten until then + medicine. */
export function mortalityLoss({ chicks, chickPrice, feedPricePerKg, medPerBird, deaths }) {
  let dead = 0;
  let loss = 0;
  (deaths || []).forEach((d) => {
    const c = n(d.count);
    dead += c;
    const per = n(chickPrice) + cumulativeFeedKg(d.day) * n(feedPricePerKg) + n(medPerBird) * Math.min(1, n(d.day) / 42);
    loss += c * per;
  });
  const mortalityPct = n(chicks) > 0 ? (dead / n(chicks)) * 100 : 0;
  const survivors = Math.max(0, n(chicks) - dead);
  return { dead, loss, mortalityPct, lossPerSurvivor: survivors > 0 ? loss / survivors : 0 };
}
