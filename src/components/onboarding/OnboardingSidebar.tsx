// src/components/onboarding/OnboardingSidebar.tsx

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
