import React, { useState, useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';

const loadingPhrases = [
  "Stamping your invoices...",
  "Polishing your ledger...",
  "Organizing your business...",
  "Calculating with precision...",
  "Authenticating business data...",
  "Preparing your dashboard...",
  "Connecting to secure vault...",
  "Arranging your clients...",
  "Syncing your catalog..."
];

export default function LoadingScreen({ message }: { message?: string }) {
  const { settings } = useBranding();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

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
      <div className="relative z-10 flex flex-col items-center px-8 py-12 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-2xl max-w-xs w-full">
        {/* Boutique Paper Flow Animation */}
        <div className="relative w-24 h-24 mb-8">
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
            {message || loadingPhrases[phraseIndex]}
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
