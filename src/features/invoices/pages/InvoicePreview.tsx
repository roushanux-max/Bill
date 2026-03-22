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
  const [returnPath, setReturnPath] = useState('/settings');

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try to load from ID parameter (highest priority)
      const previewInvoiceId = searchParams.get('id');
      if (previewInvoiceId && previewInvoiceId !== 'sample') {
        try {
          const selectedInvoice = await getInvoice(previewInvoiceId);
          if (selectedInvoice && selectedInvoice.items && selectedInvoice.items.length > 0) {
            console.log('Loaded complete invoice from DB:', selectedInvoice.id);
            setInvoice(selectedInvoice);
            return;
          } else if (selectedInvoice) {
            console.warn('Invoice fetched from DB but missing items. Attempting local merge...');
            // Don't return yet, allow it to fall through to local storage check which might have items
            setInvoice(selectedInvoice);
          }
        } catch (e) {
          console.error('Failed to load invoice by ID:', e);
        }
      }

      // 2. Try to load from localStorage previewInvoice (standard path)
      const invKey = getUserKey('previewInvoice');
      const previewData = invKey ? safeGet(invKey) : null;
      if (previewData) {
        try {
          const parsedInvoice = JSON.parse(previewData);
          if (!previewInvoiceId || parsedInvoice.id === previewInvoiceId || previewInvoiceId === 'sample') {
            console.log('Loaded preview invoice from primary storage:', parsedInvoice.id);
            setInvoice(parsedInvoice);
            return;
          }
        } catch (error) {
          console.error('Error parsing preview invoice:', error);
        }
      }

      // Fallback to sample data
      setInvoice({
        id: 'sample',
        invoiceNumber: 'INV-2024-001',
        date: formatDateForDisplay(new Date().toISOString()),
        customerId: 'cust-1',
        customer: {
          id: 'cust-1',
          name: 'Acme Corporation',
          gstin: '27AABCU1234F1Z5',
          address: '123 Business Park, Sector 62, Mumbai, MH - 400001',
          state: 'Maharashtra',
          phone: '+91 98765 43210',
          email: 'finance@acme.com',
          createdAt: new Date().toISOString()
        },
        items: [
          {
            id: 'item-1',
            invoice_id: 'sample',
            product_id: 'p-1',
            productName: 'Professional Web Design Services',
            quantity: 1,
            unitPrice: 45000,
            hsn: '998311',
            taxRate: 18,
            taxAmount: 8100,
            discountAmount: 0,
            totalAmount: 45000
          },
          {
            id: 'item-2',
            invoice_id: 'sample',
            product_id: 'p-2',
            productName: 'Premium Hosting (1 Year)',
            quantity: 1,
            unitPrice: 3000,
            hsn: '998313',
            taxRate: 18,
            taxAmount: 540,
            discountAmount: 0,
            totalAmount: 3000
          }
        ],
        transportCharges: 0,
        discountTotal: 0,
        notes: 'Thank you for your business! Please pay within 15 days.',
        subtotal: 48000,
        taxTotal: 8640,
        grandTotal: 56640,
        status: 'unpaid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        store_id: ''
      });
    } catch (e) {
      console.error('Final fallback error:', e);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      setSettings(globalSettings);
      setStoreInfo(globalStoreInfo);

      const setKey = getUserKey('previewBrandingSettings');
      const storeKey = getUserKey('previewStoreInfo');
      const previewSettingsRaw = setKey ? safeGet(setKey) : null;
      const previewStoreRaw = storeKey ? safeGet(storeKey) : null;

      if (previewSettingsRaw) {
        try { setSettings(JSON.parse(previewSettingsRaw)); } catch (e) {}
      }
      if (previewStoreRaw) {
        try { setStoreInfo(JSON.parse(previewStoreRaw)); } catch (e) {}
      }

      const returnTo = searchParams.get('return');
      if (returnTo) setReturnPath(returnTo);

      await loadInvoice();
    };

    init();
  }, [globalSettings, globalStoreInfo, searchParams, loadInvoice]);

  const handleBack = () => {
    smartBack('/dashboard');
  };

  const handleDownload = async () => {
    if (!invoice) return;

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
              className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 transition-colors font-medium text-sm sm:text-base border-none bg-transparent p-0 cursor-pointer"
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
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 border-none px-4"
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
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="text-amber-600 border-amber-200 hover:bg-amber-50"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900"
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex sm:hidden items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              className="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3"
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="print:p-0 print:max-w-full">
        {/* Mobile: Scaled down view for preview only */}
        <div className="block sm:hidden w-full bg-slate-100 py-4 print:hidden flex justify-center overflow-hidden">
          <div
            style={{
              transform: 'scale(0.45)',
              transformOrigin: 'top center',
              width: '210mm',
              marginBottom: '-600px' // Adjust for scaled height properly
            }}
          >
            <InvoiceTemplate invoice={invoice} settings={settings} storeInfo={storeInfo} />
          </div>
        </div>

        {/* Desktop: Full size view for preview only */}
        <div className="hidden sm:block px-4 py-8 max-w-full mx-auto print:hidden">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mx-auto" style={{ maxWidth: '210mm' }}>
            <InvoiceTemplate invoice={invoice} settings={settings} storeInfo={storeInfo} />
          </div>
        </div>
      </main>
    </div>
  );
}