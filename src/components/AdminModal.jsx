import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Plus, Trash2, Save, Download, RotateCcw, Check, Settings, Wheat, Pill, Bird, Phone, Globe, MessageSquareText } from 'lucide-react';
import { CATEGORIES } from '../data/initialData';

export default function AdminModal(props) {
  if (!props.isOpen) return null;
  return <AdminModalContent {...props} />;
}

function AdminModalContent({ 
  onClose, 
  rates, 
  setRates, 
  feeds,
  setFeeds,
  medicines,
  setMedicines,
  feedbacks = [],
  setFeedbacks,
  onDeleteFeedback,
  onClearFeedbacks,
  onRefreshFeedbacks,
  notice, 
  setNotice, 
  settings,
  setSettings,
  onResetDefaults, 
  lang 
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('doc'); // 'doc', 'feedback', 'settings'
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedFbCat, setSelectedFbCat] = useState('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');

  const filteredFeedbacks = (feedbacks || []).filter((fb) => {
    if (selectedFbCat !== 'all' && fb.category !== selectedFbCat) return false;
    if (feedbackSearch.trim()) {
      const q = feedbackSearch.toLowerCase();
      return (
        (fb.name && fb.name.toLowerCase().includes(q)) ||
        (fb.phone && fb.phone.includes(q)) ||
        (fb.feedback && fb.feedback.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Add chick rate form
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newCompany, setNewCompany] = useState('');
  const [newCompanyEn, setNewCompanyEn] = useState('');
  const [newCategory, setNewCategory] = useState('broiler');
  const [newBreed, setNewBreed] = useState('Cobb 500');
  const [newTodayRate, setNewTodayRate] = useState(58);
  const [newYesterdayRate, setNewYesterdayRate] = useState(56);
  const [newStatus, setNewStatus] = useState('available');

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPin = settings.adminPin || '1234';
    if (pin === correctPin) {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('ভুল পিন কোড! সঠিক পিন দিয়ে পুনরায় চেষ্টা করুন।');
    }
  };

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  // DOC Rate actions
  const handleDocChange = (id, field, value) => {
    setRates(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    showToast('বাচ্চার দর হালনাগাদ হয়েছে');
  };

  const handleDeleteDoc = (id) => {
    if (window.confirm('আপনি কি নিশ্চিত এই বাচ্চার রেট মুছে ফেলতে চান?')) {
      setRates(prev => prev.filter(item => item.id !== id));
      showToast('মুছে ফেলা হয়েছে');
    }
  };

  const handleAddDoc = (e) => {
    e.preventDefault();
    if (!newCompany || !newTodayRate) return;
    const newEntry = {
      id: `doc-${Date.now()}`,
      company: newCompany,
      companyEn: newCompanyEn || newCompany,
      category: newCategory,
      breed: newBreed,
      todayRate: Number(newTodayRate),
      yesterdayRate: Number(newYesterdayRate),
      status: newStatus,
      minBooking: 500,
      bookingPhone: settings.hotline || "01711000000",
      notes: "সরাসরি কোম্পানি সরবরাহ",
      divisionRates: {
        dhaka: Number(newTodayRate),
        chittagong: Number(newTodayRate) + 1,
        rajshahi: Number(newTodayRate) - 1,
        rangpur: Number(newTodayRate) - 1,
        khulna: Number(newTodayRate),
        sylhet: Number(newTodayRate) + 1,
        mymensingh: Number(newTodayRate),
        barisal: Number(newTodayRate)
      }
    };
    setRates(prev => [newEntry, ...prev]);
    setShowAddDoc(false);
    setNewCompany('');
    showToast('নতুন বাচ্চার রেট যুক্ত হয়েছে');
  };

  // Feed Rate actions
  const handleFeedChange = (id, field, value) => {
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
    showToast('ফিডের দর হালনাগাদ হয়েছে');
  };

  // Medicine actions
  const handleMedChange = (id, field, value) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    showToast('ওষুধের দর হালনাগাদ হয়েছে');
  };

  // Export JSON
  const handleExportJSON = () => {
    const backupData = { rates, feeds, medicines, settings, notice };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `fosholnexa-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                FosholNexa এডমিন ড্যাশবোর্ড
              </h3>
              <p className="text-xs text-slate-500">
                বাচ্চার দর, ফিড, ওষুধ ও সাইট সেটিংস পরিবর্তন করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Login Screen */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-sm mx-auto text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-7 h-7" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">এডমিন পিন দিয়ে আনলক করুন</h4>
            <p className="text-xs text-slate-400">শুধুমাত্র অনুমোদিত ব্যবহারকারীর জন্য</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                maxLength={8}
                autoFocus
                placeholder="****"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full text-center tracking-widest text-2xl font-bold py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {pinError && <p className="text-xs text-red-600 font-medium">{pinError}</p>}

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition cursor-pointer"
              >
                প্রবেশ করুন
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="p-5 sm:p-6 space-y-6">
            {successMsg && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {successMsg}
              </div>
            )}

            {/* Dashboard Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab('doc')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'doc' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bird className="w-4 h-4" /> বাচ্চার দর (DOC)
              </button>
              <button
                onClick={() => setActiveTab('feedback')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'feedback' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MessageSquareText className="w-4 h-4" /> মতামত ও পরামর্শ
                {feedbacks && feedbacks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black">
                    {feedbacks.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Settings className="w-4 h-4" /> সেটিংস ও নোটিশ
              </button>
            </div>

            {/* TAB 1: DOC RATES */}
            {activeTab === 'doc' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowAddDoc(!showAddDoc)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন বাচ্চার রেট যোগ করুন</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> ব্যাকআপ ডাউনলোড
                  </button>
                </div>

                {/* Add new doc form */}
                {showAddDoc && (
                  <form onSubmit={handleAddDoc} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-emerald-900">নতুন বাচ্চার তথ্য যোগ করুন</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">কোম্পানির নাম</label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: কাজী ফার্মস"
                          value={newCompany}
                          onChange={(e) => setNewCompany(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="broiler">ব্রয়লার (Broiler)</option>
                          <option value="sonali">সোনালী (Sonali)</option>
                          <option value="layer_brown">লেয়ার বাদামী</option>
                          <option value="layer_white">লেয়ার সাদা</option>
                          <option value="cockerel">ককরেল / দেশি</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">জাত/ভ্যারাইটি</label>
                        <input
                          type="text"
                          value={newBreed}
                          onChange={(e) => setNewBreed(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">আজকের রেট (৳)</label>
                        <input
                          type="number"
                          required
                          value={newTodayRate}
                          onChange={(e) => setNewTodayRate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">গতকালের রেট (৳)</label>
                        <input
                          type="number"
                          required
                          value={newYesterdayRate}
                          onChange={(e) => setNewYesterdayRate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">স্ট্যাটাস</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        >
                          <option value="available">প্রস্তুত (Available)</option>
                          <option value="booking_open">বুকিং চালু</option>
                          <option value="limited">সীমিত স্টক</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddDoc(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 bg-white border rounded-lg"
                      >
                        বাতিল
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg"
                      >
                        যুক্ত করুন
                      </button>
                    </div>
                  </form>
                )}

                {/* DOC rates quick edit */}
                <div className="space-y-2">
                  {rates.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl"
                    >
                      <div className="min-w-[180px]">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block">{item.company}</span>
                        <span className="text-[11px] text-slate-500 font-medium">{item.breed} ({item.category})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 block">আজকের (৳)</span>
                          <input
                            type="number"
                            value={item.todayRate}
                            onChange={(e) => handleDocChange(item.id, 'todayRate', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 text-center"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">গতকালের (৳)</span>
                          <input
                            type="number"
                            value={item.yesterdayRate}
                            onChange={(e) => handleDocChange(item.id, 'yesterdayRate', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 text-center"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">স্ট্যাটাস</span>
                          <select
                            value={item.status}
                            onChange={(e) => handleDocChange(item.id, 'status', e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                          >
                            <option value="available">প্রস্তুত</option>
                            <option value="booking_open">বুকিং চালু</option>
                            <option value="limited">সীমিত</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleDeleteDoc(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: FEED RATES */}
            {activeTab === 'feed' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">পোল্ট্রি ফিডের রেট এডিট করুন (৫০ কেজি বস্তা)</h4>
                {feeds.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block">{f.productName}</span>
                      <span className="text-[11px] text-slate-500">{f.company} ({f.weight})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">বর্তমান রেট (৳)</span>
                        <input
                          type="number"
                          value={f.todayRate}
                          onChange={(e) => handleFeedChange(f.id, 'todayRate', Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 text-center"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">গতকালের (৳)</span>
                        <input
                          type="number"
                          value={f.yesterdayRate}
                          onChange={(e) => handleFeedChange(f.id, 'yesterdayRate', Number(e.target.value))}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: MEDICINES */}
            {activeTab === 'med' && (
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">ভ্যাকসিন ও মেডিসিন রেট এডিট করুন</h4>
                {medicines.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="max-w-md">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block">{m.nameBn}</span>
                      <span className="text-[11px] text-slate-500">{m.company} - {m.packSize}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">রেট (৳)</span>
                      <input
                        type="number"
                        value={m.todayRate}
                        onChange={(e) => handleMedChange(m.id, 'todayRate', Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-teal-50 border border-teal-300 rounded-lg text-xs font-bold text-teal-900 text-center"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: USER FEEDBACKS & OPINIONS */}
            {activeTab === 'feedback' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>💬 ভিজিটরদের মতামত ও পরামর্শ</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold">
                        {feedbacks.length}টি
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ওয়েবসাইটের ফ্লোটিং মতামত উইজেট থেকে প্রেরিত সকল তথ্য এখানে স্বয়ংক্রিয়ভাবে জমা হয়।
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onRefreshFeedbacks && (
                      <button
                        onClick={async () => {
                          showToast('ক্লাউড থেকে মতামত লোড হচ্ছে...');
                          await onRefreshFeedbacks();
                          showToast('সর্বশেষ মতামত হালনাগাদ হয়েছে');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>রিফ্রেশ</span>
                      </button>
                    )}

                    {feedbacks.length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm('আপনি কি নিশ্চিত সকল মতামত মুছে ফেলতে চান?')) {
                            if (onClearFeedbacks) await onClearFeedbacks();
                            else setFeedbacks([]);
                            showToast('সকল মতামত মুছে ফেলা হয়েছে');
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>সকল মতামত ক্লিয়ার করুন</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and Search */}
                {feedbacks.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1">
                      {['all', 'পরামর্শ', 'তথ্য আপডেট', 'সমস্যা', 'সাধারণ'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFbCat(cat)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                            selectedFbCat === cat 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat === 'all' ? 'সকল' : cat}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="নাম, ফোন বা বার্তা দিয়ে খুঁজুন..."
                      value={feedbackSearch}
                      onChange={(e) => setFeedbackSearch(e.target.value)}
                      className="w-full sm:w-64 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Feedbacks List */}
                {filteredFeedbacks.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                    <MessageSquareText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">কোনো মতামত পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400 mt-1">
                      ওয়েবসাইটের নিচে ডানদিকের 'মতামত দিন' বাটন থেকে ভিজিটররা মতামত দিলে তা সাথে সাথে এখানে জমা হবে।
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredFeedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                              {fb.category}
                            </span>
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {fb.name}
                            </span>
                            {fb.phone && fb.phone !== 'উল্লেখ নেই' && fb.phone !== '' && (
                              <span className="text-xs font-semibold text-slate-500">
                                📞 {fb.phone}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>🕒 {fb.date}</span>
                            <button
                              onClick={async () => {
                                if (window.confirm('এই মতামতটি মুছে ফেলতে চান?')) {
                                  if (onDeleteFeedback) await onDeleteFeedback(fb.id);
                                  else setFeedbacks(prev => prev.filter(f => f.id !== fb.id));
                                  showToast('মতামত মুছে ফেলা হয়েছে');
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          {fb.feedback}
                        </p>

                        {/* Reply Action Buttons */}
                        {fb.phone && fb.phone.replace(/[^0-9]/g, '').length >= 10 && (
                          <div className="flex items-center gap-2 pt-1">
                            <a
                              href={`https://wa.me/88${fb.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('আসসালামু আলাইকুম, ফসলনেক্সা (FosholNexa) ওয়েবসাইট উন্নয়ন মতামত প্রদানের জন্য আপনাকে ধন্যবাদ।')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                            >
                              <span>WhatsApp-এ উত্তর দিন</span>
                            </a>
                            <a
                              href={`tel:${fb.phone}`}
                              className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                            >
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>সরাসরি কল</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SETTINGS & HOTLINE */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">হটলাইন / কল নম্বর</label>
                    <input
                      type="text"
                      value={settings.hotline}
                      onChange={(e) => setSettings({ ...settings, hotline: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp নম্বর (বুকিংয়ের জন্য)</label>
                    <input
                      type="text"
                      value={settings.whatsapp}
                      onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ব্র্যান্ড নাম</label>
                    <input
                      type="text"
                      value={settings.brandName}
                      onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">এডমিন পিন কোড পরিবর্তন</label>
                    <input
                      type="text"
                      maxLength={8}
                      value={settings.adminPin}
                      onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-bold tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">দর কার্যকর তারিখ (বাংলা)</label>
                    <input
                      type="text"
                      value={settings.reportDateBn || '২৬ অক্টোবর, ২০২৬ (সোমবার)'}
                      onChange={(e) => setSettings({ ...settings, reportDateBn: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Effective Date (English)</label>
                    <input
                      type="text"
                      value={settings.reportDateEn || 'Monday, October 26, 2026'}
                      onChange={(e) => setSettings({ ...settings, reportDateEn: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs font-semibold text-emerald-800"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    লাইভ স্ক্রলিং নোটিশ (বিজ্ঞপ্তি)
                  </label>
                  <textarea
                    rows={2}
                    value={notice}
                    onChange={(e) => setNotice(e.target.value)}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => {
                      if (window.confirm('সবকিছু ডিফল্ট ডাটাতে ফিরিয়ে নিতে চান?')) {
                        onResetDefaults();
                        showToast('ডিফল্ট ডাটা রিস্টোর হয়েছে');
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ডিফল্ট সেটিংসে রিসেট
                  </button>
                  <button
                    onClick={() => showToast('সেটিংস সংরক্ষিত হয়েছে')}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    সংরক্ষণ করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
