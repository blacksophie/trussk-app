// src/components/onboarding/InviteTeamStep.tsx
import React, { useState } from 'react';

interface InviteRow {
  email: string;
  role: string;
}

interface Props {
  onSend: (invites: InviteRow[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

const ROLES = ['Recruiter', 'Hiring Manager', 'Admin', 'Viewer'];

export default function InviteTeamStep({ onSend, onSkip, onBack }: Props) {
  const [rows, setRows] = useState<InviteRow[]>([
    { email: '', role: 'Recruiter' },
    { email: '', role: 'Recruiter' },
  ]);

  const updateRow = (i: number, field: keyof InviteRow, value: string) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));

  const addRow = () => {
    if (rows.length < 10) setRows(r => [...r, { email: '', role: 'Recruiter' }]);
  };

  const handleSend = () => {
    const filled = rows.filter(r => r.email.trim());
    onSend(filled);
  };

  return (
    <div className="w-full max-w-[520px]">
      <p className="text-[11px] font-bold text-brand uppercase tracking-widest mb-2">STEP 2 OF 3</p>
      <h1 className="text-[26px] font-bold text-gray-900 tracking-tight mb-2">Invite the rest of your team</h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Invite your co-workers to collaborate on hiring. They'll receive an email with instructions to join your Trussk workspace.
      </p>

      <p className="text-[12px] font-semibold text-gray-600 mb-3">Invite co-workers to Trussk</p>

      <div className="space-y-2.5 mb-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2.5 items-center">
            <div className="flex-1 flex items-center border border-gray-200 rounded-lg px-3 focus-within:border-brand transition-colors bg-white">
              <span className="text-gray-400 text-[14px] mr-2 flex-shrink-0">✉</span>
              <input
                type="email"
                value={row.email}
                onChange={e => updateRow(i, 'email', e.target.value)}
                placeholder="Enter email"
                className="flex-1 py-[10px] text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
            </div>
            <select
              value={row.role}
              onChange={e => updateRow(i, 'role', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-[10px] text-[13px] text-gray-700 focus:outline-none focus:border-brand transition-colors bg-white min-w-[130px] appearance-none"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
            >
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>

      {rows.length < 10 && (
        <button type="button" onClick={addRow} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-brand transition-colors mb-6">
          <span className="text-[16px]">+</span> Add more
        </button>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-5">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <button type="button" onClick={onSkip} className="text-[13px] text-gray-400 hover:text-gray-600 underline underline-offset-2">
            I'll do this later
          </button>
        </div>
        <button
          type="button"
          onClick={handleSend}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-lg text-[13px] hover:opacity-90 transition-opacity"
        >
          Send invites →
        </button>
      </div>
    </div>
  );
}
