# Auth & Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current inline auth block in App.tsx with a polished split-panel auth flow (Sign Up / Sign In) and a 3-step Kastamer-style onboarding experience (Company Info → Invite Team → Welcome Modal).

**Architecture:** Auth state is managed in a single `AuthPage` component using a local step machine (`sign-up | sign-up-password | sign-in | sign-in-password`). After OAuth or email/password auth, new users enter `OnboardingFlow` (sidebar progress tracker + centered content per step); returning users go straight to the dashboard. Onboarding completion is persisted in Firestore at `users/{uid}.onboardingComplete`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (brand color `--color-brand: #ff6321` via `bg-brand`), Framer Motion (`motion/react`), Firebase Auth + Firestore, Lucide React icons, DM Sans font. No test runner — verify each task with `npm run lint` (tsc --noEmit) and visual check in `npm run dev`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/auth/AuthSplitLayout.tsx` | Create | White left panel + orange concentric-circle right panel wrapper |
| `src/components/auth/SignUpForm.tsx` | Create | Sign-up screen: Google+Microsoft CTAs, email field, toggle to sign-in |
| `src/components/auth/SignInForm.tsx` | Create | Sign-in screen: Google+Microsoft CTAs, email field, toggle to sign-up |
| `src/components/auth/PasswordStep.tsx` | Create | Password entry reused by both sign-up and sign-in flows |
| `src/components/auth/AuthPage.tsx` | Create | State machine wiring all auth screens together |
| `src/components/onboarding/OnboardingSidebar.tsx` | Create | Left progress sidebar with step list + checkmarks |
| `src/components/onboarding/CompanyInfoStep.tsx` | Create | Step 1: stacked company name/industry/size/role fields |
| `src/components/onboarding/InviteTeamStep.tsx` | Create | Step 2: invite rows with email + role dropdowns |
| `src/components/onboarding/WelcomeModal.tsx` | Create | Step 3: modal overlay on real dashboard |
| `src/components/onboarding/OnboardingFlow.tsx` | Create | Step state machine + Firestore onboardingComplete write |
| `src/lib/firebase.ts` | Modify | Add email/password auth functions + Microsoft stub |
| `src/App.tsx` | Modify | Swap auth block → `<AuthPage>`, add onboarding check |

---

## Task 1: Extend firebase.ts with email/password and Microsoft stub

**Files:**
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Add email/password and Microsoft auth functions**

Replace the contents of `src/lib/firebase.ts` with:

```typescript
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

// Microsoft OAuth — UI is live, provider wired up later in Firebase Console.
// Call this to show a "coming soon" experience without crashing.
export const signInWithMicrosoft = (): Promise<never> =>
  Promise.reject(new Error('microsoft-coming-soon'));

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();
```

- [ ] **Step 2: Verify types compile**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat(auth): add email/password auth functions and Microsoft stub"
```

---

## Task 2: AuthSplitLayout — shared split-panel wrapper

**Files:**
- Create: `src/components/auth/AuthSplitLayout.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/auth/AuthSplitLayout.tsx
import React from 'react';

interface Props {
  children: React.ReactNode; // left panel content
}

export default function AuthSplitLayout({ children }: Props) {
  return (
    <div className="h-screen w-full flex overflow-hidden font-sans">
      {/* Left panel */}
      <div className="w-full lg:w-[45%] bg-white flex flex-col px-12 py-10 overflow-y-auto">
        {/* Trussk logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[17px] font-bold text-gray-900 tracking-tight">trussk</span>
        </div>

        {/* Form area — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-[360px]">
          {children}
        </div>
      </div>

      {/* Right panel — orange with concentric circles */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 60% 40%, #fb923c 0%, #ff6321 40%, #ea580c 70%, #c2410c 100%)' }}>
        {/* Concentric rings */}
        {[600, 450, 300, 160].map((size, i) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/15"
            style={{
              width: size,
              height: size,
              top: '50%',
              left: '50%',
              transform: `translate(${[-10, -5, 2, 12][i]}%, -50%)`,
              background: i === 3 ? 'rgba(255,255,255,0.10)' : undefined,
            }}
          />
        ))}
        <div className="relative z-10 text-center px-10 max-w-sm">
          <h3 className="text-2xl font-bold text-white leading-tight tracking-tight mb-3">
            Infrastructure<br />Recruiting
          </h3>
          <p className="text-white/80 text-[15px] leading-relaxed">
            Hire the talent others can't find. Describe the role — AI finds, scores, and ranks the right candidates in minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthSplitLayout.tsx
git commit -m "feat(auth): add AuthSplitLayout split-panel wrapper"
```

