import React from 'react';
import { Search, LayoutGrid, Table, ArrowUpDown, MapPin, X } from 'lucide-react';
import { CATEGORIES } from '../data/initialData';
import { ZONES, ZONE_GROUPS } from '../data/zones';

export default function FilterBar({
  selectedCategory,
  setSelectedCategory,
  selectedDivision,
  setSelectedDivision,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  lang
}) {
  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <span>{lang === 'bn' ? cat.labelBn : cat.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls: Search, Division, Sort, View Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center pt-1 border-t border-slate-100">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'কোম্পানি বা জাতের নাম লিখে খুঁজুন...' : 'Search company or breed...'}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Division Filter */}
        <div className="lg:col-span-3 relative">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mr-2" />
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">{lang === 'bn' ? 'সমগ্র বাংলাদেশ (জাতীয় গড়)' : 'All Bangladesh (National Avg)'}</option>
              {ZONE_GROUPS.map((g) => (
                <optgroup key={g.id} label={lang === 'bn' ? g.bn : g.en}>
                  {ZONES.filter((z) => z.group === g.id).map((z) => (
                    <option key={z.id} value={z.id}>{lang === 'bn' ? z.bn : z.en}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="lg:col-span-3 relative">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="default">{lang === 'bn' ? 'সাধারণ সাজানো (Default)' : 'Default Order'}</option>
              <option value="price_asc">{lang === 'bn' ? 'দাম: কম থেকে বেশি' : 'Price: Low to High'}</option>
              <option value="price_desc">{lang === 'bn' ? 'দাম: বেশি থেকে কম' : 'Price: High to Low'}</option>
              <option value="company_asc">{lang === 'bn' ? 'কোম্পানি নাম (A-Z)' : 'Company Name (A-Z)'}</option>
            </select>
          </div>
        </div>

        {/* View Mode Switcher: Cards vs Table */}
        <div className="lg:col-span-2 flex items-center justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('cards')}
              title={lang === 'bn' ? 'কার্ড ভিউ' : 'Card View'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title={lang === 'bn' ? 'টেবিল ভিউ' : 'Table View'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
