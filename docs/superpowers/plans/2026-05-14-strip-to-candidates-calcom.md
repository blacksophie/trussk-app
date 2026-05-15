# Strip to Candidates + Cal.com Scheduling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove email outreach and Google/Microsoft OAuth token features; keep the Calendar tab; replace the Schedule Interview modal with a full-screen Cal.com booking overlay.

**Architecture:** Pure deletion pass first (server routes, helper functions, dead files), then rewrite IntegrationsView to a Cal.com URL input, create CalScheduleOverlay, wire CalendarView to use it, and thread calUrl through App.

**Tech Stack:** React 19, TypeScript, Firebase/Firestore, Framer Motion, Tailwind, Express (server.ts / api.ts)

---

## File Map

| File | Change |
|------|--------|
| `server.ts` | Delete 4 API routes + all Gmail/REST helpers |
| `api.ts` | Delete same 4 routes + helpers |
| `src/lib/firebase.ts` | Remove Gmail/Calendar scopes, remove MSAL entirely |
| `src/types.ts` | Remove `View.OUTREACH` |
| `src/components/Sidebar.tsx` | Remove Outreach nav item |
| `src/components/IntegrationsView.tsx` | Rewrite — Cal.com URL input only |
| `src/components/CalScheduleOverlay.tsx` | **Create** — full-screen Cal.com iframe overlay |
| `src/components/CalendarView.tsx` | Swap ScheduleInterviewModal → CalScheduleOverlay |
| `src/App.tsx` | Remove OutreachView block, load calUrl, update CalendarView props |
| `firestore.rules` | Remove `app_threads` subcollection rule |
| `src/components/OutreachView.tsx` | **Delete** |
| `src/components/ScheduleInterviewModal.tsx` | **Delete** |
| `src/data/outreach.ts` | **Delete** |

---

### Task 1: Strip server.ts — remove Gmail/Calendar routes and helpers

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Remove the stale Gmail warn inside `initAdmin`**

Find and delete this line inside the `initAdmin` IIFE (around line 43):
```typescript
      console.warn('[Admin] Gmail proxy routes (/api/fetch-threads) will return 503 until a key is provided.');
```

- [ ] **Step 2: Remove Firestore REST constants**

Delete these three lines (after the `const PORT` block, around lines 64–66):
```typescript
const FB_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyCfDcC_793zUoZHKQaAWNxkbE9HEwF_nYQ';
const FB_PROJECT = process.env.FIREBASE_PROJECT_ID || 'trussk40';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;
```

- [ ] **Step 3: Remove Firestore REST helper functions**

Delete the entire bodies of these five functions (they exist between the constants block and `verifyAndGetTokens`):
- `async function verifyIdTokenRest(...)`
- `function fsFields(...)`
- `function fromFsFields(...)`
- `async function fsGet(...)`
- `async function fsList(...)`
- `async function fsSet(...)`

- [ ] **Step 4: Remove `verifyAndGetTokens`**

Delete the entire `verifyAndGetTokens` function (starts at `// Shared auth helper` comment, ends at the closing `}`).

- [ ] **Step 5: Remove the four API routes inside `startServer`**

Delete the following four route blocks (each starts with a `// ---` comment header):
1. `// GET /api/fetch-threads` block — the `app.get('/api/fetch-threads', ...)` handler
2. `// POST /api/send-candidate-email` block — `app.post('/api/send-candidate-email', ...)`
3. `// GET /api/fetch-calendar` block — `app.get('/api/fetch-calendar', ...)`
4. `// POST /api/create-meeting` block — `app.post('/api/create-meeting', ...)`

- [ ] **Step 6: Remove bottom-of-file helpers**

Delete the three functions that live below `startServer()`'s closing call:
- `function decodeBody(payload: any): string { ... }`
- `function sanitiseThread(thread: any) { ... }`
- `function sanitiseEvent(event: any) { ... }`

- [ ] **Step 7: Verify server still starts**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `adminDb` is flagged as unused, that's fine — leave it for now (still referenced in the comment block and won't affect runtime).

- [ ] **Step 8: Commit**

```bash
git add server.ts
git commit -m "chore: remove Gmail/Calendar API routes and REST helpers from server.ts"
```

---

### Task 2: Strip api.ts — same four routes and helpers

**Files:**
- Modify: `api.ts`

- [ ] **Step 1: Remove `verifyAndGetTokens` from api.ts**

Delete the block starting at `// ── shared auth helper` through the closing `}` of `verifyAndGetTokens` (lines ~161–176).

- [ ] **Step 2: Remove the three routes**

Delete the following route blocks:
1. `// ── send-candidate-email` — `app.post('/api/send-candidate-email', ...)`
2. `// ── fetch-threads` — `app.get('/api/fetch-threads', ...)`
3. `// ── fetch-calendar` — `app.get('/api/fetch-calendar', ...)`

