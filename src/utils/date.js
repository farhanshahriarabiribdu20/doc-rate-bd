// Date helpers. All dates are handled in Bangladesh time (Asia/Dhaka).
const TZ = 'Asia/Dhaka';

export const todayISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());

const toDate = (iso) => new Date(`${iso}T12:00:00+06:00`);

export const formatBn = (iso) => {
  const d = toDate(iso);
  const dmy = new Intl.DateTimeFormat('bn-BD', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const wd = new Intl.DateTimeFormat('bn-BD', { timeZone: TZ, weekday: 'long' }).format(d);
  return `${dmy} (${wd})`;
};

export const formatEn = (iso) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    .format(toDate(iso));

/** Whole days between `iso` and today (Dhaka). 0 = today. null when the date is missing/invalid. */
export const ageInDays = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y1, m1, d1] = iso.split('-').map(Number);
  const [y2, m2, d2] = todayISO().split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const toBnDigits = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);