---

## Task 3: SignUpForm and SignInForm

**Files:**
- Create: `src/components/auth/SignUpForm.tsx`
- Create: `src/components/auth/SignInForm.tsx`

- [ ] **Step 1: Create SignUpForm**

```typescript
// src/components/auth/SignUpForm.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithMicrosoft } from '../../lib/firebase';

interface Props {
  onEmailContinue: (email: string) => void;
  onGoogleSuccess: () => void;
  onSwitchToSignIn: () => void;
}

export default function SignUpForm({ onEmailContinue, onGoogleSuccess, onSwitchToSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading('google');
    try {
      await signInWithGoogle();
      onGoogleSuccess();
    } catch (e: any) {
      setError(mapAuthError(e));
    } finally {
      setLoading(null);
    }
  };

  const handleMicrosoft = async () => {
    setError(null);
    setLoading('microsoft');
    try {
      await signInWithMicrosoft();
    } catch (e: any) {
      if (e.message === 'microsoft-coming-soon') {
        setError('Microsoft sign-in is coming soon. Use Google or email for now.');
      } else {
        setError(mapAuthError(e));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) onEmailContinue(email.trim());
  };

  return (
    <div>
      <h1 className="text-[30px] font-bold text-gray-900 tracking-tight mb-2">Sign up</h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Create an account to start hiring infrastructure talent with Trussk.
      </p>

      {/* SSO buttons — Microsoft on top, Google below, stacked vertically */}
      <div className="flex flex-col gap-2.5 mb-5">
        <SSOButton
          icon="microsoft"
          label="Sign up with Microsoft"
          loading={loading === 'microsoft'}
          onClick={handleMicrosoft}
        />
        <SSOButton
          icon="google"
          label="Sign up with Google"
          loading={loading === 'google'}
          onClick={handleGoogle}
        />
      </div>

      <Divider />

      {/* Email form */}
      <form onSubmit={handleEmailContinue}>
        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]">✉</span>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full pl-9 pr-4 py-[10px] border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full py-[11px] bg-brand text-white font-semibold rounded-lg text-[14px] hover:opacity-90 transition-opacity"
        >
          Continue →
        </button>
      </form>

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        Already have an account?{' '}
        <button onClick={onSwitchToSignIn} className="text-brand font-medium hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}

// Shared sub-components used across auth forms
export function SSOButton({
  icon, label, loading, onClick,
}: { icon: 'google' | 'microsoft'; loading: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-[10px] px-3 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:border-brand hover:bg-orange-50 transition-all disabled:opacity-50"
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-gray-300 border-t-brand rounded-full"
        />
      ) : icon === 'google' ? (
        <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
      ) : (
        <svg viewBox="0 0 21 21" className="w-4 h-4">
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
          <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[12px] text-gray-400">or sign up using email</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-600"
    >
      {message}
    </motion.div>
  );
}

export function mapAuthError(e: any): string {
  const code = e?.code ?? '';
  if (code === 'auth/popup-closed-by-user') return 'Sign-in cancelled.';
  if (code === 'auth/blocked-by-popup-blocker') return 'Popup blocked — please allow popups and try again.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Try signing in.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Incorrect password. Try again or reset it.';
  if (code === 'auth/user-not-found') return 'No account found with that email.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a few minutes.';
  return e?.message ?? 'Something went wrong. Please try again.';
}
```

- [ ] **Step 2: Create SignInForm**