- [ ] **Step 3: Remove helpers at bottom of api.ts**

Delete `decodeBody`, `sanitiseThread`, and `sanitiseEvent` functions (the `// ── helpers` block).

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add api.ts
git commit -m "chore: remove Gmail/Calendar routes and helpers from api.ts"
```

---

### Task 3: Strip firebase.ts — remove Gmail/Calendar OAuth scopes and MSAL

**Files:**
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Remove Gmail and Calendar scopes from googleProvider**

Replace the `googleProvider` setup block:

```typescript
// BEFORE
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent',
});
```

```typescript
// AFTER — basic identity only
export const googleProvider = new GoogleAuthProvider();
```

- [ ] **Step 2: Remove MSAL imports and everything Microsoft**

Delete these imports at the top of the file:
```typescript
import {
  PublicClientApplication,
  Configuration,
  AuthenticationResult,
} from '@azure/msal-browser';
```

Delete the entire Microsoft section (everything from `// ---------------------------------------------------------------------------\n// Microsoft` comment through the end of `signInWithMicrosoft`):
```typescript
// ---------------------------------------------------------------------------
// Microsoft — Outlook Mail + Calendar scopes via MSAL
// ...
export const msalInstance = new PublicClientApplication(msalConfig);
const MICROSOFT_SCOPES = [ ... ];
export const signInWithMicrosoft = async (): Promise<AuthenticationResult> => { ... };
```

- [ ] **Step 3: Remove `saveTokenToDB`**

Delete the entire `saveTokenToDB` function and its comment block:
```typescript
// ---------------------------------------------------------------------------
// Token persistence — writes to Firestore users/{uid}/tokens/{provider}
// ...
export async function saveTokenToDB(...) { ... }
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

If you see errors about `signInWithMicrosoft`, `saveTokenToDB`, or `msalInstance` being missing, those imports will be cleaned up in later tasks. Note them but don't fix them yet — they'll resolve when the consumers are updated.

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "chore: remove Gmail/Calendar OAuth scopes and MSAL from firebase.ts"
```

---

### Task 4: Remove View.OUTREACH from types.ts

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Delete the OUTREACH enum value**

In `src/types.ts`, find the `View` enum and remove the `OUTREACH` line:

```typescript
// BEFORE
export enum View {
  POST_JOB = 'post-job',
  CANDIDATE_LIST = 'candidate-list',
  CANDIDATE_DETAIL = 'candidate-detail',
  JOBS_POSTED = 'jobs-posted',
  OUTREACH = 'outreach',      // ← delete this line
  CALENDAR = 'calendar',
  MARKET_INTEL = 'market-intel',
  INTEGRATIONS = 'integrations',
}
```

```typescript
// AFTER
export enum View {
  POST_JOB = 'post-job',
  CANDIDATE_LIST = 'candidate-list',
  CANDIDATE_DETAIL = 'candidate-detail',
  JOBS_POSTED = 'jobs-posted',
  CALENDAR = 'calendar',
  MARKET_INTEL = 'market-intel',
  INTEGRATIONS = 'integrations',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "chore: remove View.OUTREACH from View enum"
```

---

### Task 5: Update Sidebar — remove Outreach nav item

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Remove the Outreach item from `workspaceItems`**

In `Sidebar.tsx`, find `workspaceItems` and delete the Outreach entry:

```typescript
// BEFORE
const workspaceItems = [
  { id: View.POST_JOB, label: 'Post Jobs', icon: Sparkles },
  { id: View.JOBS_POSTED, label: 'Active Jobs', icon: LayoutGrid },
  { id: View.CALENDAR, label: 'Calendar', icon: CalendarIcon },
  { id: View.OUTREACH, label: 'Outreach', icon: Zap },      // ← delete
  { id: View.INTEGRATIONS, label: 'Integrations', icon: Link2 },
];
```

```typescript
// AFTER
const workspaceItems = [
  { id: View.POST_JOB, label: 'Post Jobs', icon: Sparkles },
  { id: View.JOBS_POSTED, label: 'Active Jobs', icon: LayoutGrid },
  { id: View.CALENDAR, label: 'Calendar', icon: CalendarIcon },
  { id: View.INTEGRATIONS, label: 'Integrations', icon: Link2 },
];
```

- [ ] **Step 2: Remove the unused `Zap` import**

In the lucide-react import at the top, delete `Zap,`:

```typescript
// BEFORE
import {
  Users,
  MessageSquare,
  Settings,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
  Calendar as CalendarIcon,
  Zap,
  Link2,
} from 'lucide-react';
```

