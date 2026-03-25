import React from 'react';
import { Eye, Download, X } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import TemplateSelector from './TemplateSelector';
import { useBranding } from '@/shared/contexts/BrandingContext';

interface InvoicePreviewModalProps {
    invoiceData: any;
    items: any[];
    subtotal: number;
    tax: number;
    grandTotal: number;
    notes: string;
    onClose: () => void;
    onDownload: (templateId: string) => void;
}

export default function InvoicePreviewModal({ 
    invoiceData, items, subtotal, tax, grandTotal, notes,
    onClose, onDownload
}: InvoicePreviewModalProps) {
    const { settings, storeInfo } = useBranding();
    
    // We get the saved default from local storage temporarily until Context handles it fully, or just default to 'standard'
    const [selectedTemplate, setSelectedTemplate] = React.useState(() => {
        return localStorage.getItem('bill_default_template') || 'standard';
    });

    const handleDownload = () => {
        // Save as default for future
        localStorage.setItem('bill_default_template', selectedTemplate);
        onDownload(selectedTemplate);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* HEAD */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: `${settings.primaryColor}15`, color: settings.primaryColor }}>
                            <Eye size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Preview Invoice</h3>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleDownload} 
                            className="px-6 py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-md"
                            style={{ background: settings.primaryColor }}
                        >
                            <Download size={16} /> Download PDF
                        </button>
                        <button 
                            onClick={onClose} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                
                {/* BODY */}
                <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                    
                    {/* LEFT: Sidebar Template Selector */}
                    <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-6 flex flex-col shrink-0 overflow-y-auto">
                        <TemplateSelector 
                            selectedTemplate={selectedTemplate} 
                            onSelect={setSelectedTemplate} 
                        />
                        <div className="mt-auto pt-6 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                This preview shows exactly what your customer will see. The layout changes instantly based on the selected template. <strong>Master branding settings</strong> are automatically applied.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT: Preview Pane */}
                    <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-12 flex justify-center">
                        <div className="max-w-[210mm] w-full bg-white shadow-2xl rounded-sm overflow-hidden" style={{ minHeight: '297mm' }}>
                            <InvoiceTemplate 
                                invoice={{
                                    ...invoiceData,
                                    items,
                                    grandTotal: grandTotal,
                                    subtotal,
                                    taxTotal: tax,
                                    discountTotal: 0,
                                    notes,
                                    transportCharges: 0,
                                    // For future: inject template selection here if InvoiceTemplate handles multiple 
                                    templateId: selectedTemplate
                                }} 
                                settings={settings} 
                                storeInfo={storeInfo} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
