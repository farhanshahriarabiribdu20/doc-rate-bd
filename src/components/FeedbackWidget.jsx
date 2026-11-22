import React, { useState } from 'react';
import { MessageSquareText, X, Send, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { submitFeedback } from '../services/api';

export default function FeedbackWidget({ lang = 'bn', whatsappNumber = '8801619500178' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('পরামর্শ');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: hidden from people, bots fill it
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'saved' | 'failed'

  const categories = [
    { id: 'পরামর্শ', labelBn: '💡 নতুন ফিচার/পরামর্শ', labelEn: '💡 Suggestion' },
    { id: 'তথ্য আপডেট', labelBn: '📊 রেট বা তথ্য আপডেট', labelEn: '📊 Rate Update' },
    { id: 'সমস্যা', labelBn: '🐛 কোনো সমস্যা/বাগ', labelEn: '🐛 Bug/Issue' },
    { id: 'সাধারণ', labelBn: '⭐ সাধারণ মতামত', labelEn: '⭐ General' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || status === 'sending') return;
    setStatus('sending');

    // Open WhatsApp synchronously (before any await) so popup blockers allow it.
    const message =
`*🌾 ফসলনেক্সা (FosholNexa) ওয়েবসাইট উন্নয়ন মতামত*
--------------------------------
📌 *বিষয়:* ${category}
👤 *প্রেরক:* ${name.trim() || 'সম্মানিত ভিজিটর'}
${phone.trim() ? `📞 *যোগাযোগ:* ${phone.trim()}\n` : ''}
💬 *মতামত / পরামর্শ:*
${feedback.trim()}
--------------------------------
🌐 *${window.location.host}*`;
    try {
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch { /* popup blocked: the cloud copy below still goes through */ }

    const result = await submitFeedback({
      category,
      name: name.trim() || (lang === 'bn' ? 'সম্মানিত ভিজিটর' : 'Visitor'),
      phone: phone.trim(),
      feedback: feedback.trim(),
      website
    });

    setStatus(result.ok ? 'saved' : 'failed');
    setTimeout(() => {
      setStatus('idle');
      if (result.ok) {
        setFeedback('');
        setName('');
        setPhone('');
        setIsOpen(false);
      }
    }, 2500);
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      <aside aria-label="Website Feedback" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 group">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-2xl shadow-emerald-950/40 border border-emerald-300/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          title={lang === 'bn' ? 'ওয়েবসাইট নিয়ে মতামত দিন' : 'Send Website Feedback'}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <MessageSquareText className="w-4 h-4 text-emerald-100" />
          <span className="tracking-wide">
            {lang === 'bn' ? 'মতামত দিন' : 'Feedback'}
          </span>
        </button>
      </aside>

      {/* Feedback Modal / Box */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white relative">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] mb-2 border border-emerald-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ওয়েবসাইট উন্নয়ন ও মতামত' : 'Website Feedback & Ideas'}</span>
              </div>
              
              <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
                {lang === 'bn' ? 'আপনার মূল্যবান মতামত বা পরামর্শ দিন' : 'Share Your Feedback or Suggestions'}
              </h3>
              
              <p className="text-xs text-emerald-100/80 mt-1 font-medium leading-relaxed">
                {lang === 'bn'
                  ? 'ফসলনেক্সা পোর্টালটি আরো সুন্দর ও খামারিদের উপযোগী করতে যেকোনো মতামত লিখুন। এটি সরাসরি আমাদের WhatsApp-এ পৌঁছাবে।'
                  : 'Help us improve FosholNexa. Your valuable suggestions will be sent directly to our WhatsApp.'}
              </p>
            </div>

            {/* Form */}
            {status === 'saved' || status === 'failed' ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${status === 'saved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {status === 'saved' ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                <h4 className="text-base font-black text-slate-900">
                  {status === 'saved'
                    ? (lang === 'bn' ? 'ধন্যবাদ! আপনার মতামত জমা হয়েছে' : 'Thank you! Your feedback was received')
                    : (lang === 'bn' ? 'ওয়েবসাইটে জমা হয়নি' : 'Could not save on the website')}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  {status === 'saved'
                    ? (lang === 'bn' ? 'হোয়াটসঅ্যাপেও মেসেজটি ওপেন হয়েছে।' : 'The message was also opened in WhatsApp.')
                    : (lang === 'bn' ? 'ইন্টারনেট সমস্যা হতে পারে। হোয়াটসঅ্যাপে পাঠানো মেসেজটিই আমাদের কাছে পৌঁছাবে।' : 'Network problem. The WhatsApp message will still reach us.')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
                
                {/* Category Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {lang === 'bn' ? 'মতামতের বিষয় নির্বাচন করুন:' : 'Feedback Category:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition border cursor-pointer ${
                          category === cat.id
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lang === 'bn' ? cat.labelBn : cat.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'bn' ? 'আপনার মতামত বা পরামর্শ বিস্তারিত লিখুন: *' : 'Your Feedback / Suggestion: *'}
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={
                      lang === 'bn'
                        ? 'ওয়েবসাইটে কোন জিনিসটি আপনার ভালো লেগেছে বা আর কী কী নতুন সুবিধা যোগ করলে ভালো হয় লিখুন...'
                        : 'Write what you liked or what improvements/features you would like to see...'
                    }
                    className="w-full p-3 rounded-2xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                  ></textarea>
                </div>

                {/* Optional Sender Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'bn' ? 'আপনার নাম (ঐচ্ছিক):' : 'Your Name (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={lang === 'bn' ? 'নাম লিখুন' : 'Enter name'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {lang === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক):' : 'Phone (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Direct WhatsApp Notice */}
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900">
                  <span className="text-base shrink-0">📲</span>
                  <p className="font-semibold text-[11px] leading-tight">
                    {lang === 'bn' 
                      ? 'বাটনে চাপ দিলে আপনার মতামতটি সরাসরি আমাদের অফিসিয়াল WhatsApp নাম্বারে (01619-500178) চলে যাবে।'
                      : 'Clicking submit will send your feedback directly to our official WhatsApp (01619-500178).'}
                  </p>
                </div>

                {/* Honeypot (hidden from real visitors) */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                  <label>Website
                    <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3.5 px-4 disabled:opacity-60 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/20 active:scale-98 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {lang === 'bn' ? 'WhatsApp-এ সরাসরি মতামত পাঠান ➔' : 'Send via WhatsApp Now ➔'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
