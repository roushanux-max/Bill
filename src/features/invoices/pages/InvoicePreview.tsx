import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Download, Share2, Printer, Pencil } from 'lucide-react';
import { BrandingSettings } from '@/shared/types/branding';
import InvoiceTemplate from '@/features/invoices/components/InvoiceTemplate';
import { Invoice, StoreInfo } from '@/features/invoices/types/invoice';
import { getInvoice, getStoreInfo, getBrandingSettings, getUserKey, safeGet } from '@/shared/utils/storage';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
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
          if (parsed && parsed.items && parsed.items.length > 0) {
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
            createdAt: new Date().toISOString()
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
              hsn: '998311'
            }
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
          store_id: ''
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

  const isInvoiceValid = invoice && invoice.items && invoice.items.length > 0;

  const handleDownload = async () => {
    if (!isInvoiceValid) {
      toast.error('Cannot generate PDF for an incomplete invoice.');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating PDF...');

    try {
      const [currentStoreInfo, currentSettings] = await Promise.all([
        getStoreInfo(),
        getBrandingSettings()
      ]);

      const brandSettings = currentSettings || settings || globalSettings;
      const pdf = generateInvoicePDF(invoice, currentStoreInfo || storeInfo || globalStoreInfo!, brandSettings);
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

      const pdf = generateInvoicePDF(invoice, currentStoreInfo || storeInfo || globalStoreInfo!, brandSettings);

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
        getBrandingSettings()
      ]);

      const brandSettings = currentSettings || settings || globalSettings;
      const pdf = generateInvoicePDF(invoice, currentStoreInfo || storeInfo || globalStoreInfo!, brandSettings);
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
    <div className="min-h-screen bg-slate-50">
      {isGenerating && <LoadingScreen type="printing" />}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={handleBack} 
              className="flex items-center gap-1.5 transition-colors font-medium text-sm sm:text-base border-none bg-transparent p-0 cursor-pointer hover:opacity-80 text-[var(--brand-color)]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Invoice Preview</h1>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <Link to={`/create-invoice?edit=${invoice.id}`}>
              <Button
                variant="default"
                size="sm"
                className="bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white border-none px-4"
                disabled={isGenerating}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Invoice
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-2 border-[var(--brand-color)] text-[var(--brand-color)] hover:bg-[var(--brand-color)]/5 bg-white"
              disabled={isGenerating || !isInvoiceValid}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="border-2 border-[var(--brand-color)] text-[var(--brand-color)] hover:bg-[var(--brand-color)]/5 bg-white"
              disabled={isGenerating || !isInvoiceValid}
            >
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white border-none"
              disabled={isGenerating || !isInvoiceValid}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white border-none px-3"
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="print:p-0 print:max-w-full">
        {!isInvoiceValid && !loading ? (
          <div className="max-w-2xl mx-auto mt-12 px-4">
             <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowLeft className="h-8 w-8 text-amber-600 rotate-90" />
                </div>
                <h2 className="text-xl font-bold text-amber-900 mb-2">Incomplete Invoice Data</h2>
                <p className="text-amber-700 mb-6">This invoice appears to be missing items or basic details. Please go back and ensure all fields are filled before previewing.</p>
                <Button onClick={handleBack} className="bg-amber-600 hover:bg-amber-700 text-white border-none px-8">
                  Go Back to Editor
                </Button>
             </div>
          </div>
        ) : (
          <>
            {/* Template View with Horizontal Scroll for Mobile */}
            <div className="w-full bg-slate-100 py-6 sm:py-12 print:hidden overflow-x-auto px-4 flex justify-start sm:justify-center min-h-[calc(100vh-80px)]">
              <div className="bg-white rounded-lg shadow-2xl flex-shrink-0" style={{ width: '210mm', minHeight: '297mm' }}>
                <InvoiceTemplate invoice={invoice!} settings={settings} storeInfo={storeInfo} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}