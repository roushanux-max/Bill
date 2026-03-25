import React, { useState, useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';

const defaultPhrases = [
  "Stamping your invoices...",
  "Polishing your ledger...",
  "Organizing your business...",
  "Calculating with precision...",
  "Authenticating business data...",
  "Preparing your dashboard...",
  "Connecting to secure vault...",
  "Arranging your customers...",
  "Syncing your catalog..."
];

const printingPhrases = [
  "Starting machine...",
  "Warming up rollers...",
  "Getting paper ready...",
  "Ink levels checked...",
  "Aligning print head...",
  "Processing layout...",
  "Almost there...",
  "Printing your invoice..."
];

interface LoadingScreenProps {
  message?: string;
  type?: 'default' | 'printing' | 'processing';
}

export default function LoadingScreen({ message, type = 'default' }: LoadingScreenProps) {
  const { settings } = useBranding();
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = type === 'printing' ? printingPhrases : defaultPhrases;

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phrases]);

  const primaryColor = settings?.primaryColor || '#6366f1';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Animated Background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000"
        style={{ 
          background: `radial-gradient(circle at 50% 50%, ${primaryColor} 0%, transparent 70%)`,
          animation: 'pulse-bg 8s ease-in-out infinite'
        }}
      />
      
      {/* Glassmorphic Container */}
      <div className="relative z-10 flex flex-col items-center px-10 py-16 rounded-[2.5rem] bg-white/60 backdrop-blur-2xl border border-white/50 shadow-2xl max-w-sm w-full mx-4">
        {/* Thematic Animation */}
        <div className="relative w-32 h-32 mb-10">
          {type === 'printing' ? (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Gears for "Machine" look */}
              <g className="animate-spin-slow origin-center opacity-10">
                <path d="M50 20l2 5h6l-4 4 2 6-6-4-6 4 2-6-4-4h6z" fill={primaryColor} />
              </g>
              
              {/* Printer Tray */}
              <path d="M25 75h50v5H25z" fill="var(--color-slate-200)" />
              
              {/* Printer Body with Depth */}
              <rect x="20" y="55" width="60" height="20" rx="2" fill="white" stroke={primaryColor} strokeWidth="2" />
              <rect x="25" y="45" width="50" height="15" rx="1" fill="white" stroke={primaryColor} strokeWidth="1.5" />
              <rect x="35" y="38" width="30" height="8" rx="1" fill="white" stroke={primaryColor} strokeWidth="1" />
              
              {/* Rolling Paper Animation */}
              <g className="paper-roll-out">
                <rect x="38" y="60" width="24" height="25" rx="1" fill="white" stroke={primaryColor} strokeWidth="0.5" />
                <path d="M42 65h16M42 70h16M42 75h10" stroke={primaryColor} strokeWidth="0.5" opacity="0.4" strokeLinecap="round" />
              </g>

              {/* Glowing Status Indicator */}
              <circle cx="74" cy="65" r="1.5" fill={primaryColor} className="animate-pulse" />
              <circle cx="70" cy="65" r="1" fill="#22c55e" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            </svg>
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Folder/Backing */}
              <rect x="20" y="30" width="60" height="50" rx="8" className="fill-white/80" />
              
              {/* Floating Paper 1 */}
              <g className="paper-flow-1">
                 <rect x="30" y="20" width="40" height="50" rx="4" fill="white" stroke={primaryColor} strokeWidth="2" />
                 <line x1="38" y1="35" x2="62" y2="35" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                 <line x1="38" y1="45" x2="62" y2="45" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              </g>

              {/* Floating Paper 2 */}
              <g className="paper-flow-2">
                 <rect x="30" y="20" width="40" height="50" rx="4" fill="white" stroke={primaryColor} strokeWidth="2" />
                 <line x1="38" y1="35" x2="62" y2="35" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                 <line x1="38" y1="45" x2="62" y2="45" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                 <path d="M55 55l3 3 7-7" fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Floating Paper 3 */}
              <g className="paper-flow-3">
                 <rect x="30" y="20" width="40" height="50" rx="4" fill="white" stroke={primaryColor} strokeWidth="2" />
                 <line x1="38" y1="35" x2="62" y2="35" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                 <line x1="38" y1="45" x2="62" y2="45" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              </g>
            </svg>
          )}
          
          {/* Central Pulse */}
          <div 
            className="absolute inset-0 m-auto w-12 h-12 rounded-full opacity-0 scale-50"
            style={{ 
              border: `2px solid ${primaryColor}`,
              animation: 'center-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite' 
            }}
          />
        </div>

        {/* Status Text with Smooth Transition */}
        <div className="text-center h-6 overflow-hidden">
          <p 
            key={phraseIndex}
            className="text-slate-800 font-semibold tracking-tight animate-slide-up"
          >
            {message || phrases[phraseIndex]}
          </p>
        </div>
        
        {/* Simple Progress Bar */}
        <div className="w-32 h-1 bg-slate-200/50 rounded-full mt-6 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              backgroundColor: primaryColor,
              animation: 'progress-infinite 2s ease-in-out infinite' 
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes paper-roll-out {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          60% { transform: translateY(8px); opacity: 1; }
          100% { transform: translateY(15px); opacity: 0; }
        }
        .paper-roll-out { animation: paper-roll-out 2s cubic-bezier(0.4, 0, 1, 1) infinite; }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }

        @keyframes paper-flow-1 {
          0% { transform: translateY(0) scale(0.9); opacity: 0; }
          20% { opacity: 1; }
          40% { transform: translateY(-30px) scale(1); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes paper-flow-2 {
          0% { opacity: 0; }
          30% { transform: translateY(0) scale(0.9); opacity: 0; }
          50% { opacity: 1; }
          70% { transform: translateY(-30px) scale(1); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes paper-flow-3 {
          0% { opacity: 0; }
          60% { transform: translateY(0) scale(0.9); opacity: 0; }
          80% { opacity: 1; }
          100% { transform: translateY(-30px) scale(1); opacity: 0; }
        }
        .paper-flow-1 { animation: paper-flow-1 4s infinite; transform-origin: center; }
        .paper-flow-2 { animation: paper-flow-2 4s infinite; transform-origin: center; }
        .paper-flow-3 { animation: paper-flow-3 4s infinite; transform-origin: center; }
        
        @keyframes center-pulse {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes pulse-bg {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
        
        @keyframes slide-up {
          0% { transform: translateY(20px); opacity: 0; }
          20% { transform: translateY(0); opacity: 1; }
          80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
        .animate-slide-up { animation: slide-up 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        
        @keyframes progress-infinite {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
