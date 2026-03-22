import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export function SyncIndicator() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'synced' | 'offline'>('idle');

  useEffect(() => {
    const handleSync = (e: any) => {
      setStatus(e.detail);
      if (e.detail === 'synced') {
        setTimeout(() => setStatus('idle'), 3000);
      }
    };
    
    // Add event listener
    window.addEventListener('bill-sync', handleSync);
    return () => window.removeEventListener('bill-sync', handleSync);
  }, []);

  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 z-50 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur shadow-lg rounded-full border border-gray-200 text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
      {status === 'saving' && (
        <>
          <RefreshCw className="size-4 animate-spin text-blue-500" /> 
          <span className="text-gray-700">Saving...</span>
        </>
      )}
      {status === 'synced' && (
        <>
          <Cloud className="size-4 text-green-500" /> 
          <span className="text-gray-700">Synced</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <CloudOff className="size-4 text-orange-500" /> 
          <span className="text-orange-700">Offline changes</span>
        </>
      )}
    </div>
  );
}
