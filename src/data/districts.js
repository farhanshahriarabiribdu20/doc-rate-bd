// The 64 districts of Bangladesh (Bangla names), grouped by division. Used by the marketplace.
export const DISTRICT_GROUPS = [
  { division: 'ঢাকা বিভাগ', districts: ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'নরসিংদী', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'মানিকগঞ্জ', 'মুন্সীগঞ্জ', 'ফরিদপুর', 'গোপালগঞ্জ', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী'] },
  { division: 'চট্টগ্রাম বিভাগ', districts: ['চট্টগ্রাম', 'কুমিল্লা', 'নোয়াখালী', 'ফেনী', 'চাঁদপুর', 'ব্রাহ্মণবাড়িয়া', 'কক্সবাজার', 'লক্ষ্মীপুর', 'রাঙ্গামাটি', 'বান্দরবান', 'খাগড়াছড়ি'] },
  { division: 'রাজশাহী বিভাগ', districts: ['রাজশাহী', 'বগুড়া', 'পাবনা', 'নাটোর', 'নওগাঁ', 'সিরাজগঞ্জ', 'জয়পুরহাট', 'চাঁপাইনবাবগঞ্জ'] },
  { division: 'রংপুর বিভাগ', districts: ['রংপুর', 'দিনাজপুর', 'গাইবান্ধা', 'কুড়িগ্রাম', 'নীলফামারী', 'ঠাকুরগাঁও', 'লালমনিরহাট', 'পঞ্চগড়'] },
  { division: 'খুলনা বিভাগ', districts: ['খুলনা', 'যশোর', 'ঝিনাইদহ', 'কুষ্টিয়া', 'সাতক্ষীরা', 'বাগেরহাট', 'মাগুরা', 'নড়াইল', 'চুয়াডাঙ্গা', 'মেহেরপুর'] },
  { division: 'সিলেট বিভাগ', districts: ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'] },
  { division: 'ময়মনসিংহ বিভাগ', districts: ['ময়মনসিংহ', 'জামালপুর', 'নেত্রকোনা', 'শেরপুর'] },
  { division: 'বরিশাল বিভাগ', districts: ['বরিশাল', 'পটুয়াখালী', 'ভোলা', 'পিরোজপুর', 'ঝালকাঠি', 'বরগুনা'] }
];

export const DISTRICTS = DISTRICT_GROUPS.flatMap((g) => g.districts);

/** Listing's district: the saved one, or (older ads) the first district named in the free-text location. */
export const districtOf = (item) => {
  if (item?.district && DISTRICTS.includes(item.district)) return item.district;
  const loc = String(item?.location || '');
  return DISTRICTS.find((d) => loc.includes(d)) || '';
};
