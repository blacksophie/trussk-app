import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Video, Phone, Loader2, Link } from 'lucide-react';
import { Candidate, Interview } from '../types';
import { auth } from '../lib/firebase';

const TIMES = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM',
  '5:00 PM', '5:30 PM', '6:00 PM',
];

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

interface Props {
  candidates: Candidate[];
  defaultDate?: string; // YYYY-MM-DD
  userId: string;
  jobId?: string;
  onSchedule: (interview: Omit<Interview, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

export const ScheduleInterviewModal: React.FC<Props> = ({
  candidates,
  defaultDate,
  userId,
  jobId,
  onSchedule,
  onClose,
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate ?? todayStr);
  const [time, setTime] = useState('10:00 AM');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [locationType, setLocationType] = useState<'Video' | 'Phone'>('Video');
  const [manualUrl, setManualUrl] = useState('');
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCandidate = candidates.find(c => c.id === candidateId) ?? candidates[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setLoading(true);
    setError('');

    let meetingUrl: string | undefined;

    if (locationType === 'Video') {
      if (showManualUrl && manualUrl.trim()) {
        meetingUrl = manualUrl.trim();
      } else {
        try {
          const user = auth.currentUser;
          if (user) {
            const idToken = await user.getIdToken();
            const res = await fetch('/api/create-meeting', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                date,
                time,
                durationMinutes,
                candidateName: selectedCandidate.fullName,
              }),
            });
            const data = await res.json();
            meetingUrl = data.meetingUrl ?? undefined;
            // If no provider connected, show manual URL input
            if (!meetingUrl && !showManualUrl) {
              setShowManualUrl(true);
              setLoading(false);
              setError('No calendar connected. Paste a meeting link below or connect Google / Microsoft in Integrations.');
              return;
            }
          }
        } catch (err) {
          console.error('[ScheduleInterviewModal] create-meeting error:', err);
          setShowManualUrl(true);
          setLoading(false);
          setError('Could not auto-create meeting. Paste a link below.');
          return;
        }
      }
    }

    const initials = selectedCandidate.firstName?.[0] ?? selectedCandidate.fullName[0];
    const interview: Omit<Interview, 'id' | 'createdAt'> = {
      candidateId: selectedCandidate.id ?? candidateId,
      candidateName: selectedCandidate.fullName,
      candidateAvatarUrl: selectedCandidate.avatarUrl,
      candidateInitials: initials,
      type: locationType === 'Video' ? 'Video Interview' : 'Phone Screen',
      locationType,
      date,
      time,
      duration: `${durationMinutes} min`,
      meetingUrl,
      userId,
      jobId,
    };

    try {
      await onSchedule(interview);
      onClose();
    } catch (err) {
      setError('Failed to save interview. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Schedule Interview</h2>
              <p className="text-xs text-gray-400 mt-0.5">Set up a call with your candidate</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Candidate */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Candidate</label>
              <select
                value={candidateId}
                onChange={e => setCandidateId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.fullName} — {c.title}</option>
                ))}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time</label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMinutes(d.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      durationMinutes === d.value
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Format</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLocationType('Video')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    locationType === 'Video'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  Video Call
                </button>
                <button
                  type="button"
                  onClick={() => setLocationType('Phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    locationType === 'Phone'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Phone Call
                </button>
              </div>
            </div>

            {/* Manual meeting URL (shown on fallback) */}
            {locationType === 'Video' && showManualUrl && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  <Link className="w-3 h-3 inline mr-1" />
                  Meeting Link (optional)
                </label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || candidates.length === 0}
              className="w-full py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating meeting…
                </>
              ) : (
                'Schedule Interview'
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
