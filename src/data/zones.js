// The 20 trade zones used in the "Competitors DOC Rate" Excel, and how they roll up into the
// 8 divisions shown on the website.
//
// Faridpur & Gopalgonj are in the Dhaka division geographically, but the trade (and the Excel)
// treats them as South zone and their rates follow the South, so they are grouped with Khulna.
// Change the `division` of a zone below if that ever needs to be different.

export const ZONES = [
  { id: 'narayanganj', en: 'Narayanganj', division: 'dhaka' },
  { id: 'gazipur', en: 'Gazipur', division: 'dhaka' },
  { id: 'narsingdi', en: 'Narsingdi', division: 'dhaka' },
  { id: 'tangail', en: 'Tangail', division: 'dhaka' },
  { id: 'kishoreganj', en: 'Kishoreganj', division: 'dhaka' },
  { id: 'mymensingh', en: 'Mymensingh', division: 'mymensingh' },
  { id: 'cumilla', en: 'Cumilla', division: 'chittagong' },
  { id: 'noakhali', en: 'Noakhali', division: 'chittagong' },
  { id: 'chattogram', en: 'Chattogram', division: 'chittagong' },
  { id: 'sylhet', en: 'Sylhet', division: 'sylhet' },
  { id: 'faridpur', en: 'Faridpur', division: 'khulna' },
  { id: 'gopalgonj', en: 'Gopalgonj', division: 'khulna' },
  { id: 'jhenaidah', en: 'Jhenaidah', division: 'khulna' },
  { id: 'khulna', en: 'Khulna', division: 'khulna' },
  { id: 'barishal', en: 'Barishal', division: 'barisal' },
  { id: 'bogura', en: 'Bogura', division: 'rajshahi' },
  { id: 'rajshahi', en: 'Rajshahi', division: 'rajshahi' },
  { id: 'sirajgonj', en: 'Sirajgonj', division: 'rajshahi' },
  { id: 'rangpur', en: 'Rangpur', division: 'rangpur' },
  { id: 'dinajpur', en: 'Dinajpur', division: 'rangpur' }
];

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
