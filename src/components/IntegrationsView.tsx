import { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  onCalUrlChange?: (url: string) => void;
}

export function IntegrationsView({ onCalUrlChange }: Props) {
  const [calUrl, setCalUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'users', uid)).then(snap => {
      const url = snap.data()?.calUrl ?? '';
      setCalUrl(url);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setError(null);
    if (!calUrl.startsWith('https://')) {
      setError('URL must start with https://');
      return;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', uid), { calUrl, updatedAt: serverTimestamp() }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onCalUrlChange?.(calUrl);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-bold text-gray-900 tracking-tight">Integrations</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Connect your scheduling tool so candidates can book interviews directly.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="#f97316" strokeWidth="2" />
                <path d="M3 9h18" stroke="#f97316" strokeWidth="2" />
                <path d="M8 2v4M16 2v4" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-900">Cal.com</p>
              <p className="text-[11px] text-gray-400">Interview scheduling</p>
            </div>
          </div>

          <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
            Your booking URL
          </label>
          <div className="flex gap-2">
            <input
              value={calUrl}
              onChange={e => { setCalUrl(e.target.value); setSaved(false); }}
              placeholder="https://cal.com/your-username"
              className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <button
              onClick={handleSave}
              disabled={saving || !calUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white text-[13px] font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : 'Save'}
            </button>
          </div>

          {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}

          <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
            Paste your Cal.com booking page URL. This appears when you schedule interviews with candidates.
          </p>

          {calUrl.startsWith('https://') && (
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Preview your booking page
            </a>
          )}
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-[12px] font-semibold text-blue-800 mb-1">Don't have a Cal.com account?</p>
          <p className="text-[11px] text-blue-600 leading-relaxed">
            Cal.com is free and open source.{' '}
            <a
              href="https://cal.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Create a free account →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
