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
