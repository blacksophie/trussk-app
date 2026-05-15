import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paperclip,
  ArrowUp,
  ImageIcon,
  FileUp,
  CircleUserRound,
  LayoutDashboard,
} from 'lucide-react';

interface PostJobViewProps {
  onPost: (description: string) => void;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback((reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (reset) { textarea.style.height = `${minHeight}px`; return; }
    textarea.style.height = `${minHeight}px`;
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity))}px`;
  }, [minHeight, maxHeight]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  useEffect(() => {
    const onResize = () => adjustHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

const TICKER_ITEMS = [
  { role: 'Senior Project Manager', location: 'Tampa, FL', time: '2m ago' },
  { role: 'Bridge Estimator', location: 'Miami, FL', time: '5m ago' },
  { role: 'MEP Coordinator', location: 'Orlando, FL', time: '11m ago' },
  { role: 'Heavy Civil Superintendent', location: 'Houston, TX', time: '18m ago' },
  { role: 'Infrastructure PM', location: 'Atlanta, GA', time: '24m ago' },
];

const STATS = [
  { value: '4.2d', label: 'avg. time to match' },
  { value: '94%', label: 'placement rate' },
  { value: '2,800+', label: 'roles filled' },
];

export default function PostJobView({ onPost }: PostJobViewProps) {
  const [description, setDescription] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 60, maxHeight: 300 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex(i => (i + 1) % TICKER_ITEMS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const industries = [
    { label: 'Heavy Civil', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { label: 'Road & Bridge', icon: <CircleUserRound className="w-3.5 h-3.5" /> },
    { label: 'Heavy Highway', icon: <FileUp className="w-3.5 h-3.5" /> },
    { label: 'Marine Construction', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (description.trim()) {
      onPost(description);
      setDescription('');
      adjustHeight(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-white">

      {/* Background: animated gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand/[0.06] blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -bottom-40 -right-32 w-[600px] h-[600px] rounded-full bg-amber-400/[0.06] blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-brand/[0.03] blur-[120px]"
        />
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl px-4">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-3">
            Who are we adding to the{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-brand">team?</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-1 left-0 right-0 h-[3px] bg-brand/20 rounded-full origin-left"
              />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-gray-400 text-sm"
          >
            Skip the weeks of manual searching. Our engine identifies best-fit talent in seconds.
          </motion.p>
        </motion.div>

        {/* Input card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Glow effect on focus */}
          <motion.div
            animate={{ opacity: isFocused ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-brand/20 via-amber-400/10 to-brand/20 blur-sm pointer-events-none"
          />

          <div className={`relative bg-white rounded-2xl border transition-all duration-300 shadow-xl shadow-gray-200/60 p-4 ${
            isFocused ? 'border-brand/30' : 'border-gray-100'
          }`}>
            <textarea
              ref={textareaRef}
              value={description}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={(e) => { setDescription(e.target.value); adjustHeight(); }}
              onKeyDown={handleKeyDown}
              placeholder="Upload job order or describe the role you're looking for..."
              className="w-full px-3 py-2 bg-transparent border-none text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-0 resize-none leading-relaxed min-h-[60px]"
              style={{ overflow: 'hidden' }}
            />

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-brand/5 rounded-lg transition-all group disabled:opacity-50"
              >
                {isParsing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Paperclip className="text-brand w-4 h-4" />
                  </motion.div>
                ) : (
                  <Paperclip className="text-brand w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-600 hidden sm:inline transition-colors">
                  {isParsing ? 'Reading file...' : 'Attach JD'}
                </span>
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsParsing(true);
                  setParseError('');
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/parse-document', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to parse file');
                    setDescription(data.text);
                    setTimeout(() => adjustHeight(), 0);
                  } catch (err: any) {
                    setParseError(err.message || 'Could not read file. Try PDF, DOCX, or TXT.');
                  } finally {
                    setIsParsing(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }
                }}
              />
              {parseError && <p className="text-[10px] text-red-400 font-medium">{parseError}</p>}

              <motion.button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!description.trim()}
                whileHover={description.trim() ? { scale: 1.1 } : {}}
                whileTap={description.trim() ? { scale: 0.9 } : {}}
                className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                  description.trim()
                    ? 'bg-brand text-white shadow-lg shadow-brand/30'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Industry quick-fill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex items-center justify-center gap-2 mt-5"
        >
          {industries.map((industry, i) => (
            <motion.button
              key={industry.label}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                const base = `I'm looking for a ${industry.label} professional:\n\n`;
                setDescription(prev => prev.startsWith("I'm looking for") ? prev.replace(/^I'm looking for a .*? professional:[\r\n]+/, base) : base + prev);
                setTimeout(() => adjustHeight(), 0);
              }}
              className="group flex items-center gap-1.5 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100 text-gray-500 hover:text-brand hover:border-brand/30 hover:bg-brand/5 hover:shadow-md hover:-translate-y-0.5 transition-all text-[11px] font-medium shadow-sm cursor-pointer"
            >
              <span className="text-brand/60 group-hover:text-brand transition-colors">{industry.icon}</span>
              {industry.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="flex items-center justify-center gap-8 mt-10"
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-base font-semibold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Live activity ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="flex items-center justify-center gap-2 mt-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <div className="relative h-5 overflow-hidden w-64">
            <AnimatePresence mode="wait">
              <motion.p
                key={tickerIndex}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 text-[11px] text-gray-400 text-center whitespace-nowrap"
              >
                <span className="text-gray-600 font-medium">{TICKER_ITEMS[tickerIndex].role}</span>
                {' · '}{TICKER_ITEMS[tickerIndex].location}
                {' · '}<span className="text-gray-300">{TICKER_ITEMS[tickerIndex].time}</span>
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
