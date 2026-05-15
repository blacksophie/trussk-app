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

  // OAuth success — always pass true conservatively.
  // OnboardingFlow checks Firestore to determine if user needs onboarding.
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
