// Ready-to-post text for Facebook / WhatsApp, built from the current rates.
const change = (r) => {
  const diff = Number(r.todayRate) - Number(r.yesterdayRate);
  if (!Number(r.yesterdayRate) || !diff) return '';
  return diff > 0 ? ` (▲৳${diff})` : ` (▼৳${Math.abs(diff)})`;
};

export function buildShareText({ rates, notice, settings }) {
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
  text += `--------------------------------------\n\n`;
  text += `🔥 *ব্রয়লার বাচ্চার দর:* \n`;
  broilerList.forEach((r) => { text += line(r); });
  text += `\n✨ *সোনালী বাচ্চার দর:* \n`;
  sonaliList.forEach((r) => { text += line(r); });
  if (layerList.length > 0) {
    text += `\n🥚 *লেয়ার বাচ্চার দর:* \n`;
    layerList.forEach((r) => { text += line(r); });
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
