import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Lightbulb,
  Users,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { NICHE } from '../config/niche';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = 'bug' | 'feature' | 'candidate_quality' | 'coverage' | 'general';
type Rating = 1 | 2 | 3 | 4 | 5;

interface RecentSubmission {
  id: string;
  category: Category;
  rating: Rating;
  message: string;
  submittedAt: any;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; icon: React.FC<{ className?: string }>; placeholder: string }[] = [
  {
    id: 'bug',
    label: 'Bug Report',
    icon: AlertCircle,
    placeholder: 'Describe what happened and where in the app.',
  },
  {
    id: 'feature',
    label: 'Feature Request',
    icon: Lightbulb,
    placeholder: 'What would you like to see added or improved?',
  },
  {
    id: 'candidate_quality',
    label: 'Candidate Quality',
    icon: Users,
    placeholder: 'Which role or search did this relate to?',
  },
  {
    id: 'coverage',
    label: 'Role Coverage',
    icon: Briefcase,
    placeholder: "What trade, role, or market can't you find candidates for?",
  },
  {
    id: 'general',
    label: 'General',
    icon: MessageSquare,
    placeholder: 'Anything on your mind.',
  },
];

const RATINGS: { value: Rating; label: string }[] = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Very Good' },
  { value: 5, label: 'Excellent' },
];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  candidate_quality: 'Candidate Quality',
  coverage: 'Role Coverage',
  general: 'General',
};

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FeedbackView() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'feedback'),
      where('userId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(3)
    );
    getDocs(q).then(snap => {
      setRecent(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecentSubmission)));
    }).catch(() => {});
  }, [user, submitted]);

  const placeholder = category
    ? CATEGORIES.find(c => c.id === category)?.placeholder ?? 'Tell us more.'
    : 'Select a category above, then share your thoughts.';

  const canSubmit = rating !== null && category !== null && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email ?? '',
        category,
        rating,
        message: message.trim(),
        niche: NICHE.id,
        submittedAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setRating(null);
    setCategory(null);
    setMessage('');
    setError(null);
    setSubmitted(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Feedback</h1>
          <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-lg">
            Help us build the best recruiting tool for {NICHE.display}. Every submission is reviewed and used to prioritise what we build next.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            /* ── Success state ─────────────────────────────────────────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-[18px] font-bold text-gray-900 mb-2">Thank you.</h2>
              <p className="text-[13px] text-gray-500 leading-relaxed max-w-sm">
                Your feedback has been received. We review every submission and use it to prioritise what we build next.
              </p>
              <button
                onClick={handleReset}
                className="mt-6 text-[13px] font-medium text-brand hover:underline"
              >
                Submit another →
              </button>
            </motion.div>
          ) : (
            /* ── Form ──────────────────────────────────────────────────────── */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >

              {/* Rating */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  How is {NICHE.appName} working for you?
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {RATINGS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setRating(r.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-center transition-all ${
                        rating === r.value
                          ? 'bg-brand border-brand text-white shadow-sm shadow-brand/20'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-brand/40 hover:bg-orange-50'
                      }`}
                    >
                      <span className={`text-[18px] font-bold leading-none ${rating === r.value ? 'text-white' : 'text-gray-800'}`}>
                        {r.value}
                      </span>
                      <span className={`text-[10px] font-medium leading-none ${rating === r.value ? 'text-white/80' : 'text-gray-400'}`}>
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  What is this about?
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[13px] font-medium transition-all ${
                          active
                            ? 'bg-brand border-brand text-white shadow-sm shadow-brand/20'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-brand/40 hover:bg-orange-50'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-gray-400'}`} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Tell us more
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={placeholder}
                  rows={5}
                  className="w-full text-[13px] text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  {message.length > 0 && message.trim().length < 10 ? (
                    <p className="text-[11px] text-amber-500">Add a few more details to submit.</p>
                  ) : (
                    <span />
                  )}
                  <p className={`text-[11px] ml-auto ${message.length > 1000 ? 'text-red-400' : 'text-gray-300'}`}>
                    {message.length}/1000
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[13px] text-red-600">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand text-white text-[14px] font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-brand/20"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Feedback'
                )}
              </button>

              {/* Recent submissions */}
              {recent.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Your recent submissions
                  </p>
                  <div className="space-y-2">
                    {recent.map(sub => {
                      const cat = CATEGORIES.find(c => c.id === sub.category);
                      const Icon = cat?.icon ?? MessageSquare;
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-700">
                              {CATEGORY_LABELS[sub.category]}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{sub.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {sub.rating}/5
                            </span>
                            <span className="text-[10px] text-gray-300">{formatDate(sub.submittedAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
