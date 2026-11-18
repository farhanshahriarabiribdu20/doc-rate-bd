import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Sparkles, Image as ImageIcon, Check } from 'lucide-react';

export default function BannerGeneratorModal({ isOpen, onClose, rates, feeds, settings, notice, lang }) {
  if (!isOpen) return null;

  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [bannerTheme, setBannerTheme] = useState('emerald'); // emerald, midnight, orange

  const fallbackDate = new Intl.DateTimeFormat('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const todayStr = settings?.reportDateBn || fallbackDate;

  const broilerList = rates.filter(r => r.category === 'broiler').slice(0, 5);
  const sonaliList = rates.filter(r => r.category === 'sonali').slice(0, 4);
  const layerList = rates.filter(r => r.category.startsWith('layer')).slice(0, 3);

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
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#042f2e');
      grad.addColorStop(1, '#022c22');
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
    ctx.roundRect(40, 40, width - 80, 130, 24);
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

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('BD', 415, 98);

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
    drawFeedsBox(ctx, 560, 630, 480, 270, feeds.slice(0, 3));

    // Footer Contact Bar
    ctx.fillStyle = '#f59e0b';
    ctx.roundRect(40, 920, width - 80, 110, 24);
    ctx.fill();

    ctx.font = 'bold 32px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('📞 বাচ্চার অগ্রিম বুকিং ও বিস্তারিত তথ্যে:', 70, 985);

    ctx.font = '900 36px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#022c22';
    ctx.fillText(settings.hotline || '01619-500178', 600, 985);

    ctx.font = '600 20px "Hind Siliguri", "Segoe UI", sans-serif';
    ctx.fillStyle = '#064e3b';
    ctx.fillText('(WhatsApp ও কল সুবিধা চালু আছে)', 840, 985);

  }, [bannerTheme, rates, feeds, settings, notice]);

  const drawCategoryBox = (ctx, x, y, w, h, title, list, accentColor) => {
    // Card background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title bar
    ctx.fillStyle = accentColor;
    ctx.roundRect(x + 15, y + 15, w - 30, 48, 12);
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
        ctx.roundRect(x + 15, curY - 26, w - 30, 48, 8);
        ctx.fill();
      }

      ctx.font = 'bold 21px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      const shortName = item.companyEn || item.company.split(' ')[0];
      ctx.fillText(shortName + (item.breed ? ` (${item.breed})` : ''), x + 30, curY + 4);

      ctx.font = '900 26px "Hind Siliguri", "Segoe UI", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.fillText(`৳${item.todayRate}`, x + w - 105, curY + 6);

      curY += 56;
    });
  };

  const drawFeedsBox = (ctx, x, y, w, h, list) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.roundRect(x + 15, y + 15, w - 30, 48, 12);
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
              <p className="text-xs text-slate-400">
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
