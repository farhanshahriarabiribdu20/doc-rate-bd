import React from 'react';
import { NumField, Stat, Note, Grid, money, signed, fix, useSaved } from './ui';
import { layerDaily } from '../../utils/farmCalc';

export default function LayerEggs() {
  const [s, setS] = useSaved('fn_tools_layer', { birds: 1000, henDay: 85, eggPrice: 11, feedG: 115, bag: 3400, other: 0.5 });
  const set = (k) => (v) => setS({ ...s, [k]: v });
  const r = layerDaily({ birds: s.birds, henDayPct: s.henDay, eggPrice: s.eggPrice, feedG: s.feedG, feedBagPrice: s.bag, otherPerBird: s.other });
  return (
    <div className="space-y-5">
      <Grid cols={3}>
        <NumField label="মুরগির সংখ্যা" value={s.birds} onChange={set('birds')} />
        <NumField label="হেন-ডে ডিম (%)" value={s.henDay} onChange={set('henDay')} hint="যত % মুরগি আজ ডিম দিচ্ছে" />
        <NumField label="ডিমের দাম (৳/পিস)" value={s.eggPrice} onChange={set('eggPrice')} step="0.5" />
        <NumField label="ফিড/মুরগি/দিন (গ্রাম)" value={s.feedG} onChange={set('feedG')} />
        <NumField label="ফিড বস্তা ৫০ কেজি (৳)" value={s.bag} onChange={set('bag')} />
        <NumField label="অন্য খরচ/মুরগি/দিন (৳)" value={s.other} onChange={set('other')} step="0.1" hint="ওষুধ, শ্রমিক, বিদ্যুৎ" />
      </Grid>
      <Grid cols={3}>
        <Stat label="প্রতিদিন ডিম" value={`${Math.round(r.eggs).toLocaleString('en-US')} টি`} sub={`${fix(r.eggs / 12, 1)} ডজন`} />
        <Stat label="প্রতিদিন আয়" value={money(r.revenue)} />
        <Stat label="প্রতিদিন খরচ" value={money(r.cost)} sub={`ফিড ${money(r.feedCost)}`} />
        <Stat label="প্রতিদিন লাভ" value={signed(r.profit)} tone={r.profit >= 0 ? 'good' : 'bad'} />
        <Stat label="মাসে লাভ (৩০ দিন)" value={signed(r.profit * 30)} tone={r.profit >= 0 ? 'good' : 'bad'} />
        <Stat label="প্রতি ডিমের উৎপাদন খরচ" value={`৳${fix(r.costPerEgg)}`} tone="warn" sub={`ডজন ৳${Math.round(r.costPerEgg * 12)}`} />
      </Grid>
      <Note>হেন-ডে ৮০–৯০% ভালো ধরা হয়। প্রতি ডিমের খরচ বাজারদরের নিচে থাকলেই লাভ। ইনপুট আপনার ফোনে সেভ থাকে।</Note>
    </div>
  );
}
