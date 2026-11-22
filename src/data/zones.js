// The 20 trade zones used in the "Competitors DOC Rate" Excel, and how they roll up into the
// 8 divisions shown on the website.
//
// Faridpur & Gopalgonj are in the Dhaka division geographically, but the trade (and the Excel)
// treats them as South zone and their rates follow the South, so they are grouped with Khulna.
// Change the `division` of a zone below if that ever needs to be different.

export const ZONES = [
  { id: 'narayanganj', en: 'Narayanganj', bn: 'নারায়ণগঞ্জ', group: 'central', division: 'dhaka' },
  { id: 'gazipur', en: 'Gazipur', bn: 'গাজীপুর', group: 'central', division: 'dhaka' },
  { id: 'narsingdi', en: 'Narsingdi', bn: 'নরসিংদী', group: 'central', division: 'dhaka' },
  { id: 'tangail', en: 'Tangail', bn: 'টাঙ্গাইল', group: 'central', division: 'dhaka' },
  { id: 'kishoreganj', en: 'Kishoreganj', bn: 'কিশোরগঞ্জ', group: 'central', division: 'dhaka' },
  { id: 'mymensingh', en: 'Mymensingh', bn: 'ময়মনসিংহ', group: 'central', division: 'mymensingh' },
  { id: 'cumilla', en: 'Cumilla', bn: 'কুমিল্লা', group: 'east', division: 'chittagong' },
  { id: 'noakhali', en: 'Noakhali', bn: 'নোয়াখালী', group: 'east', division: 'chittagong' },
  { id: 'chattogram', en: 'Chattogram', bn: 'চট্টগ্রাম', group: 'east', division: 'chittagong' },
  { id: 'sylhet', en: 'Sylhet', bn: 'সিলেট', group: 'east', division: 'sylhet' },
  { id: 'faridpur', en: 'Faridpur', bn: 'ফরিদপুর', group: 'south', division: 'khulna' },
  { id: 'gopalgonj', en: 'Gopalgonj', bn: 'গোপালগঞ্জ', group: 'south', division: 'khulna' },
  { id: 'jhenaidah', en: 'Jhenaidah', bn: 'ঝিনাইদহ', group: 'south', division: 'khulna' },
  { id: 'khulna', en: 'Khulna', bn: 'খুলনা', group: 'south', division: 'khulna' },
  { id: 'barishal', en: 'Barishal', bn: 'বরিশাল', group: 'south', division: 'barisal' },
  { id: 'bogura', en: 'Bogura', bn: 'বগুড়া', group: 'north', division: 'rajshahi' },
  { id: 'rajshahi', en: 'Rajshahi', bn: 'রাজশাহী', group: 'north', division: 'rajshahi' },
  { id: 'sirajgonj', en: 'Sirajgonj', bn: 'সিরাজগঞ্জ', group: 'north', division: 'rajshahi' },
  { id: 'rangpur', en: 'Rangpur', bn: 'রংপুর', group: 'north', division: 'rangpur' },
  { id: 'dinajpur', en: 'Dinajpur', bn: 'দিনাজপুর', group: 'north', division: 'rangpur' }
];

export const ZONE_GROUPS = [
  { id: 'central', bn: 'সেন্ট্রাল জোন', en: 'Central Zone' },
  { id: 'east', bn: 'ইস্ট জোন', en: 'East Zone' },
  { id: 'south', bn: 'সাউথ জোন', en: 'South Zone' },
  { id: 'north', bn: 'নর্থ জোন', en: 'North Zone' }
];

export const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z.id, z]));

// Spelling variants seen in Excel sheets -> zone id
const ZONE_ALIASES = {
  chittagong: 'chattogram', ctg: 'chattogram', comilla: 'cumilla', gopalganj: 'gopalgonj',
  barisal: 'barishal', bogra: 'bogura', sirajganj: 'sirajgonj', jessore: 'jhenaidah', jenaidah: 'jhenaidah'
};

export const zoneIdFromName = (name) => {
  const key = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!key) return null;
  if (ZONES.some((z) => z.id === key)) return key;
  return ZONE_ALIASES[key] || null;
};

// When a division has a zone named after its headquarters, that zone's rate is the division's rate
// (e.g. "Chattogram division" = the Chattogram zone, not the average with Cumilla/Noakhali).
const DIVISION_HQ = {
  chittagong: 'chattogram', sylhet: 'sylhet', khulna: 'khulna', barisal: 'barishal',
  rajshahi: 'rajshahi', rangpur: 'rangpur', mymensingh: 'mymensingh'
};

export const DIVISION_ORDER = ['dhaka', 'chittagong', 'rajshahi', 'rangpur', 'khulna', 'sylhet', 'mymensingh', 'barisal'];

const valid = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

/**
 * { zoneId: rate } -> { divisionRates, todayRate }.
 * Divisions without any zone rate are left out (the site then falls back to the national rate).
 * todayRate is the national average of the divisions, the same meaning it has everywhere else.
 */
export function deriveFromZones(zoneRates) {
  const divisionRates = {};
  for (const d of DIVISION_ORDER) {
    const hq = DIVISION_HQ[d];
    if (hq && valid(zoneRates[hq])) {
      divisionRates[d] = Number(zoneRates[hq]);
      continue;
    }
    const vals = ZONES.filter((z) => z.division === d && valid(zoneRates[z.id])).map((z) => Number(zoneRates[z.id]));
    if (vals.length) divisionRates[d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  const ds = Object.values(divisionRates);
  const todayRate = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
  return { divisionRates, todayRate };
}

/**
 * The rate an item has for a region. `region` is 'all', a division id or a zone id.
 * A zone uses its own rate when the item has one, otherwise the rate of the division it belongs to,
 * otherwise the national rate.
 */
export function rateForRegion(item, region) {
  if (!region || region === 'all') return item.todayRate;
  const zone = ZONE_BY_ID[region];
  if (zone) {
    if (valid(item.zoneRates?.[zone.id])) return Number(item.zoneRates[zone.id]);
    if (valid(item.divisionRates?.[zone.division])) return Number(item.divisionRates[zone.division]);
    return item.todayRate;
  }
  return valid(item.divisionRates?.[region]) ? Number(item.divisionRates[region]) : item.todayRate;
}

/** Drop the item's own zone rates for the given division (or all of them) so the division rate applies again. */
export function clearZoneRates(item, divisionId) {
  if (!item.zoneRates) return item;
  const rest = {};
  for (const z of ZONES) {
    if (item.zoneRates[z.id] !== undefined && divisionId && divisionId !== 'all' && z.division !== divisionId) rest[z.id] = item.zoneRates[z.id];
  }
  return { ...item, zoneRates: rest };
}

/** "সেন্ট্রাল জোন (গাজীপুর)" for a zone id; null for anything else. */
export function zoneRegionName(region, lang = 'bn') {
  const z = ZONE_BY_ID[region];
  if (!z) return null;
  const g = ZONE_GROUPS.find((x) => x.id === z.group);
  return lang === 'bn' ? `${g.bn} (${z.bn})` : `${g.en} (${z.en})`;
}