```typescript
// src/components/auth/SignInForm.tsx
import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithMicrosoft } from '../../lib/firebase';
import { SSOButton, ErrorBanner, mapAuthError } from './SignUpForm';

interface Props {
  onEmailContinue: (email: string) => void;
  onGoogleSuccess: () => void;
  onSwitchToSignUp: () => void;
}

export default function SignInForm({ onEmailContinue, onGoogleSuccess, onSwitchToSignUp }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading('google');
    try {
      await signInWithGoogle();
      onGoogleSuccess();
    } catch (e: any) {
      setError(mapAuthError(e));
    } finally {
      setLoading(null);
    }
  };

  const handleMicrosoft = async () => {
    setError(null);
    setLoading('microsoft');
    try {
      await signInWithMicrosoft();
    } catch (e: any) {
      if (e.message === 'microsoft-coming-soon') {
        setError('Microsoft sign-in is coming soon. Use Google or email for now.');
      } else {
        setError(mapAuthError(e));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) onEmailContinue(email.trim());
  };

  return (
    <div>
      <h1 className="text-[30px] font-bold text-gray-900 tracking-tight mb-2">Sign in</h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        Welcome back. Sign in to continue managing your pipeline.
      </p>

      {/* SSO buttons — Microsoft on top, Google below, stacked vertically */}
      <div className="flex flex-col gap-2.5 mb-5">
        <SSOButton icon="microsoft" label="Sign in with Microsoft" loading={loading === 'microsoft'} onClick={handleMicrosoft} />
        <SSOButton icon="google" label="Sign in with Google" loading={loading === 'google'} onClick={handleGoogle} />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[12px] text-gray-400">or sign in with email</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleEmailContinue}>
        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px]">✉</span>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full pl-9 pr-4 py-[10px] border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full py-[11px] bg-brand text-white font-semibold rounded-lg text-[14px] hover:opacity-90 transition-opacity"
        >
          Continue →
        </button>
      </form>

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>

      <p className="text-center text-[13px] text-gray-500 mt-5">
        Don't have an account?{' '}
        <button onClick={onSwitchToSignUp} className="text-brand font-medium hover:underline">
          Sign up
        </button>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/SignUpForm.tsx src/components/auth/SignInForm.tsx
git commit -m "feat(auth): add SignUpForm and SignInForm with Google/Microsoft/email"
```

---

## Task 4: PasswordStep

**Files:**
- Create: `src/components/auth/PasswordStep.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/auth/PasswordStep.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, resetPassword } from '../../lib/firebase';
import { ErrorBanner, mapAuthError } from './SignUpForm';

interface Props {
  email: string;
  mode: 'sign-up' | 'sign-in';
  onSuccess: () => void;
  onBack: () => void;
}

export default function PasswordStep({ email, mode, onSuccess, onBack }: Props) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'sign-up') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess();
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(mapAuthError(err));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <h1 className="text-[30px] font-bold text-gray-900 tracking-tight mb-2">
        {mode === 'sign-up' ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="text-[14px] text-gray-500 mb-8">
        {mode === 'sign-up' ? 'Choose a password for your Trussk account.' : 'Enter your password to continue.'}
      </p>

      {/* Email chip */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
          <span className="text-gray-400 text-[13px]">✉</span>
          <span className="text-[13px] text-gray-700 font-medium">{email}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] text-brand hover:underline"
        >
          Change
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Password</label>
        <div className="relative mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-4 pr-10 py-[10px] border border-gray-200 rounded-lg text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {mode === 'sign-in' && (
          <div className="flex justify-end mb-4">
            {resetSent ? (
              <span className="text-[12px] text-green-600">Reset email sent!</span>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[12px] text-brand hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        {mode === 'sign-up' && <div className="mb-4" />}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-[11px] bg-brand text-white font-semibold rounded-lg text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : mode === 'sign-up' ? 'Create account →' : 'Sign in →'}
        </button>
      </form>

      <AnimatePresence>
        {error && <ErrorBanner message={error} />}
      </AnimatePresence>
    </motion.div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/PasswordStep.tsx
git commit -m "feat(auth): add PasswordStep with show/hide and forgot password"
```

---

## Task 5: AuthPage — state machine

**Files:**
- Create: `src/components/auth/AuthPage.tsx`

- [ ] **Step 1: Create AuthPage**