```typescript
// AFTER
import {
  Users,
  MessageSquare,
  Settings,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
  Calendar as CalendarIcon,
  Link2,
} from 'lucide-react';
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "chore: remove Outreach nav item from sidebar"
```

---

### Task 6: Rewrite IntegrationsView — Cal.com URL input only

**Files:**
- Modify: `src/components/IntegrationsView.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import React, { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function IntegrationsView() {
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/IntegrationsView.tsx
git commit -m "feat: rewrite IntegrationsView as Cal.com URL setup card"
```

---

### Task 7: Create CalScheduleOverlay

**Files:**
- Create: `src/components/CalScheduleOverlay.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React, { useEffect } from 'react';
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white shadow-sm">
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

      {/* Cal.com embed */}
      <iframe
        src={calUrl}
        className="flex-1 w-full border-0"
        allow="payment"
        title="Schedule interview"
      />
    </motion.div>
  );
};
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/CalScheduleOverlay.tsx
git commit -m "feat: add CalScheduleOverlay — full-screen Cal.com booking embed"
```

---

### Task 8: Update CalendarView — replace ScheduleInterviewModal with CalScheduleOverlay

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: Update imports**

Replace the existing imports block at the top of `CalendarView.tsx`:

```typescript
// BEFORE — top of file
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  CalendarDays,
  Trash2,
} from 'lucide-react';

import { Candidate, Interview, Job } from '../types';
import { ScheduleInterviewModal } from './ScheduleInterviewModal';
```

```typescript
// AFTER
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  CalendarDays,
  Trash2,
} from 'lucide-react';

import { Candidate, Interview, Job } from '../types';
import { CalScheduleOverlay } from './CalScheduleOverlay';
```

- [ ] **Step 2: Update the Props interface**

```typescript
// BEFORE
interface CalendarViewProps {
  candidates?: Candidate[];
  jobs?: Job[];
  interviews?: Interview[];
  userId?: string;
  jobId?: string;
  onScheduleInterview?: (data: Omit<Interview, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteInterview?: (id: string) => Promise<void>;
}
```

```typescript
// AFTER
interface CalendarViewProps {
  candidates?: Candidate[];
  jobs?: Job[];
  interviews?: Interview[];
  userId?: string;
  jobId?: string;
  calUrl?: string;
  onDeleteInterview?: (id: string) => Promise<void>;
}
```

- [ ] **Step 3: Update the component signature and state**

```typescript
// BEFORE
export const CalendarView: React.FC<CalendarViewProps> = ({
  candidates = [],
  jobs = [],
  interviews = [],
  userId = '',
  jobId,
  onScheduleInterview,
  onDeleteInterview,
}) => {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();
```

```typescript
// AFTER
export const CalendarView: React.FC<CalendarViewProps> = ({
  candidates = [],
  jobs = [],
  interviews = [],
  userId = '',
  jobId,
  calUrl,
  onDeleteInterview,
}) => {
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayCandidate, setOverlayCandidate] = useState<Candidate | null>(null);
```

- [ ] **Step 4: Update `openModal` to `openOverlay`**

```typescript
// BEFORE
  const openModal = (day?: number) => {
    if (day !== undefined) {
      const m = String(currentMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      setModalDefaultDate(`${currentYear}-${m}-${d}`);
    } else {
      setModalDefaultDate(undefined);
    }
    setShowModal(true);
  };
```

```typescript
// AFTER
  const openOverlay = (candidate?: Candidate | null) => {
    setOverlayCandidate(candidate ?? null);
    setShowOverlay(true);
  };
```

- [ ] **Step 5: Update the "Schedule Interview" header button**

Find:
```typescript
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview
          </button>
```

Replace with:
```typescript
          <button
            onClick={() => openOverlay()}
            disabled={!calUrl}
            title={calUrl ? undefined : 'Add your Cal.com URL in Integrations first'}
            className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Schedule Interview
          </button>
```

- [ ] **Step 6: Update the empty-state "Schedule Interview" button**

Find:
```typescript
                  <button
                    onClick={() => openModal(selectedDay)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule Interview
                  </button>
```

Replace with:
```typescript
                  <button
                    onClick={() => openOverlay()}
                    disabled={!calUrl}
                    title={calUrl ? undefined : 'Add your Cal.com URL in Integrations first'}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand hover:text-brand transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Schedule Interview
                  </button>
```

- [ ] **Step 7: Replace the ScheduleInterviewModal render with CalScheduleOverlay**

Find the closing block of the return statement:
```typescript
      {showModal && onScheduleInterview && (
        <ScheduleInterviewModal
          candidates={candidates}
          jobs={jobs}
          defaultDate={modalDefaultDate}
          userId={userId}
          jobId={jobId}
          onSchedule={onScheduleInterview}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
```

