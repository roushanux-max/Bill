import React from 'react';
import { Download, ChevronLeft } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { useBranding } from '@/shared/contexts/BrandingContext';

interface InvoicePreviewModalProps {
  invoiceData: any;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  transportCharges: number;
  grandTotal: number;
  notes: string;
  onClose: () => void;
  onDownload: (templateId: string) => void;
}

export default function InvoicePreviewModal({
  invoiceData,
  items,
  subtotal,
  tax,
  discount,
  transportCharges,
  grandTotal,
  notes,
  onClose,
  onDownload,
}: InvoicePreviewModalProps) {
  const { settings, storeInfo } = useBranding();

  // Default to 'standard' as we are removing the selector for simplicity/premium feel
  const selectedTemplate = 'standard';

  const handleDownload = () => {
    onDownload(selectedTemplate);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white shadow-2xl w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-6xl sm:rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* HEAD */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-6">
            <button
              onClick={onClose}
              className="group flex items-center gap-1.5 transition-all bg-transparent border-none p-0 cursor-pointer font-bold text-sm"
              style={{ color: 'var(--brand-color, #f59e0b)' }}
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight hidden sm:block">Invoice Preview</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownload}
              className="px-6 sm:px-8 py-3 text-white rounded-2xl text-sm font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              style={{ 
                backgroundColor: 'var(--brand-color, #f59e0b)',
                boxShadow: '0 8px 16px -4px var(--brand-color-light, rgba(245, 158, 11, 0.2))'
              }}
            >
              <Download size={18} strokeWidth={3} /> <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* BODY - Scrollable Area */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-12">
          <div
            className="w-fit max-w-[210mm] mx-auto bg-white shadow-2xl rounded-sm"
            style={{ minHeight: '297mm' }}
          >
            <InvoiceTemplate
              invoice={{
                ...invoiceData,
                items,
                grandTotal: grandTotal,
                subtotal,
                taxTotal: tax,
                discountTotal: discount,
                notes,
                transportCharges: transportCharges,
                templateId: selectedTemplate,
              }}
              settings={settings}
              storeInfo={storeInfo}
            />
          </div>

          {/* Bottom Padding for mobile */}
          <div className="h-12 sm:hidden"></div>
        </div>

        {/* FOOTER (Mobile Only Close Button) */}
        <div className="sm:hidden p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-wide active:scale-95 transition-all"
          >
            CLOSE PREVIEW
          </button>
        </div>
      </div>
    </div>
  );
}