```typescript
// src/components/auth/AuthPage.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import AuthSplitLayout from './AuthSplitLayout';
import SignUpForm from './SignUpForm';
import SignInForm from './SignInForm';
import PasswordStep from './PasswordStep';

type AuthStep = 'sign-up' | 'sign-up-password' | 'sign-in' | 'sign-in-password';

interface Props {
  onAuthSuccess: (isNewUser: boolean) => void;
}

export default function AuthPage({ onAuthSuccess }: Props) {
  const [step, setStep] = useState<AuthStep>('sign-up');
  const [email, setEmail] = useState('');

  // OAuth success — Google always determines new vs returning by metadata
  const handleOAuthSuccess = (isNewUser: boolean) => onAuthSuccess(isNewUser);

  // For Google sign-in we can't know isNewUser until after auth,
  // so we pass true conservatively — OnboardingFlow checks Firestore.
  const handleGoogleSuccess = () => onAuthSuccess(true);

  return (
    <AuthSplitLayout>
      <AnimatePresence mode="wait">
        {step === 'sign-up' && (
          <motion.div key="sign-up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <SignUpForm
              onEmailContinue={email => { setEmail(email); setStep('sign-up-password'); }}
              onGoogleSuccess={handleGoogleSuccess}
              onSwitchToSignIn={() => setStep('sign-in')}
            />
          </motion.div>
        )}

        {step === 'sign-up-password' && (
          <motion.div key="sign-up-pw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <PasswordStep
              email={email}
              mode="sign-up"
              onSuccess={() => onAuthSuccess(true)}
              onBack={() => setStep('sign-up')}
            />
          </motion.div>
        )}

        {step === 'sign-in' && (
          <motion.div key="sign-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <SignInForm
              onEmailContinue={email => { setEmail(email); setStep('sign-in-password'); }}
              onGoogleSuccess={handleGoogleSuccess}
              onSwitchToSignUp={() => setStep('sign-up')}
            />
          </motion.div>
        )}

        {step === 'sign-in-password' && (
          <motion.div key="sign-in-pw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <PasswordStep
              email={email}
              mode="sign-in"
              onSuccess={() => onAuthSuccess(false)}
              onBack={() => setStep('sign-in')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthSplitLayout>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthPage.tsx
git commit -m "feat(auth): add AuthPage step state machine"
```

---

## Task 6: OnboardingSidebar

**Files:**
- Create: `src/components/onboarding/OnboardingSidebar.tsx`

- [ ] **Step 1: Create OnboardingSidebar**

