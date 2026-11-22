// Regions used by DOC rates. A rate is per division (see DIVISIONS in initialData.js);
// "all" is the national average. Districts are mapped to their division so a message
// that says "Cumilla" or "Bogura" still lands on the right division.
export const DIVISION_IDS = ['dhaka', 'chittagong', 'rajshahi', 'rangpur', 'khulna', 'sylhet', 'mymensingh', 'barisal'];

// division id -> words that mean that division (Bangla / English / short forms)
export const DIVISION_WORDS = {
  dhaka: ['ঢাকা', 'dhaka', 'dhk', 'dacca'],
  chittagong: ['চট্টগ্রাম', 'চিটাগাং', 'চট্টগ্রাম', 'ctg', 'chattogram', 'chittagong', 'chitagong'],
  rajshahi: ['রাজশাহী', 'rajshahi', 'rajshai'],
  rangpur: ['রংপুর', 'rangpur'],
  khulna: ['খুলনা', 'khulna'],
  sylhet: ['সিলেট', 'sylhet'],
  mymensingh: ['ময়মনসিংহ', 'ময়মনসিং', 'mymensingh', 'mymensing'],
  barisal: ['বরিশাল', 'barisal', 'barishal']
};

// Whole-country words
export const ALL_WORDS = ['সারাদেশ', 'সারা দেশ', 'সমগ্র বাংলাদেশ', 'সমগ্র', 'জাতীয়', 'national', 'all bangladesh', 'all over', 'সব এলাকা', 'সকল এলাকা'];

// district -> division id (so "Cumilla 41" is understood; the admin can still change it)
export const DISTRICT_TO_DIVISION = {
  // Dhaka division
  গাজীপুর: 'dhaka', gazipur: 'dhaka', নারায়ণগঞ্জ: 'dhaka', narayanganj: 'dhaka', নরসিংদী: 'dhaka', narsingdi: 'dhaka',
  টাঙ্গাইল: 'dhaka', tangail: 'dhaka', কিশোরগঞ্জ: 'dhaka', kishoreganj: 'dhaka', মানিকগঞ্জ: 'dhaka', manikganj: 'dhaka',
  মুন্সীগঞ্জ: 'dhaka', munshiganj: 'dhaka', ফরিদপুর: 'dhaka', faridpur: 'dhaka', গোপালগঞ্জ: 'dhaka', gopalganj: 'dhaka', gopalgonj: 'dhaka',
  মাদারীপুর: 'dhaka', madaripur: 'dhaka', শরীয়তপুর: 'dhaka', shariatpur: 'dhaka', রাজবাড়ী: 'dhaka', rajbari: 'dhaka', সাভার: 'dhaka', savar: 'dhaka',
  // Chattogram division
  কুমিল্লা: 'chittagong', cumilla: 'chittagong', comilla: 'chittagong', নোয়াখালী: 'chittagong', noakhali: 'chittagong',
  ফেনী: 'chittagong', feni: 'chittagong', চাঁদপুর: 'chittagong', chandpur: 'chittagong', ব্রাহ্মণবাড়িয়া: 'chittagong', brahmanbaria: 'chittagong',
  কক্সবাজার: 'chittagong', "cox's bazar": 'chittagong', coxsbazar: 'chittagong', লক্ষ্মীপুর: 'chittagong', lakshmipur: 'chittagong',
  রাঙ্গামাটি: 'chittagong', rangamati: 'chittagong', বান্দরবান: 'chittagong', bandarban: 'chittagong', খাগড়াছড়ি: 'chittagong', khagrachhari: 'chittagong',
  // Rajshahi division
  বগুড়া: 'rajshahi', bogura: 'rajshahi', bogra: 'rajshahi', পাবনা: 'rajshahi', pabna: 'rajshahi', নাটোর: 'rajshahi', natore: 'rajshahi',
  নওগাঁ: 'rajshahi', naogaon: 'rajshahi', সিরাজগঞ্জ: 'rajshahi', sirajganj: 'rajshahi', জয়পুরহাট: 'rajshahi', joypurhat: 'rajshahi',
  চাঁপাইনবাবগঞ্জ: 'rajshahi', chapainawabganj: 'rajshahi',
  // Rangpur division
  দিনাজপুর: 'rangpur', dinajpur: 'rangpur', গাইবান্ধা: 'rangpur', gaibandha: 'rangpur', কুড়িগ্রাম: 'rangpur', kurigram: 'rangpur',
  নীলফামারী: 'rangpur', nilphamari: 'rangpur', ঠাকুরগাঁও: 'rangpur', thakurgaon: 'rangpur', লালমনিরহাট: 'rangpur', lalmonirhat: 'rangpur',
  পঞ্চগড়: 'rangpur', panchagarh: 'rangpur',
  // Khulna division
  যশোর: 'khulna', jashore: 'khulna', jessore: 'khulna', ঝিনাইদহ: 'khulna', jhenaidah: 'khulna', কুষ্টিয়া: 'khulna', kushtia: 'khulna',
  সাতক্ষীরা: 'khulna', satkhira: 'khulna', বাগেরহাট: 'khulna', bagerhat: 'khulna', মাগুরা: 'khulna', magura: 'khulna', নড়াইল: 'khulna', narail: 'khulna',
  চুয়াডাঙ্গা: 'khulna', chuadanga: 'khulna', মেহেরপুর: 'khulna', meherpur: 'khulna',
  // Sylhet division
  মৌলভীবাজার: 'sylhet', moulvibazar: 'sylhet', হবিগঞ্জ: 'sylhet', habiganj: 'sylhet', সুনামগঞ্জ: 'sylhet', sunamganj: 'sylhet',
  // Mymensingh division
  জামালপুর: 'mymensingh', jamalpur: 'mymensingh', নেত্রকোনা: 'mymensingh', netrokona: 'mymensingh', শেরপুর: 'mymensingh', sherpur: 'mymensingh',
  ভালুকা: 'mymensingh', bhaluka: 'mymensingh',
  // Barisal division
  পটুয়াখালী: 'barisal', patuakhali: 'barisal', ভোলা: 'barisal', bhola: 'barisal', পিরোজপুর: 'barisal', pirojpur: 'barisal',
  ঝালকাঠি: 'barisal', jhalokathi: 'barisal', বরগুনা: 'barisal', barguna: 'barisal'
};
