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
