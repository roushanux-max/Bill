import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { ArrowLeft, Download, Share2, Printer, Pencil } from 'lucide-react';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { Invoice, StoreInfo } from '../types/invoice';
import { getInvoices, getStoreInfo, getBrandingSettings } from '../utils/storage';
import { generateInvoicePDF, getInvoiceFilename } from '../utils/generateInvoicePDF';
import { useBranding } from '../contexts/BrandingContext';
import { toast } from 'sonner';
import { getUserKey } from '../utils/storage';

export default function InvoicePreview() {
  const { settings: globalSettings, storeInfo: globalStoreInfo } = useBranding();
  const [settings, setSettings] = useState<BrandingSettings>(globalSettings);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(globalStoreInfo);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [returnPath, setReturnPath] = useState('/settings');

  useEffect(() => {
    const init = async () => {
      // Load settings and store info (prefer preview overrides saved in localStorage)
      setSettings(globalSettings);
      setStoreInfo(globalStoreInfo || {
        name: 'My Business',
        gstin: '',
        address: 'Setup Pending',
        state: '',
        phone: '',
        email: ''
      });

      // Preview overrides (from Branding Settings preview button)
      const previewSettingsRaw = localStorage.getItem(getUserKey('previewBrandingSettings'));
      const previewStoreRaw = localStorage.getItem(getUserKey('previewStoreInfo'));

      if (previewSettingsRaw) {
        try {
          const parsed = JSON.parse(previewSettingsRaw);
          setSettings(parsed);
        } catch (e) {
          console.error('Failed to parse previewBrandingSettings', e);
        }
      }

      if (previewStoreRaw) {
        try {
          const parsed = JSON.parse(previewStoreRaw);
          setStoreInfo(parsed);
        } catch (e) {
          console.error('Failed to parse previewStoreInfo', e);
        }
      }

      // Check for return path
      const returnTo = searchParams.get('return');
      if (returnTo) {
        setReturnPath(returnTo);
      }

      // First try to load from localStorage previewInvoice (from create page)
      const previewData = localStorage.getItem(getUserKey('previewInvoice'));
      if (previewData) {
        try {
          const parsedInvoice = JSON.parse(previewData);
          console.log('Loaded preview invoice:', parsedInvoice);
          setInvoice(parsedInvoice);
          return;
        } catch (error) {
          console.error('Error parsing preview invoice:', error);
        }
      }

      // Try to load from ID parameter (from invoice list)
      const previewInvoiceId = searchParams.get('id');
      if (previewInvoiceId) {
        const invoices = await getInvoices();
        const selectedInvoice = invoices.find((inv) => inv.id === previewInvoiceId);
        if (selectedInvoice) {
          setInvoice(selectedInvoice);
          return;
        }
      }

      // Fallback to sample data
      setInvoice({
        id: 'sample',
        invoiceNumber: '1060',
        date: '16.01.26',
        customerId: 'sample',
        customer: {
          name: 'Credit Access India Foundation',
          gstin: '10DAOPK4311H1Z1',
          address: 'Jayanagar, Bangalore - 560070',
          state: 'Karnataka',
          phone: '+91 98765 12345',
          email: 'sample@example.com'
        },
        items: [
          {
            id: '1',
            productId: '1',
            name: 'Iron Rack Size (6×3.5) with Five Plate',
            hsn: '9403',
            quantity: 3,
            unit: 'pcs',
            rate: 3550,
            taxRate: 18,
            amount: 10650,
          },
          {
            id: '2',
            productId: '2',
            name: '3 Seater SS Visitor Chair Made Up With 304 Grade 2 Endless and Bottom Connecting (50/100 mm SS Pipe) (6.2 1/4 HW) 34 KG and 600 Gms Seating Size 29 Inches Seating Size',
            hsn: '9403',
            quantity: 3,
            unit: 'pcs',
            rate: 12450,
            taxRate: 18,
            amount: 37350,
          },
        ],
        transportCharges: 2500,
        discount: 0,
        notes: 'All Subject to Arrah Jurisdiction only.\nGoods once sold will not be taken back\nAll works transit will be entertained.',
        subtotal: 48000,
        totalTax: 8640,
        total: 59140,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    };

    init();
  }, [searchParams]);

  const handleBack = () => {
    navigate(returnPath);
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

      if (!currentStoreInfo) {
        throw new Error('Store information not found');
      }

      const brandSettings = currentSettings || settings;
      const pdf = generateInvoicePDF(invoice, currentStoreInfo, brandSettings);
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

      if (!currentStoreInfo) {
        throw new Error('Store information not found');
      }

      const currentSettings = await getBrandingSettings();
      const brandSettings = currentSettings || settings;

      const pdf = generateInvoicePDF(invoice, currentStoreInfo, brandSettings);

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

      if (!currentStoreInfo) {
        throw new Error('Store information not found');
      }

      const brandSettings = currentSettings || settings;
      const pdf = generateInvoicePDF(invoice, currentStoreInfo, brandSettings);
      const filename = getInvoiceFilename(invoice);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice for ${invoice.customer.name}`,
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

  if (!invoice || !storeInfo) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <Link to={returnPath}>
                <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3 shrink-0">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">Invoice Preview</h1>
            </div>
          </div>
          {/* Action Buttons - Mobile */}
          <div className="flex flex-wrap gap-2 sm:hidden">
            <Link to={returnPath} className="flex-1 min-w-[45%]">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                disabled={isGenerating}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 min-w-[45%]"
              disabled={isGenerating}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button
              size="sm"
              onClick={handleShare}
              className="flex-1"
              disabled={isGenerating}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex sm:items-center sm:justify-end sm:gap-2 sm:px-4 sm:pb-4">
          <Link to={returnPath}>
            <Button
              variant="default"
              size="sm"
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
            disabled={isGenerating}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            <Download className="h-4 w-4 mr-2" />
            Save PDF
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isGenerating}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
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