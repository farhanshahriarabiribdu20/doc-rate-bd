import React, { useState } from 'react';
import { X, MessageCircle, Phone, Send, CheckCircle2 } from 'lucide-react';

export default function BookingModal(props) {
  if (!props.isOpen || !props.selectedItem) return null;
  return <BookingModalContent {...props} />;
}

function BookingModalContent({ onClose, selectedItem, settings, lang }) {
  const [quantity, setQuantity] = useState(selectedItem.minBooking || 500);
  const [farmerName, setFarmerName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [submitted, setSubmitted] = useState(false);

  const handleSendWhatsApp = (e) => {
    e.preventDefault();
    const message = `🌾 *নতুন বাচ্চার বুকিং আবেদন (FosholNexa BD)*\n\n` +
      `🏢 কোম্পানি: ${selectedItem.company}\n` +
      `🐣 জাত/ভ্যারাইটি: ${selectedItem.breed}\n` +
      `💰 বর্তমান দর: ৳${selectedItem.todayRate}/পিস\n` +
      `📦 বাচ্চার সংখ্যা: ${quantity} পিস\n` +
      `👤 খামারীর নাম: ${farmerName || 'নাম প্রদান করা হয়নি'}\n` +
      `📱 মোবাইল নাম্বার: ${phone || 'নাম্বার প্রদান করা হয়নি'}\n` +
      `📍 জেলা/লোকেশন: ${district}\n\n` +
      `দয়া করে ডেলিভারির তারিখ ও বিস্তারিত বুকিং নিশ্চিত করুন।`;

    const encoded = encodeURIComponent(message);
    // Digits only, Bangladesh country code (880). Admin-set WhatsApp number wins.
    const digits = (settings?.whatsapp || selectedItem.bookingPhone || '01619500178').replace(/[^0-9]/g, '');
    const targetPhone = digits.startsWith('880') ? digits : `880${digits.replace(/^0/, '')}`;
    window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encoded}`, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg">
              {lang === 'bn' ? 'বাচ্চা বুকিং ও অর্ডার আবেদন' : 'Chicks Booking Request'}
            </h3>
            <p className="text-xs text-emerald-200">
              {selectedItem.company} ({selectedItem.breed})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-xl font-bold text-slate-800">
              {lang === 'bn' ? 'আবেদন পাঠানো হয়েছে!' : 'Booking Request Sent!'}
            </h4>
            <p className="text-xs text-slate-500">
              {lang === 'bn' 
                ? 'আপনার বুকিং তথ্য হোয়াটসঅ্যাপে পাঠানো হয়েছে। আমাদের প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবে।' 
                : 'Your inquiry has been redirected to WhatsApp. Our agent will confirm delivery.'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {lang === 'bn' ? 'ঠিক আছে' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendWhatsApp} className="p-5 sm:p-6 space-y-4">
            {/* Price Preview Card */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">আজকের নির্ধারিত দর</span>
                <span className="text-2xl font-black text-emerald-900">৳{selectedItem.todayRate}</span>
                <span className="text-xs text-emerald-700"> /পিস</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-800 font-semibold block">মোট আনুমানিক মূল্য</span>
                <span className="text-lg font-bold text-emerald-900">৳{(quantity * selectedItem.todayRate).toLocaleString()}</span>
              </div>
            </div>

            {/* Inputs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'বাচ্চার পরিমাণ (পিস)' : 'Quantity (pcs)'}
              </label>
              <input
                type="number"
                min={selectedItem.minBooking || 100}
                step={50}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {lang === 'bn' ? `ন্যূনতম বুকিং: ${selectedItem.minBooking || 500} পিস` : `Minimum: ${selectedItem.minBooking || 500} pcs`}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'আপনার নাম / খামারের নাম' : 'Farmer / Farm Name'}
              </label>
              <input
                type="text"
                placeholder={lang === 'bn' ? 'যেমন: মোহাম্মদ রফিকুল ইসলাম' : 'e.g. Rafiqul Islam'}
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              </label>
              <input
                type="tel"
                placeholder="017XXXXXXXX"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'bn' ? 'ডেলিভারি জেলা' : 'Delivery District'}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="ঢাকা">ঢাকা (Dhaka)</option>
                <option value="গাজীপুর">গাজীপুর (Gazipur)</option>
                <option value="ময়মনসিংহ">ময়মনসিংহ (Mymensingh)</option>
                <option value="চট্টগ্রাম">চট্টগ্রাম (Chittagong)</option>
                <option value="বগুড়া">বগুড়া (Bogra)</option>
                <option value="রাজশাহী">রাজশাহী (Rajshahi)</option>
                <option value="রংপুর">রংপুর (Rangpur)</option>
                <option value="যশোর">যশোর (Jashore)</option>
                <option value="সিলেট">সিলেট (Sylhet)</option>
                <option value="অন্যান্য">অন্যান্য জেলা (Other)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{lang === 'bn' ? 'WhatsApp এর মাধ্যমে অর্ডার পাঠান' : 'Submit via WhatsApp'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
