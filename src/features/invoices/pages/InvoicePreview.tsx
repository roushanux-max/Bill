import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Printer, Download, Share2, Pencil, ChevronLeft } from 'lucide-react';
import Header from '@/shared/components/Header';
import { BrandingSettings } from '@/shared/types/branding';
import InvoiceTemplate from '@/features/invoices/components/InvoiceTemplate';
import { Invoice, StoreInfo } from '@/features/invoices/types/invoice';
import {
  getInvoice,
  getStoreInfo,
  getBrandingSettings,
  getUserKey,
  safeGet,
} from '@/shared/utils/storage';
import {
  generateInvoicePDF,
  getInvoiceFilename,
} from '@/features/invoices/utils/generateInvoicePDF';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { toast } from 'sonner';
import { formatDateForDisplay } from '@/shared/utils/dateUtils';

import LoadingScreen from '@/shared/components/LoadingScreen';
import { useNavigation } from '@/shared/contexts/NavigationContext';

export default function InvoicePreview() {
  const { smartBack } = useNavigation();
  const { settings: globalSettings, storeInfo: globalStoreInfo } = useBranding();
  const [settings, setSettings] = useState<BrandingSettings>(globalSettings);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(globalStoreInfo);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [returnPath, setReturnPath] = useState('/dashboard');

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Priority: Preview Data from localStorage (for real-time updates from Create/Settings)
      const invKey = getUserKey('previewInvoice');
      const previewData = invKey ? safeGet(invKey) : null;
      if (previewData) {
        try {
          const parsed = JSON.parse(previewData);
          if (parsed && parsed.items) {
            console.log('Loaded from preview storage');
            setInvoice(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse preview data', e);
        }
      }

      // 2. Priority: Database Data by ID
      const previewInvoiceId = searchParams.get('id');
      if (previewInvoiceId && previewInvoiceId !== 'sample' && previewInvoiceId !== 'preview') {
        try {
          const dbInvoice = await getInvoice(previewInvoiceId);
          if (dbInvoice) {
            console.log('Loaded from database');
            setInvoice(dbInvoice);
            return;
          }
        } catch (e) {
          console.error('Failed to fetch from DB', e);
          toast.error('Could not find the requested invoice in database.');
        }
      }

      // 3. Fallback: Sample Data (only if explicitly requested or everything else fails)
      if (previewInvoiceId === 'sample' || !previewData) {
        console.log('Falling back to sample data');
        setInvoice({
          id: 'sample',
          invoiceNumber: 'INV-SAMPLE-001',
          date: new Date().toISOString(),
          customerId: 'cust-sample',
          customer: {
            id: 'cust-sample',
            name: 'Sample Customer Ltd.',
            gstin: '27AABCU1234F1Z5',
            phone: '+91 9876543210',
            address: '123, Sample Street, Business District, Mumbai, MH',
            state: 'Maharashtra',
            createdAt: new Date().toISOString(),
          },
          items: [
            {
              id: 'itm-1',
              invoice_id: 'sample',
              productName: 'Sample Professional Services',
              quantity: 1,
              unitPrice: 5000,
              taxRate: 18,
              taxAmount: 900,
              discountAmount: 0,
              totalAmount: 5000,
              hsn: '998311',
            },
          ],
          subtotal: 5000,
          taxTotal: 900,
          discountTotal: 0,
          transportCharges: 0,
          grandTotal: 5900,
          notes: 'This is a sample invoice for preview purposes.',
          status: 'unpaid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          store_id: '',
        });
      }
    } catch (e) {
      console.error('Critical loading error', e);
      toast.error('An unexpected error occurred while loading the invoice preview.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      // 1. Priority: Preview Branding from localStorage
      const setKey = getUserKey('previewBrandingSettings');
      const storeKey = getUserKey('previewStoreInfo');
      const previewSettingsRaw = setKey ? safeGet(setKey) : null;
      const previewStoreRaw = storeKey ? safeGet(storeKey) : null;

      let currentSettings = globalSettings;
      let currentStore = globalStoreInfo;

      if (previewSettingsRaw) {
        try {
          currentSettings = JSON.parse(previewSettingsRaw);
          console.log('Using preview branding settings');
        } catch (e) {}
      }
      if (previewStoreRaw) {
        try {
          currentStore = JSON.parse(previewStoreRaw);
          console.log('Using preview store info');
        } catch (e) {}
      }

      setSettings(currentSettings);
      setStoreInfo(currentStore);

      const returnTo = searchParams.get('return');
      if (returnTo) setReturnPath(returnTo);

      await loadInvoice();
    };

    init();
  }, [globalSettings, globalStoreInfo, searchParams, loadInvoice]);

  const handleBack = () => {
    smartBack(returnPath);
  };

  const isInvoiceValid = invoice && invoice.items; // Allow empty items per user request

  const handleDownload = async () => {
    if (!invoice) return;

    setIsGenerating(true);
    const toastId = toast.loading('Generating PDF...');

    try {
      const [currentStoreInfo, currentSettings] = await Promise.all([
        getStoreInfo(),
        getBrandingSettings(),
      ]);

      const brandSettings = currentSettings || settings || globalSettings;
      const pdf = generateInvoicePDF(
        invoice,
        currentStoreInfo || storeInfo || globalStoreInfo!,
        brandSettings
      );
      const filename = getInvoiceFilename(invoice);
      pdf.save(filename);
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    setIsGenerating(true);
    const toastId = toast.loading('Preparing print preview...');
    try {
      let currentStoreInfo = storeInfo;
      if (!currentStoreInfo) {
        currentStoreInfo = await getStoreInfo();
      }

      const currentSettings = await getBrandingSettings();
      const brandSettings = currentSettings || settings || globalSettings;

      const pdf = generateInvoicePDF(
        invoice,
        currentStoreInfo || storeInfo || globalStoreInfo!,
        brandSettings
      );

      // Use autoPrint and open in a way that triggers the dialog
      pdf.autoPrint();
      const blobUrl = URL.createObjectURL(pdf.output('blob'));

      // Open in a new window/tab and trigger print
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Pop-up blocked. Please allow pop-ups to print.');
      }

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      toast.success('Print preview opened!', { id: toastId });
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print preview', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    setIsGenerating(true);
    const toastId = toast.loading('Preparing to share...');
    try {
      const [currentStoreInfo, currentSettings] = await Promise.all([
        getStoreInfo(),
        getBrandingSettings(),
      ]);

      const brandSettings = currentSettings || settings || globalSettings;
      const pdf = generateInvoicePDF(
        invoice,
        currentStoreInfo || storeInfo || globalStoreInfo!,
        brandSettings
      );
      const filename = getInvoiceFilename(invoice);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice for ${invoice.customer?.name || 'Walk-in'}`,
          files: [file],
        });
        toast.dismiss(toastId);
      } else {
        // Fallback: download the PDF
        pdf.save(filename);
        toast.dismiss(toastId);
        toast.success('PDF downloaded!', { id: toastId });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Sharing failed', { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!invoice) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      {isGenerating && <LoadingScreen type="printing" />}
      
      {/* 1. MAIN GLOBAL HEADER */}
      <Header />

      {/* 2. SUB-HEADER: ACTIONS */}
      <div 
        className="bg-white border-b border-slate-100 py-6 sticky top-20 z-50 print:hidden shadow-sm transition-all"
        style={{ top: '80px' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={handleBack}
              className="group flex items-center gap-1.5 transition-all bg-transparent border-none p-0 cursor-pointer font-bold text-sm"
              style={{ color: 'var(--brand-color, #f59e0b)' }}
            >
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-black text-[#0f172a] tracking-tight">Invoice Preview</h1>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to={`/create-invoice?edit=${invoice.id}`} className="no-underline">
              <Button
                variant="default"
                className="text-white border-none h-12 px-8 rounded-2xl shadow-md active:scale-95 transition-all font-black"
                style={{ 
                  backgroundColor: 'var(--brand-color, #f59e0b)',
                  boxShadow: '0 8px 16px -4px var(--brand-color-light, rgba(245, 158, 11, 0.2))'
                }}
                disabled={isGenerating}
              >
                <Pencil className="h-4 w-4 mr-2" strokeWidth={3} />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-2 h-12 px-8 rounded-2xl active:scale-95 transition-all font-black bg-transparent"
              style={{ 
                borderColor: 'var(--brand-color, #f59e0b)',
                color: 'var(--brand-color, #f59e0b)' 
              }}
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" strokeWidth={3} />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="border-2 h-12 px-8 rounded-2xl active:scale-95 transition-all font-black bg-transparent"
              style={{ 
                borderColor: 'var(--brand-color, #f59e0b)',
                color: 'var(--brand-color, #f59e0b)' 
              }}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" strokeWidth={3} />
              Save PDF
            </Button>
            <Button
              variant="default"
              onClick={handleShare}
              className="text-white border-none h-12 px-8 rounded-2xl shadow-md active:scale-95 transition-all font-black"
              style={{ 
                backgroundColor: 'var(--brand-color, #f59e0b)',
                boxShadow: '0 8px 16px -4px var(--brand-color-light, rgba(245, 158, 11, 0.2))'
              }}
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4 mr-2" strokeWidth={3} />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* 3. INVOICE CONTENT */}
      <main className="print:p-0 print:max-w-full print:mt-0">
        <div className="w-full bg-slate-50 py-12 sm:py-20 print:p-0 print:bg-white min-h-screen">
          <div className="max-w-6xl mx-auto px-4 flex justify-center overflow-x-auto sm:overflow-visible">
            <article
              className="bg-white shadow-2xl rounded-sm print:shadow-none flex-shrink-0"
              style={{ width: '210mm', minHeight: '297mm' }}
            >
              <InvoiceTemplate invoice={invoice!} settings={settings} storeInfo={storeInfo} />
            </article>
          </div>
        </div>

        {/* Floating Mobile Actions */}
        <div className="fixed bottom-8 left-0 right-0 md:hidden px-6 z-50 pointer-events-none flex justify-center gap-3">
          <Button
            variant="default"
            onClick={handleShare}
            className="pointer-events-auto text-white border-none h-14 px-8 rounded-2xl shadow-2xl font-black"
            style={{ 
              backgroundColor: 'var(--brand-color, #f59e0b)',
              boxShadow: '0 12px 24px -6px var(--brand-color-light, rgba(245, 158, 11, 0.3))'
            }}
            disabled={isGenerating}
          >
            <Share2 className="h-5 w-5 mr-3" strokeWidth={3} />
            Share Invoice
          </Button>
        </div>
      </main>
    </div>
  );
}
