import React from 'react';
import { X } from 'lucide-react';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { toast } from 'sonner';

interface IndustrySelectorModalProps {
  onClose: () => void;
  canClose?: boolean;
}

export default function IndustrySelectorModal({
  onClose,
  canClose = true,
}: IndustrySelectorModalProps) {
  const { settings, updateSettings } = useBranding();
  const activeDomain = settings.domain || 'general';

  const domains = [
    { id: 'furniture', icon: '🛋️', name: 'Furniture', desc: 'Adds HSN, Material' },
    { id: 'clothing', icon: '👕', name: 'Clothing', desc: 'Adds Size, Color' },
    { id: 'hotel', icon: '🏨', name: 'Hotel', desc: 'Adds Room, Nights' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h3 className="text-2xl font-black text-slate-800">Choose Business Type</h3>
          {canClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {domains.map((d) => (
            <button
              key={d.id}
              onClick={async () => {
                await updateSettings({ ...settings, domain: d.id as any });
                onClose();
                toast.success(`${d.name} template applied`);
              }}
              className={`p-4 rounded-xl border-2 text-center transition-all hover:bg-slate-50 ${activeDomain === d.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}
              style={
                activeDomain === d.id
                  ? {
                      borderColor: settings.primaryColor,
                      backgroundColor: `${settings.primaryColor}10`,
                    }
                  : {}
              }
            >
              <span className="text-3xl mb-2 block">{d.icon}</span>
              <div className="font-bold text-slate-800 text-sm mb-1">{d.name}</div>
              <div className="text-[10px] text-slate-500">{d.desc}</div>
            </button>
          ))}
        </div>
        {canClose && (
          <button
            onClick={onClose}
            className="w-full py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
