import { DIVISIONS } from '../data/initialData';
import { DIVISION_IDS } from '../data/regions';
import { rateForRegion } from '../data/zones';

// Ready-to-post text for Facebook / WhatsApp, built from the current rates.
const divisionLabel = (id) => (DIVISIONS.find((d) => d.id === id)?.nameBn || id).split('(')[0].trim();
const SHORT = { dhaka: 'ঢাকা', chittagong: 'চট্টগ্রাম', rajshahi: 'রাজশাহী', rangpur: 'রংপুর', khulna: 'খুলনা', sylhet: 'সিলেট', mymensingh: 'ময়মনসিংহ', barisal: 'বরিশাল' };

/** The rates as seen for one division. 'all' = the national rates unchanged (with ▲▼ vs yesterday). */
export function ratesForRegion(rates, division) {
  if (!division || division === 'all' || division === 'matrix') return rates;
  return rates.map((r) => {
    const v = Number(rateForRegion(r, division));
    // Yesterday's rate exists only for the national figure, so no ▲▼ in a region view.
    return Number.isFinite(v) && v > 0 ? { ...r, todayRate: v, yesterdayRate: 0 } : { ...r, yesterdayRate: 0 };
  });
}

export const regionTitle = (division) =>
  !division || division === 'all' ? 'সমগ্র বাংলাদেশ (জাতীয় গড়)' : division === 'matrix' ? 'সব বিভাগ' : divisionLabel(division);
const change = (r) => {
  const diff = Number(r.todayRate) - Number(r.yesterdayRate);
  if (!Number(r.yesterdayRate) || !diff) return '';
  return diff > 0 ? ` (▲৳${diff})` : ` (▼৳${Math.abs(diff)})`;
};

export function buildShareText({ rates: allRates, notice, settings, division = 'all' }) {
  const rates = ratesForRegion(allRates, division);
  const fallbackDate = new Intl.DateTimeFormat('bn-BD', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date());
  const effectiveDate = settings?.reportDateBn || fallbackDate;

  const broilerList = rates.filter((r) => r.category === 'broiler').slice(0, 8);
  const sonaliList = rates.filter((r) => r.category === 'sonali').slice(0, 6);
  const layerList = rates.filter((r) => (r.category || '').startsWith('layer')).slice(0, 4);
  const line = (r) => `▫️ ${r.companyEn || r.company}: ৳${r.todayRate}${change(r)}\n`;

  let text = `🌾 *মুরগির বাচ্চার বাজার দর (FosholNexa BD)* 🌾\n`;
  text += `📅 কার্যকর তারিখ: ${effectiveDate}\n`;
  text += `📍 অঞ্চল: ${regionTitle(division)}\n`;
  text += `--------------------------------------\n\n`;
  if (division === 'matrix') {
    const matrixLine = (r) => {
      const parts = DIVISION_IDS.map((id) => {
        const v = Number(r.divisionRates?.[id]);
        return `${SHORT[id]} ${Number.isFinite(v) && v > 0 ? v : r.todayRate}`;
      });
      return `▫️ *${r.companyEn || r.company}*: ${parts.join(' | ')}\n`;
    };
    text += `🔥 *ব্রয়লার বাচ্চার দর (বিভাগ অনুযায়ী):* \n`;
    broilerList.forEach((r) => { text += matrixLine(r); });
    text += `\n✨ *সোনালী বাচ্চার দর (বিভাগ অনুযায়ী):* \n`;
    sonaliList.forEach((r) => { text += matrixLine(r); });
  } else {
    text += `🔥 *ব্রয়লার বাচ্চার দর:* \n`;
    broilerList.forEach((r) => { text += line(r); });
    text += `\n✨ *সোনালী বাচ্চার দর:* \n`;
    sonaliList.forEach((r) => { text += line(r); });
    if (layerList.length > 0) {
      text += `\n🥚 *লেয়ার বাচ্চার দর:* \n`;
      layerList.forEach((r) => { text += line(r); });
    }
  }
  text += `\n📢 *মার্কেট নোট:* ${notice}\n`;
  text += `📞 বুকিং ও তথ্যের জন্য: ${settings?.hotline || '01619-500178'}\n`;
  text += `🌐 সকল রেট দেখুন: ${window.location.origin}\n`;
  return text;
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