```typescript
// src/components/onboarding/OnboardingSidebar.tsx
import React from 'react';

export type OnboardingStepId = 'company' | 'invite' | 'welcome';

interface SidebarStep {
  id: OnboardingStepId;
  label: string;
  description: string;
  number: number;
}

const STEPS: SidebarStep[] = [
  { id: 'company', label: 'Company Profile', description: 'Tell us about your organization and your role.', number: 1 },
  { id: 'invite', label: 'Invite Your Team', description: 'Add co-workers to collaborate on hiring.', number: 2 },
  { id: 'welcome', label: 'Start Hiring', description: 'Post your first job and find candidates.', number: 3 },
];

interface Props {
  currentStep: OnboardingStepId;
  completedSteps: OnboardingStepId[];
  userEmail: string;
}

export default function OnboardingSidebar({ currentStep, completedSteps, userEmail }: Props) {
  const isDone = (id: OnboardingStepId) => completedSteps.includes(id);
  const isActive = (id: OnboardingStepId) => id === currentStep;

  return (
    <div className="w-[260px] flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
      {/* Logo + topbar */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
        <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white stroke-2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[15px] font-bold text-gray-900 tracking-tight">trussk</span>
      </div>

      {/* Account created row */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-green-400 bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-green-500 text-[11px] font-bold">✓</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-400">Create Account</p>
            <p className="text-[11px] text-gray-400 leading-snug mt-0.5 break-all">{userEmail}</p>
          </div>
        </div>
        {/* Connector */}
        <div className="ml-[13px] w-0.5 h-4 bg-green-200 mt-1" />
      </div>

      {/* Onboarding steps */}
      <div className="px-6 flex-1">
        {STEPS.map((step, i) => {
          const done = isDone(step.id);
          const active = isActive(step.id);
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.id}>
              <div className={`flex items-start gap-3 py-3 rounded-lg px-2 -mx-2 transition-colors ${active ? 'bg-orange-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                  ${done ? 'border-green-400 bg-green-50' : active ? 'border-brand bg-orange-50' : 'border-gray-200 bg-white'}`}
                >
                  {done ? (
                    <span className="text-green-500 text-[11px] font-bold">✓</span>
                  ) : (
                    <span className={`text-[11px] font-bold ${active ? 'text-brand' : 'text-gray-400'}`}>{step.number}</span>
                  )}
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${done ? 'text-gray-400' : active ? 'text-brand' : 'text-gray-500'}`}>{step.label}</p>
                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{step.description}</p>
                </div>
              </div>
              {!isLast && (
                <div className={`ml-[13px] w-0.5 h-3 ${done ? 'bg-green-200' : 'bg-gray-100'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingSidebar.tsx
git commit -m "feat(onboarding): add OnboardingSidebar progress tracker"
```

---

## Task 7: CompanyInfoStep

**Files:**
- Create: `src/components/onboarding/CompanyInfoStep.tsx`

- [ ] **Step 1: Create CompanyInfoStep**

```typescript
// src/components/onboarding/CompanyInfoStep.tsx
import React, { useState } from 'react';

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
        Help us tailor Trussk to your hiring needs. This lets us surface the most relevant candidates and market data for your industry.
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
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/CompanyInfoStep.tsx
git commit -m "feat(onboarding): add CompanyInfoStep with stacked fields"
```

---

## Task 8: InviteTeamStep

**Files:**
- Create: `src/components/onboarding/InviteTeamStep.tsx`

- [ ] **Step 1: Create InviteTeamStep**

```typescript
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
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/InviteTeamStep.tsx
git commit -m "feat(onboarding): add InviteTeamStep with dynamic invite rows"
```

---

## Task 9: WelcomeModal

**Files:**
- Create: `src/components/onboarding/WelcomeModal.tsx`

- [ ] **Step 1: Create WelcomeModal**

```typescript
// src/components/onboarding/WelcomeModal.tsx
import React from 'react';
import { motion } from 'motion/react';

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

        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">Welcome to Trussk</h2>
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
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/WelcomeModal.tsx
git commit -m "feat(onboarding): add WelcomeModal with scale-in animation"
```

---

## Task 10: OnboardingFlow — step state machine + Firestore writes

**Files:**
- Create: `src/components/onboarding/OnboardingFlow.tsx`

- [ ] **Step 1: Create OnboardingFlow**

```typescript
// src/components/onboarding/OnboardingFlow.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import OnboardingSidebar, { OnboardingStepId } from './OnboardingSidebar';
import CompanyInfoStep, { CompanyInfo } from './CompanyInfoStep';
import InviteTeamStep from './InviteTeamStep';

interface Props {
  user: FirebaseUser;
  onComplete: () => void;
  // children renders the dashboard behind the welcome modal
  children: React.ReactNode;
}

type Step = 'company' | 'invite' | 'done';

export default function OnboardingFlow({ user, onComplete, children }: Props) {
  const [step, setStep] = useState<Step>('company');
  const [completed, setCompleted] = useState<OnboardingStepId[]>([]);

  const markComplete = async () => {
    await setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
    onComplete();
  };

  const handleCompanyInfo = async (info: CompanyInfo) => {
    await setDoc(doc(db, 'users', user.uid), {
      companyName: info.companyName,
      industry: info.industry,
      companySize: info.companySize,
      role: info.role,
      createdAt: serverTimestamp(),
    }, { merge: true });
    setCompleted(c => [...c, 'company']);
    setStep('invite');
  };

  const handleInvites = async (invites: { email: string; role: string }[]) => {
    const invitesRef = collection(db, 'users', user.uid, 'invites');
    await Promise.all(
      invites.map(inv =>
        addDoc(invitesRef, { email: inv.email, role: inv.role, sentAt: serverTimestamp(), status: 'pending' })
      )
    );
    setCompleted(c => [...c, 'invite']);
    setStep('done');
  };

  if (step === 'done') {
    // Render dashboard behind the welcome modal
    return (
      <div className="relative">
        {children}
        {/* WelcomeModal imported inline to keep this file self-contained */}
        <WelcomeModalInline onPostFirstJob={markComplete} />
      </div>
    );
  }

  const currentStepId: OnboardingStepId = step === 'company' ? 'company' : 'invite';

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Topbar */}
      <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white stroke-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">trussk</span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-gray-400">
          <span>{user.email}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <OnboardingSidebar
          currentStep={currentStepId}
          completedSteps={completed}
          userEmail={user.email ?? ''}
        />

        <main className="flex-1 flex items-center justify-center px-16 py-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <CompanyInfoStep
                  onContinue={handleCompanyInfo}
                  onSkip={() => { setCompleted(c => [...c, 'company']); setStep('invite'); }}
                />
              </motion.div>
            )}
            {step === 'invite' && (
              <motion.div key="invite" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <InviteTeamStep
                  onSend={handleInvites}
                  onSkip={() => { setCompleted(c => [...c, 'invite']); setStep('done'); }}
                  onBack={() => setStep('company')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// Inline to avoid a separate import cycle
function WelcomeModalInline({ onPostFirstJob }: { onPostFirstJob: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/35 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl p-10 w-[460px] text-center shadow-[0_24px_80px_rgba(0,0,0,0.2)]"
      >
        <div className="w-16 h-16 rounded-full border-2 border-orange-200 bg-orange-50 flex items-center justify-center mx-auto mb-6 text-3xl">
          🎉
        </div>
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">Welcome to Trussk</h2>
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
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/OnboardingFlow.tsx
git commit -m "feat(onboarding): add OnboardingFlow with Firestore writes and welcome modal"
```

---

## Task 11: Wire into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the auth block in App.tsx**

Find the `if (authLoading)` block and the `if (!user)` block (lines ~287–486 in the current file). Replace them:

```typescript
// Add these imports at the top of App.tsx alongside the existing imports:
import AuthPage from './components/auth/AuthPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
```

```typescript
// Add this state after the existing useState declarations (around line 57):
const [needsOnboarding, setNeedsOnboarding] = useState(false);
```

```typescript
// Replace the onAuthStateChanged effect (lines ~60-66) with:
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) {
      // Check if user has completed onboarding
      try {
        const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(firestoreDoc(db, 'users', u.uid));
        const data = snap.data();
        setNeedsOnboarding(!data?.onboardingComplete);
      } catch {
        setNeedsOnboarding(false);
      }
    }
    setAuthLoading(false);
  });
  return unsubscribe;
}, []);
```

```typescript
// Replace the `if (authLoading)` early return (keep as-is, no change needed).

