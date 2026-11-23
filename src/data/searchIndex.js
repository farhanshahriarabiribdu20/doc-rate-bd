// Static entries of the master search: pages, tools, community links.
export const PAGES = [
  { id: 'p-doc', label: 'বাচ্চার দর (DOC রেট)', desc: 'আজকের ব্রয়লার, সোনালী, লেয়ার বাচ্চার রেট', kw: 'doc chick রেট দাম বাচ্চা ব্রয়লার সোনালী লেয়ার কক', go: { type: 'tab', tab: 'doc' }, icon: '🐣' },
  { id: 'p-ready', label: 'রেডি মুরগি ও ডিমের রেট', desc: 'আঞ্চলিক রেডি ব্রয়লার, কালার, সোনালী ও ডিম', kw: 'ready মুরগি ডিম egg broiler মোকাম আঞ্চলিক', go: { type: 'tab', tab: 'ready' }, icon: '🍗' },
  { id: 'p-market', label: 'বিক্রির বাজার', desc: 'খামারিদের বিজ্ঞাপন, বিক্রেতা ও ক্রেতা', kw: 'marketplace বিজ্ঞাপন বিক্রেতা ক্রেতা বিক্রি কেনা', go: { type: 'tab', tab: 'market' }, icon: '🛒' },
  { id: 'p-feed', label: 'পোল্ট্রি ফিডের দাম', desc: 'কোম্পানি ভিত্তিক ফিডের বস্তা প্রতি দাম', kw: 'feed ফিড খাবার দাম বস্তা', go: { type: 'feed' }, icon: '🌾' },
  { id: 'p-weekly', label: 'এই সপ্তাহের বাজার', desc: 'সাপ্তাহিক রেট বাড়া-কমার সারসংক্ষেপ', kw: 'weekly সাপ্তাহিক সারসংক্ষেপ বাড়ল কমল', go: { type: 'weekly' }, icon: '📊' },
  { id: 'p-trend', label: 'রেটের ট্রেন্ড চার্ট', desc: 'কোম্পানি অনুযায়ী দিন ধরে রেটের গ্রাফ', kw: 'trend chart গ্রাফ চার্ট ইতিহাস', go: { type: 'trend' }, icon: '📈' }
];

export const TOOLS_META = [
  { id: 'fcr', label: 'FCR ও ফিড হিসাব', desc: 'FCR বের করুন, ব্যাচে কত বস্তা ফিড লাগবে', kw: 'fcr feed conversion ফিড বস্তা', icon: '🌾' },
  { id: 'diary', label: 'ব্যাচ ডায়েরি', desc: 'প্রতিদিনের ফিড, মৃত্যু, খরচ ও লাভ-ক্ষতি', kw: 'diary ডায়েরি খাতা হিসাব ব্যাচ', icon: '📒' },
  { id: 'vaccine', label: 'টিকা সূচি', desc: 'বাচ্চা তোলার তারিখ দিলে টিকার তারিখ', kw: 'vaccine টিকা ভ্যাকসিন রোগ', icon: '💉' },
  { id: 'brooding', label: 'ব্রুডিং গাইড', desc: 'বয়স অনুযায়ী তাপমাত্রা, আর্দ্রতা ও আলো', kw: 'brooding তাপমাত্রা আর্দ্রতা আলো তাপ', icon: '🌡️' },
  { id: 'space', label: 'শেড ও জায়গা', desc: 'শেডে কয়টি মুরগি ধরবে, ফিডার-ড্রিংকার', kw: 'shed শেড জায়গা ফিডার ড্রিংকার ঘনত্ব', icon: '📐' },
  { id: 'risk', label: 'দামের ঝুঁকি', desc: 'ফিড ও বিক্রয়দর বদলালে লাভ-ক্ষতি', kw: 'risk ঝুঁকি দাম বদল লাভ ক্ষতি', icon: '⚖️' },
  { id: 'layer', label: 'লেয়ার ডিম হিসাব', desc: 'হেন-ডে, প্রতি ডিমের খরচ, দৈনিক লাভ', kw: 'layer লেয়ার ডিম egg হেন-ডে', icon: '🥚' },
  { id: 'mix', label: 'ফিড মিক্স', desc: 'নিজের ফিড ফর্মুলার প্রোটিন, শক্তি ও খরচ', kw: 'mix ফর্মুলা প্রোটিন শক্তি নিজের ফিড', icon: '🧪' },
  { id: 'mort', label: 'মৃত্যুহার ক্ষতি', desc: 'মুরগি মরলে কত টাকা ক্ষতি', kw: 'mortality মৃত্যু মরা ক্ষতি', icon: '📉' }
];

export const PROFIT = { id: 'profit', label: 'লাভ-ক্ষতি ক্যালকুলেটর (ব্রয়লার)', desc: 'বাচ্চা, ফিড, বিক্রয়দর দিয়ে ব্যাচের লাভ', kw: 'profit calculator ক্যালকুলেটর লাভ ক্ষতি ব্রেক ইভেন', icon: '🧮' };
