import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import Cal, { getCalApi } from '@calcom/embed-react';
import { Candidate } from '../types';

interface Props {
  calUrl: string;
  candidate?: Candidate | null;
  onClose: () => void;
}

// Extract the calLink path from a full Cal.com URL.
// "https://cal.com/george/30min" → "george/30min"
// "https://cal.com/george" → "george"
function extractCalLink(calUrl: string): string {
  try {
    const url = new URL(calUrl);
    return url.pathname.replace(/^\//, '');
  } catch {
    return calUrl;
  }
}

export const CalScheduleOverlay: React.FC<Props> = ({ calUrl, candidate, onClose }) => {
  const [ready, setReady] = useState(false);
  const calLink = extractCalLink(calUrl);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Initialise Cal embed API and set brand colour to match Trussk orange
  useEffect(() => {
    getCalApi({}).then(cal => {
      cal('ui', {
        theme: 'light',
        hideEventTypeDetails: false,
        layout: 'month_view',
        cssVarsPerTheme: {
          light: { 'cal-brand': '#f97316' },
          dark: { 'cal-brand': '#f97316' },
        },
      });
      setReady(true);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-50 flex flex-col bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-bold text-brand">
              {candidate?.fullName?.split(' ').map(w => w[0]).slice(0, 2).join('') ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Scheduling interview with</p>
            <p className="text-[17px] font-semibold text-gray-900 mt-0.5">
              {candidate?.fullName ?? 'Candidate'}
              {candidate?.title && (
                <span className="text-gray-400 font-normal text-[14px]"> · {candidate.title}</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cal embed */}
      <div className="flex-1 overflow-y-auto relative">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        )}
        <Cal
          calLink={calLink}
          config={{
            name: candidate?.fullName ?? '',
            email: candidate?.email ?? '',
          }}
          style={{ width: '100%', height: '100%', minHeight: '600px' }}
        />
      </div>
    </motion.div>
  );
};
