import { useEffect } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { Candidate } from '../types';

interface Props {
  calUrl: string;
  candidate?: Candidate | null;
  onClose: () => void;
}

export const CalScheduleOverlay: React.FC<Props> = ({ calUrl, candidate, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Append candidate name + email as Cal.com prefill query params
  const iframeSrc = (() => {
    try {
      const url = new URL(calUrl);
      if (candidate?.fullName) url.searchParams.set('name', candidate.fullName);
      if (candidate?.email) url.searchParams.set('email', candidate.email);
      return url.toString();
    } catch {
      return calUrl;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white shadow-sm">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Scheduling interview with</p>
          <p className="text-[17px] font-semibold text-gray-900 mt-0.5">
            {candidate?.fullName ?? 'Candidate'}
            {candidate?.title && (
              <span className="text-gray-400 font-normal text-[14px]"> · {candidate.title}</span>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <iframe
        src={iframeSrc}
        className="flex-1 w-full border-0"
        allow="payment"
        title="Schedule interview"
      />
    </motion.div>
  );
};
