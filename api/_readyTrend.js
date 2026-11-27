// Ready-market (broiler, colour bird, sonali, egg, PS-cull) daily AVERAGE prices: one small rolling doc
// (trend/ready.json, last 40 days) so the trend analysis needs a single read and never a list().
import { readFresh, writeFresh } from './_fresh.js';
import { READY_TREND_SEED } from './_readySeed.js';

const PATH = 'trend/ready.json';
const KEEP_DAYS = 40;
export const READY_FIELDS = ['broilerGrill', 'broilerMedium', 'broilerBig', 'colorBird', 'sonali', 'eggBrown', 'eggWhite', 'psCull'];

const round2 = (n) => Math.round(n * 100) / 100;

/** Average of every field over the regions that reported a price above zero. */
export function averageDay(readyRates) {
  const day = {};
  for (const f of READY_FIELDS) {
    const vals = (readyRates || []).map((r) => Number(r?.[f])).filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length) day[f] = round2(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return day;
}

const trim = (days) => {
  const out = {};
  Object.keys(days).sort().slice(-KEEP_DAYS).forEach((d) => { out[d] = days[d]; });
  return out;
};

/** Called when a ready day is archived (the day is over): adds its average. Never blocks the caller. */
export async function updateReadyTrend(date, readyRates) {
  const day = averageDay(readyRates);
  if (!Object.keys(day).length) return;
  const cur = await readFresh(PATH);
  const days = { ...(cur?.days || READY_TREND_SEED), [date]: day };
  await writeFresh(PATH, { days: trim(days) }, cur?.v || 0);
}

/** The rolling trend. Starts from the sheet history; days the site stored itself win for the same date. */
export async function readReadyTrend() {
  const cur = await readFresh(PATH);
  return { days: trim({ ...READY_TREND_SEED, ...(cur?.days || {}) }) };
}
