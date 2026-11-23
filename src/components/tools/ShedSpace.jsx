import React, { useState } from 'react';
import { NumField, Stat, Note, Grid, Field, inputCls } from './ui';
import { shedCapacity } from '../../utils/farmCalc';

export default function ShedSpace() {
  const [len, setLen] = useState(40);
  const [wid, setWid] = useState(20);
  const [type, setType] = useState('broiler');
  const [summer, setSummer] = useState(false);
  const r = shedCapacity({ lengthFt: len, widthFt: wid, type, summer });
  return (
    <div className="space-y-5">
      <Grid>
        <NumField label="শেডের দৈর্ঘ্য (ফুট)" value={len} onChange={setLen} />
        <NumField label="শেডের প্রস্থ (ফুট)" value={wid} onChange={setWid} />
        <Field label="মুরগির ধরন">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="broiler">ব্রয়লার</option><option value="sonali">সোনালী/কালার</option><option value="layer">লেয়ার (ডিপ লিটার)</option><option value="breeder">ব্রিডার</option>
          </select>
        </Field>
        <Field label="মৌসুম">
          <select value={summer ? 's' : 'w'} onChange={(e) => setSummer(e.target.value === 's')} className={inputCls}>
            <option value="w">শীত/স্বাভাবিক</option><option value="s">গরমকাল (২০% বেশি জায়গা)</option>
          </select>
        </Field>
      </Grid>
      <Grid cols={3}>
        <Stat label="শেডের মোট জায়গা" value={`${r.area.toLocaleString('en-US')} বর্গফুট`} />
        <Stat label="প্রতি মুরগির জায়গা" value={`${r.perBirdSqft.toFixed(2)} বর্গফুট`} />
        <Stat label="সর্বোচ্চ বাচ্চা" value={`${r.birds.toLocaleString('en-US')} টি`} tone="good" />
      </Grid>
      <Grid cols={4}>
        <Stat label="ফিডার (৪০টিতে ১টি)" value={r.feeders} />
        <Stat label="বেল ড্রিংকার (৮০টিতে ১টি)" value={r.bellDrinkers} />
        <Stat label="নিপল (১০টিতে ১টি)" value={r.nipples} />
        <Stat label="ব্রুডিং জায়গা (১ম সপ্তাহ)" value={`${r.brooderAreaSqft} বর্গফুট`} />
      </Grid>
      <Note>আনুমানিক গাইড: ব্রয়লার ১ বর্গফুট, সোনালী ১.৫, লেয়ার ২, ব্রিডার ৩ বর্গফুট। ঘনত্ব বেশি হলে মৃত্যুহার ও রোগ বাড়ে, FCR খারাপ হয়।</Note>
    </div>
  );
}