Replace with:
```typescript
      <AnimatePresence>
        {showOverlay && calUrl && (
          <CalScheduleOverlay
            calUrl={calUrl}
            candidate={overlayCandidate}
            onClose={() => setShowOverlay(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 9: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: replace ScheduleInterviewModal with CalScheduleOverlay in CalendarView"
```

---

### Task 9: Update App.tsx — remove OutreachView, load calUrl, update props

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove OutreachView import**

Delete this import line:
```typescript
import { OutreachView } from './components/OutreachView';
```

- [ ] **Step 2: Add `calUrl` state**

After the existing state declarations (around where `interviews` is declared), add:
```typescript
  const [calUrl, setCalUrl] = useState('');
```

- [ ] **Step 3: Load calUrl alongside onboardingComplete in the auth effect**

Find the existing auth `useEffect` that reads `onboardingComplete`:
```typescript
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (!active) return;
          const data = snap.data();
          setNeedsOnboarding(!data?.onboardingComplete);
        } catch {
```

Replace with:
```typescript
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (!active) return;
          const data = snap.data();
          setNeedsOnboarding(!data?.onboardingComplete);
          setCalUrl(data?.calUrl ?? '');
        } catch {
```

- [ ] **Step 4: Remove handleScheduleInterview callback**

Delete the entire `handleScheduleInterview` callback (it was only used by CalendarView's old prop):
```typescript
  const handleScheduleInterview = useCallback(async (data: Omit<Interview, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      // Strip undefined fields — Firestore rejects them
      const doc: Record<string, any> = { createdAt: serverTimestamp() };
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) doc[k] = v;
      }
      await addDoc(collection(db, 'interviews'), doc);
      toast('Interview scheduled', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interviews');
      toast('Failed to schedule interview', 'error');
      throw error;
    }
  }, [user, toast]);
```

Also remove the `Interview` type from the `useCallback` import if it becomes unused — check:
```bash
grep -n "Omit<Interview" src/App.tsx
```
If no other uses, remove `Interview` from the type import at the top of App.tsx.

- [ ] **Step 5: Remove the OutreachView render block**

Find and delete the entire motion.div block for Outreach:
```typescript
          {currentView === View.OUTREACH && (
            <motion.div
              key="outreach"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <OutreachView />
            </motion.div>
          )}
```

- [ ] **Step 6: Update CalendarView props**

Find the CalendarView render block and update it:

```typescript
// BEFORE
              <CalendarView
                candidates={candidates}
                jobs={postedJobs}
                interviews={interviews}
                userId={user.uid}
                jobId={selectedJob?.id}
                onScheduleInterview={handleScheduleInterview}
                onDeleteInterview={handleDeleteInterview}
              />
```

```typescript
// AFTER
              <CalendarView
                candidates={candidates}
                jobs={postedJobs}
                interviews={interviews}
                userId={user.uid}
                jobId={selectedJob?.id}
                calUrl={calUrl}
                onDeleteInterview={handleDeleteInterview}
              />
```

- [ ] **Step 7: Clean up unused imports from App.tsx**

Check if any of these are now unused and remove them if so:
```bash
grep -n "addDoc\|serverTimestamp\|OutreachView\|View\.OUTREACH\|Interview," src/App.tsx
```

Remove any that have zero remaining uses.

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire calUrl from Firestore into App and CalendarView"
```

---

### Task 10: Update firestore.rules — remove app_threads rule

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Remove the app_threads subcollection rule**

Find and delete this block inside the `users/{userId}` match:
```
      // App-originated email threads — server writes via user's ID token.
      match /app_threads/{threadId} {
        allow read, write: if isOwner(userId);
      }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "chore: remove app_threads Firestore rule (email outreach removed)"
```

---

### Task 11: Delete dead files and final type-check

**Files:**
- Delete: `src/components/OutreachView.tsx`
- Delete: `src/components/ScheduleInterviewModal.tsx`
- Delete: `src/data/outreach.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm src/components/OutreachView.tsx src/components/ScheduleInterviewModal.tsx src/data/outreach.ts
```

- [ ] **Step 2: Run full type-check**

```bash
npx tsc --noEmit 2>&1
```

Expected: zero errors. If there are errors, they are likely leftover imports in files that weren't caught earlier. Fix them now: find the file, remove the import.

- [ ] **Step 3: Verify the dev server starts**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000 | head -5
kill %1
```

Expected: HTML response from the server.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: delete OutreachView, ScheduleInterviewModal, outreach data file"
```

---

## Done

After all tasks complete, the app should:
- Have no Outreach tab in the sidebar
- Load calUrl from Firestore on sign-in
- Show a Cal.com URL input in the Integrations tab
- Open a full-screen Cal.com embed when "Schedule Interview" is clicked (disabled with tooltip if calUrl not set)
- Have a clean build with zero TypeScript errors
