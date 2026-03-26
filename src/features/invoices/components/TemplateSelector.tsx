import React from 'react';
import { useBranding } from '@/shared/contexts/BrandingContext';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  const { settings } = useBranding();

  // In the future this can be expanded with real template thumbnails
  const templates = [
    {
      id: 'standard',
      name: 'Standard Layout',
      desc: 'Professional, two-column layout with header banner',
    },
    {
      id: 'minimalist',
      name: 'Minimalist Layout',
      desc: 'Clean, simple edge-to-edge layout without borders',
    },
    { id: 'modern', name: 'Modern Layout', desc: 'Bold typography with high contrast sidebar' },
  ];

  return (
    <div className="mb-6">
      <h4 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
        Select Invoice Template
      </h4>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="snap-start shrink-0 w-48 text-left rounded-xl transition-all border-2 overflow-hidden bg-white"
            style={{
              borderColor: selectedTemplate === t.id ? settings.primaryColor : '#f1f5f9',
            }}
          >
            {/* Placeholder Thumbnail */}
            <div
              className="w-full h-32 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 relative overflow-hidden"
              style={{
                backgroundColor: selectedTemplate === t.id ? `${settings.primaryColor}08` : '',
              }}
            >
              <div
                className="w-full h-full bg-white shadow-sm rounded-sm flex flex-col p-2 gap-2 opacity-80"
                style={{ transform: 'scale(1)', transformOrigin: 'top left' }}
              >
                <div
                  className="h-3 w-3/4 rounded-sm"
                  style={{ backgroundColor: t.id === 'modern' ? settings.primaryColor : '#cbd5e1' }}
                />
                <div className="flex-1 flex gap-2 w-full mt-2">
                  <div className="h-full w-full bg-slate-100 rounded-sm" />
                  {t.id === 'standard' && <div className="h-full w-1/3 bg-slate-100 rounded-sm" />}
                </div>
              </div>
            </div>

            <div className="p-3">
              <h5 className="font-bold text-slate-800 text-sm mb-1">{t.name}</h5>
              <p className="text-[10px] text-slate-500 leading-tight">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
