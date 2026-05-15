// src/components/onboarding/WelcomeModal.tsx
import { motion } from 'motion/react';
import { NICHE } from '../../config/niche';

interface Props {
  onPostFirstJob: () => void;
}

export default function WelcomeModal({ onPostFirstJob }: Props) {
  return (
    <div className="fixed inset-0 bg-black/35 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl p-10 w-[460px] text-center shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
      >
        {/* Icon ring */}
        <div className="w-16 h-16 rounded-full border-2 border-orange-200 bg-orange-50 flex items-center justify-center mx-auto mb-6 text-3xl">
          🎉
        </div>

        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">Welcome to {NICHE.appName}</h2>
        <p className="text-[14px] text-gray-500 leading-relaxed mb-7">
          You're all set! Start posting jobs and let AI find, score, and rank the right infrastructure candidates for you — in minutes.
        </p>

        <button
          onClick={onPostFirstJob}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-lg text-[14px] hover:opacity-90 transition-opacity"
        >
          Post your first job →
        </button>
      </motion.div>
    </div>
  );
}
