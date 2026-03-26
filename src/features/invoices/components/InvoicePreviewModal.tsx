import React from 'react';
import { Eye, Download, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white shadow-2xl w-full h-full sm:h-auto sm:max-h-[96vh] sm:max-w-6xl sm:rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* HEAD */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: `${settings.primaryColor}15`, color: settings.primaryColor }}
            >
              <Eye size={20} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">Preview Invoice</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownload}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-md"
              style={{ background: settings.primaryColor }}
            >
              <Download size={16} /> <span className="hidden sm:inline">Download PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 sm:p-2.5 rounded-xl transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BODY - Scrollable Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-8 md:p-12">
          <div
            className="max-w-[210mm] mx-auto bg-white shadow-2xl rounded-sm overflow-hidden"
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
          <div className="h-8 sm:hidden"></div>
        </div>

        {/* FOOTER (Mobile Only Close Button) */}
        <div className="sm:hidden p-4 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
