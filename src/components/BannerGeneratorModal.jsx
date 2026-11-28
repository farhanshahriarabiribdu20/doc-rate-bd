import React, { useRef, useEffect, useMemo, useState } from 'react';
import { X, Download, Share2, Image as ImageIcon, Check, Send } from 'lucide-react';
import { buildShareText, copyToClipboard, ratesForRegion, regionTitle } from '../utils/shareText';
import RegionSelect from './RegionSelect';
import { getReadyMarketStats } from '../data/readyMarketData';

// Every rounded box needs its own path, otherwise each fill() repaints all earlier boxes in the latest colour.
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// Cuts text with an ellipsis so it never runs into the price next to it.
const fit = (ctx, text, maxW) => {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t.trim()}…`;
};

export default function BannerGeneratorModal(props) {
  if (!props.isOpen) return null;
  return <BannerGeneratorModalContent {...props} />;
}

function BannerGeneratorModalContent({ onClose, rates: allRates, readyRates, feeds, settings, notice, lang }) {
  const [division, setDivision] = useState('all'); // banner shows one region at a time
  const rates = useMemo(() => ratesForRegion(allRates, division === 'matrix' ? 'all' : division), [allRates, division]);
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [kitStatus, setKitStatus] = useState('');
  const [bannerTheme, setBannerTheme] = useState('emerald'); // emerald, midnight, orange
  const [fontsReady, setFontsReady] = useState(false);

  // Redraw once the Bengali web font is available, otherwise the PNG uses a fallback font.
  useEffect(() => {
    let cancelled = false;
    const fonts = document.fonts;
    if (!fonts?.load) { setFontsReady(true); return undefined; }
    Promise.all([
      fonts.load('900 44px "Hind Siliguri"'),
      fonts.load('600 20px "Hind Siliguri"')
    ]).catch(() => {}).finally(() => { if (!cancelled) setFontsReady(true); });
    return () => { cancelled = true; };
  }, []);

  const fallbackDate = new Intl.DateTimeFormat('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const baseDateStr = settings?.reportDateBn || fallbackDate;
  const todayStr = division === 'all' || division === 'matrix' ? baseDateStr : `${baseDateStr} · 📍 ${regionTitle(division)}`;

  const broilerList = rates.filter(r => r.category === 'broiler').slice(0, 5);
  const sonaliList = rates.filter(r => r.category === 'sonali').slice(0, 4);
  const layerList = rates.filter(r => (r.category || '').startsWith('layer')).slice(0, 3);

  // Redraw canvas whenever theme or rates change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background themes
    if (bannerTheme === 'emerald') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#193b28');
      grad.addColorStop(0.5, '#102a1b');
      grad.addColorStop(1, '#0c2116');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (bannerTheme === 'midnight') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#7c2d12');
      grad.addColorStop(0.5, '#431407');
      grad.addColorStop(1, '#1c1917');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle background glowing circles
    ctx.beginPath();
    ctx.arc(900, 150, 220, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(150, 950, 260, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
    ctx.fill();

    // Top Header Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    rr(ctx, 40, 40, width - 80, 130, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw circular Logo Image
    const logoImg = new Image();
    logoImg.src = '/logo.jpg';
    logoImg.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(115, 105, 48, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logoImg, 67, 57, 96, 96);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(115, 105, 48, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();
    };

    // Brand Title & Tagline
    ctx.font = '900 44px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('FosholNexa', 185, 98);
    const brandW = ctx.measureText('FosholNexa').width;

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('BD', 185 + brandW + 8, 98);

    ctx.font = '600 20px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('সঠিক তথ্য, সচেতন খামারি, সমৃদ্ধ কৃষি।', 188, 138);

    // Right side Header Date & Title
    ctx.font = 'bold 24px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('আজকের বাচ্চার বাজার দর (DOC Rate)', 620, 95);

    ctx.font = '500 20px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`📅 ${todayStr}`, 620, 134);

    // Section 1: Broiler Chicks (Left Column)
    drawCategoryBox(ctx, 40, 190, 480, 420, '🔥 ব্রয়লার বাচ্চার রেট (Broiler DOC)', broilerList, '#ea580c');

    // Section 2: Sonali Chicks (Right Column)
    drawCategoryBox(ctx, 560, 190, 480, 420, '✨ সোনালী বাচ্চার রেট (Sonali DOC)', sonaliList, '#d97706');

    // Section 3: Layer & Cockerel (Bottom Left)
    drawCategoryBox(ctx, 40, 630, 480, 270, '🥚 লেয়ার ও ককরেল বাচ্চার রেট', layerList, '#059669');

    // Section 4: Feeds Highlight (Bottom Right)
    if (feeds && feeds.length > 0) {
      drawFeedsBox(ctx, 560, 630, 480, 270, feeds.slice(0, 3));
    } else {
      drawReadyBox(ctx, 560, 630, 480, 270, getReadyMarketStats(readyRates));
    }

    // Footer Contact Bar
    ctx.fillStyle = '#f59e0b';
    rr(ctx, 40, 920, width - 80, 110, 24);
    ctx.fill();

    ctx.font = 'bold 32px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('📞 বাচ্চার অগ্রিম বুকিং ও বিস্তারিত তথ্যে:', 70, 985);

    ctx.font = '900 36px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#0c2116';
    const hotline = settings.hotline || '01790-220686';
    ctx.fillText(hotline, 600, 985);
    const hotW = ctx.measureText(hotline).width;

    ctx.font = '600 20px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#193b28';
    ctx.fillText(fit(ctx, '(WhatsApp ও কল সুবিধা চালু আছে)', width - 70 - (600 + hotW + 16)), 600 + hotW + 16, 985);

  }, [bannerTheme, rates, readyRates, feeds, settings, notice, fontsReady]);

  const showChange = division === 'all' || division === 'matrix';
  const drawCategoryBox = (ctx, x, y, w, h, title, list, accentColor) => {
    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    rr(ctx, x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title bar
    ctx.fillStyle = accentColor;
    rr(ctx, x + 15, y + 15, w - 30, 48, 12);
    ctx.fill();

    ctx.font = 'bold 22px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, x + 30, y + 47);

    // List items
    let curY = y + 100;
    list.forEach((item, index) => {
      // Row alternating bg
      if (index % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        rr(ctx, x + 15, curY - 26, w - 30, 48, 8);
        ctx.fill();
      }

      ctx.font = 'bold 21px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      const shortName = item.companyEn || item.company.split(' ')[0];
      ctx.fillText(fit(ctx, shortName + (item.breed ? ` (${item.breed})` : ''), w - 200), x + 30, curY + 4);

      ctx.font = '900 26px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`৳${item.todayRate}`, x + w - 105, curY + 6);

      // ▲▼ against yesterday (national rates only: regional rows have no yesterday figure)
      const diff = showChange ? Number(item.todayRate) - Number(item.yesterdayRate) : 0;
      if (showChange && Number(item.yesterdayRate) && diff !== 0) {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = 'bold 18px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = diff > 0 ? '#fb7185' : '#4ade80'; // rise = bad for buyers, fall = good
        ctx.fillText(`${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}`, x + w - 118, curY + 5);
        ctx.restore();
      }

      curY += 56;
    });
  };

  // Shown when no feed prices are available: national averages of the ready-bird market.
  const drawReadyBox = (ctx, x, y, w, h, stats) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    rr(ctx, x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    rr(ctx, x + 15, y + 15, w - 30, 48, 12);
    ctx.fill();

    ctx.font = 'bold 22px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🍗 রেডি মুরগি ও ডিমের গড় দর', x + 30, y + 47);

    if (!stats) return;
    const rows = [
      ['ব্রয়লার (গ্রিল) /কেজি', stats.avgGrill],
      ['সোনালী মুরগি /কেজি', stats.avgSonali],
      ['লাল ডিম /পিস', stats.avgEggBrown]
    ];
    let curY = y + 100;
    rows.forEach(([label, value]) => {
      ctx.font = 'bold 20px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, x + 30, curY + 4);
      ctx.font = '900 24px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`৳${value}`, x + w - 120, curY + 6);
      curY += 54;
    });
  };

  const drawFeedsBox = (ctx, x, y, w, h, list) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    rr(ctx, x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    rr(ctx, x + 15, y + 15, w - 30, 48, 12);
    ctx.fill();

    ctx.font = 'bold 22px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🌾 পোল্ট্রি ফিডের বাজারদর (৫০ কেজি বস্তা)', x + 30, y + 47);

    let curY = y + 100;
    list.forEach((f, index) => {
      ctx.font = 'bold 20px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`${f.companyEn || f.company} (${f.feedType})`, x + 30, curY + 4);

      ctx.font = '900 24px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`৳${f.todayRate}`, x + w - 120, curY + 6);

      curY += 54;
    });
  };

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.download = `fosholnexa-doc-rate-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloading(false), 1500);
  };

  const downloadPng = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  // One tap: copy the post text, then share the banner image (phones) or download it (computers).
  const handlePostKit = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const text = buildShareText({ rates: allRates, notice, settings, division });
    const copied = await copyToClipboard(text);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) { setKitStatus('ছবি তৈরি করা যায়নি, আবার চেষ্টা করুন।'); return; }
    const name = `fosholnexa-doc-rate-${new Date().toISOString().slice(0, 10)}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    const copiedNote = copied ? 'পোস্টের টেক্সট কপি হয়েছে।' : 'টেক্সট কপি করা যায়নি, শেয়ার বাটন থেকে কপি করুন।';
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        setKitStatus(`${copiedNote} ফেসবুকে টেক্সট না এলে পেস্ট করুন।`);
        return;
      }
    } catch (err) {
      if (err && err.name === 'AbortError') { setKitStatus(copiedNote); return; }
    }
    downloadPng(blob, name);
    setKitStatus(`${copiedNote} ছবি ডাউনলোড হয়েছে। ফেসবুক গ্রুপে ছবি দিন, টেক্সট পেস্ট করুন।`);
  };

  const handlePostKitWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(buildShareText({ rates: allRates, notice, settings, division }))}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                {lang === 'bn' ? 'ফেসবুক রেট ব্যানার ডাউনলোড (FosholNexa)' : 'Facebook Banner Card Generator'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'এইচডি কোয়ালিটি স্কয়ার ইমেজ (১০৮০x১০৮০) তৈরি ও এক ক্লিকে ফেসবুক পেজে পোস্ট' : '1080x1080 HD Card ready for Facebook post'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Preview */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Theme selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-xs font-bold text-slate-300">
              {lang === 'bn' ? 'ব্যানার কালার থিম:' : 'Banner Color Theme:'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBannerTheme('emerald')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  bannerTheme === 'emerald' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                🌲 Emerald Green
              </button>
              <button
                onClick={() => setBannerTheme('midnight')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  bannerTheme === 'midnight' ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                🌌 Midnight Navy
              </button>
              <button
                onClick={() => setBannerTheme('orange')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  bannerTheme === 'orange' ? 'bg-amber-600 text-white ring-2 ring-amber-400' : 'bg-slate-700 text-slate-300'
                }`}
              >
                🔥 Deep Rust
              </button>
            </div>
          </div>

          {/* Canvas Preview Container */}
          <div className="flex justify-center bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full max-w-[500px] h-auto rounded-xl shadow-2xl border border-slate-800/80 aspect-square"
            />
          </div>

          {/* Post kit: text + image in one tap */}
          <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 space-y-3">
            <p className="text-sm font-extrabold text-emerald-300">📣 পোস্ট কিট — এক ক্লিকে টেক্সট + ছবি</p>
            <RegionSelect value={division} onChange={setDivision} withMatrix dark />
            {division === 'matrix' && <p className="text-[11px] text-slate-300">ছবিতে জাতীয় গড় থাকবে, টেক্সটে সব বিভাগের রেট একসাথে যাবে।</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handlePostKit}
                className="py-3 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>টেক্সট কপি + ছবি শেয়ার/ডাউনলোড</span>
              </button>
              <button
                onClick={handlePostKitWhatsApp}
                className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>হোয়াটসঅ্যাপে টেক্সট পাঠান</span>
              </button>
            </div>
            {kitStatus && <p className="text-xs text-emerald-200 font-semibold" role="status">{kitStatus}</p>}
          </div>

          {/* Action Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              {downloading ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
              <span>{downloading ? 'ডাউনলোড হচ্ছে...' : 'HD ইমেজ ডাউনলোড করুন (Facebook Post)'}</span>
            </button>

            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              <span>Facebook পেজ ওপেন করুন</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
