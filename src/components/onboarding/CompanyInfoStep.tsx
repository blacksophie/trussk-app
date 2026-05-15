// src/components/onboarding/CompanyInfoStep.tsx
import React, { useState } from 'react';
import { NICHE } from '../../config/niche';

export interface CompanyInfo {
  companyName: string;
  industry: string;
  companySize: string;
  role: string;
}

interface Props {
  onContinue: (info: CompanyInfo) => void;
  onSkip: () => void;
}

const FIELD_CLASS = "w-full px-3.5 py-[11px] border border-gray-200 rounded-lg text-[14px] text-gray-900 focus:outline-none focus:border-brand transition-colors bg-white";
const LABEL_CLASS = "block text-[12px] font-semibold text-gray-600 mb-1.5";

export default function CompanyInfoStep({ onContinue, onSkip }: Props) {
  const [form, setForm] = useState<CompanyInfo>({
    companyName: '',
    industry: 'Heavy Civil',
    companySize: '51–200 employees',
    role: 'Recruiter',
  });

  const set = (key: keyof CompanyInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue(form);
  };

  return (
    <div className="w-full max-w-[520px]">
      <p className="text-[11px] font-bold text-brand uppercase tracking-widest mb-2">STEP 1 OF 3</p>
      <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mb-2">Tell us about your company</h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Help us tailor {NICHE.appName} to your hiring needs. This lets us surface the most relevant candidates and market data for your industry.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={LABEL_CLASS}>Company Name *</label>
          <input
            type="text"
            required
            value={form.companyName}
            onChange={set('companyName')}
            placeholder="e.g. Manatee Construction Group"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Industry</label>
          <select value={form.industry} onChange={set('industry')} className={FIELD_CLASS}>
            {['Heavy Civil', 'Infrastructure', 'Utilities', 'General Construction', 'Other'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Company Size</label>
          <select value={form.companySize} onChange={set('companySize')} className={FIELD_CLASS}>
            {['1–10 employees', '11–50 employees', '51–200 employees', '200+ employees'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Your Role</label>
          <select value={form.role} onChange={set('role')} className={FIELD_CLASS}>
            {['Recruiter', 'Hiring Manager', 'Founder / CEO', 'HR Director'].map(o => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
          <button type="button" onClick={onSkip} className="text-[13px] text-gray-400 hover:text-gray-600 underline underline-offset-2">
            I'll do this later
          </button>
          <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-lg text-[13px] hover:opacity-90 transition-opacity">
            Save and continue →
          </button>
        </div>
      </form>
    </div>
  );
}