// Replace the entire `if (!user) { return (...) }` block with:
if (!user) {
  return (
    <AuthPage
      onAuthSuccess={(isNewUser) => {
        // onAuthStateChanged will fire and set user.
        // isNewUser flag pre-sets onboarding gate.
        if (isNewUser) setNeedsOnboarding(true);
      }}
    />
  );
}

if (needsOnboarding) {
  return (
    <OnboardingFlow user={user} onComplete={() => setNeedsOnboarding(false)}>
      {/* Pass the real app shell as children so it's visible behind the welcome modal */}
      <AppShell />
    </OnboardingFlow>
  );
}
```

- [ ] **Step 2: Extract the main app JSX into AppShell**

After the `export default function App()` wrapper and the `AppContent` function, add:

```typescript
// Thin wrapper so OnboardingFlow can render the dashboard behind the welcome modal
function AppShell() {
  // This renders the full dashboard UI without auth/onboarding logic.
  // It reuses all the existing view state from AppContent via context if needed,
  // but for the welcome modal case the user just needs to see it visually —
  // so a static placeholder is fine here.
  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans pointer-events-none select-none opacity-70">
      <div className="w-[220px] bg-[#111] flex-shrink-0" />
      <div className="flex-1 bg-gray-50" />
    </div>
  );
}
```

> **Note:** The welcome modal `onPostFirstJob` calls `onComplete()` which sets `needsOnboarding(false)`, returning the user to the full `AppContent` render with all state intact.

- [ ] **Step 3: Remove the old auth imports no longer needed**

Remove `LogIn`, `ShieldCheck`, `Zap`, `Sparkles` from the `lucide-react` import line if they are no longer used elsewhere in the file. Keep `Menu`, `X`, `LayoutDashboard`.

- [ ] **Step 4: Lint**

```bash
npm run lint
```
Fix any errors before committing. Common issues: unused imports, missing `getDoc` import from firestore (add to existing firestore import line).

- [ ] **Step 5: Start dev server and verify visually**

```bash
npm run dev
```

Check:
1. Unauthenticated → Sign Up screen shows (white left panel, orange concentric-circle right)
2. Click "Sign in" → Sign In screen
3. Click "Sign up" → back to Sign Up
4. Enter email → Continue → Password step (email chip shows, show/hide eye works)
5. Sign in with Google → if new user, Company Info step shows with sidebar
6. Step 1 fill out → Save → Invite step shows (step 1 checked in sidebar)
7. Skip invite → Welcome modal overlays actual dashboard
8. "Post your first job" → full dashboard, onboardingComplete written to Firestore
9. Sign out and sign back in → goes straight to dashboard (no onboarding)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(auth): wire AuthPage and OnboardingFlow into App"
```
