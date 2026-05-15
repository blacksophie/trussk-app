// src/components/onboarding/OnboardingFlow.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import OnboardingSidebar, { OnboardingStepId } from './OnboardingSidebar';
import CompanyInfoStep, { CompanyInfo } from './CompanyInfoStep';
import InviteTeamStep from './InviteTeamStep';
import WelcomeModal from './WelcomeModal';

interface Props {
  user: FirebaseUser;
  onComplete: () => void;
  children: React.ReactNode;
}

type Step = 'company' | 'invite' | 'done';

export default function OnboardingFlow({ user, onComplete, children }: Props) {
  const [step, setStep] = useState<Step>('company');
  const [completed, setCompleted] = useState<OnboardingStepId[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const markComplete = async () => {
    try {
      await setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
      onComplete();
    } catch {
      setSaveError('Something went wrong. Please try again.');
    }
  };

  const handleCompanyInfo = async (info: CompanyInfo) => {
    setSaving(true);
    setSaveError(null);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        companyName: info.companyName,
        industry: info.industry,
        companySize: info.companySize,
        role: info.role,
        createdAt: serverTimestamp(),
      }, { merge: true });
      setCompleted(c => [...c, 'company']);
      setStep('invite');
      setSaveError(null);
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInvites = async (invites: { email: string; role: string }[]) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (invites.length > 0) {
        const invitesRef = collection(db, 'users', user.uid, 'invites');
        await Promise.all(
          invites.map(inv =>
            addDoc(invitesRef, { email: inv.email, role: inv.role, sentAt: serverTimestamp(), status: 'pending' })
          )
        );
      }
      setCompleted(c => [...c, 'invite']);
      setStep('done');
      setSaveError(null);
    } catch {
      setSaveError('Failed to send invites. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="relative">
        {children}
        <WelcomeModal onPostFirstJob={markComplete} />
      </div>
    );
  }

  const currentStepId: OnboardingStepId =
    step === 'company' ? 'company'
    : step === 'invite' ? 'invite'
    : 'welcome';

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

        <main className="flex-1 flex flex-col items-center justify-center px-16 py-10 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'company' && (
              <motion.div key="company" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <CompanyInfoStep
                  onContinue={handleCompanyInfo}
                  onSkip={() => {
                    if (saving) return;
                    setSaving(true);
                    setCompleted(c => [...c, 'company']);
                    setStep('invite');
                    setSaveError(null);
                    setSaving(false);
                  }}
                />
              </motion.div>
            )}
            {step === 'invite' && (
              <motion.div key="invite" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
                <InviteTeamStep
                  onSend={handleInvites}
                  onSkip={() => {
                    if (saving) return;
                    setSaving(true);
                    setCompleted(c => [...c, 'invite']);
                    setStep('done');
                    setSaveError(null);
                    setSaving(false);
                  }}
                  onBack={() => {
                    if (saving) return;
                    setSaveError(null);
                    setStep('company');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {saveError && (
            <div className="px-16 pb-4">
              <p className="text-[13px] text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{saveError}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

