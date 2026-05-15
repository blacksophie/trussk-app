import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { signInWithGoogle, signInWithMicrosoft, saveTokenToDB } from '../../lib/firebase';
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
