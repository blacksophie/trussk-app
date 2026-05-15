import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithMicrosoft, saveTokenToDB } from '../../lib/firebase';

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
      const { result, accessToken } = await signInWithGoogle();
      if (accessToken) {
        await saveTokenToDB(result.user.uid, 'google', accessToken);
      }
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
      const msResult = await signInWithMicrosoft();
      const uid = msResult.account?.localAccountId ?? 'ms-anon';
      await saveTokenToDB(uid, 'microsoft', msResult.accessToken);
      // Microsoft doesn't create a Firebase user — route to Google or email for identity.
      // Full Microsoft identity via Firebase requires a custom token exchange (Step 3).
      setError('Outlook connected! Sign in with Google or email to finish setting up your account.');
    } catch (e: any) {
      setError(mapAuthError(e));
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

// Shared sub-components exported for reuse in SignInForm and PasswordStep
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
        <svg viewBox="0 0 21 21" className="w-4 h-4" fill="none">
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
          <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
          <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
      )}
      {label}
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
