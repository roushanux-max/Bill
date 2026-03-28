import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Plus, Trash2, Eye, ArrowLeft, MoreVertical, Smartphone, Info, Download, Upload, Palette, Building2, RotateCcw, Users } from 'lucide-react';
import { cn } from '@/shared/components/ui/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  generateInvoicePDF,
  getInvoiceFilename,
} from '@/features/invoices/utils/generateInvoicePDF';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { Invoice, InvoiceItem } from '@/features/invoices/types/invoice';
import { saveInvoice as dbSaveInvoice, getAndIncrementInvoiceNumber } from '@/shared/utils/storage';
import { validateInput, ValidationRules } from '@/shared/utils/validation';
import { formatDateForDisplay } from '@/shared/utils/dateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Calendar } from '@/shared/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import InvoicePreviewModal from './InvoicePreviewModal';

export default function InvoiceForm({
  onInteractionChange,
}: {
  onInteractionChange?: (hasData: boolean) => void;
}) {
  const { user } = useAuth();
  const { settings: globalBranding, storeInfo: currentStore, updateSettings, updateStoreInfo } = useBranding();
  const navigate = useNavigate();
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Logo must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({ ...globalBranding, logo: reader.result as string });
        toast.success('Logo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ ...globalBranding, primaryColor: e.target.value });
  };

  const handleStoreInfoChange = (field: string, value: string) => {
    updateStoreInfo({ ...(currentStore || { name: '', email: '', phone: '', address: '', gstin: '', state: '' }), [field]: value });
  };

  const getDraftKey = () => (user ? `draft_${user.id}_new_invoice` : `guest_draft_new_invoice`);


  // --- State: UI & Controls ---
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // --- Validation State ---
  const [customerErrors, setCustomerErrors] = useState<{
    name?: string | null;
    phone?: string | null;
  }>({});
  const [itemErrors, setItemErrors] = useState<
    Record<string, { quantity?: string | null; unitPrice?: string | null }>
  >({});

  // --- State: Single Source of Truth ---
  const [invoice, setInvoice] = useState<Invoice>({
    id: crypto.randomUUID(),
    items: [],
    customer: { id: '', name: '', phone: '', email: '', gstin: '', address: '', state: '', createdAt: new Date().toISOString() },
    transportCharges: 0,
    discountTotal: 0,
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    subtotal: 0,
    taxTotal: 0,
    grandTotal: 0,
    notes: '',
    status: 'unpaid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    store_id: '',
    customerId: '',
  });
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);

  // --- Restoration Logic ---
  useEffect(() => {
    const restoreData = async () => {
      setIsLoadingDraft(true);
      try {
        const draftKey = getDraftKey();
        const localDraft = localStorage.getItem(draftKey);
        let restored: Invoice | null = null;

        if (localDraft) {
          restored = JSON.parse(localDraft) as Invoice;
        }

        const today = new Date().toISOString().split('T')[0];
        if (restored) {
          // If it's a guest draft, ensure the date is always today when they revisit
          if (!user) {
            restored.date = today;
            if (!restored.guestCreatedAt) {
              restored.guestCreatedAt = Date.now();
            }
          }
          setInvoice(restored);
        } else {
          setInvoice({
            id: crypto.randomUUID(),
            guestCreatedAt: Date.now(),
            store_id: 'draft',
            customerId: '',
            invoiceNumber: '',
            date: today,
            subtotal: 0,
            taxTotal: 0,
            discountTotal: 0,
            grandTotal: 0,
            transportCharges: 0,
            notes: 'Thank you for your business.',
            status: 'unpaid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: [
              {
                id: crypto.randomUUID(),
                invoice_id: 'draft',
                productName: '',
                quantity: 1,
                unitPrice: 0,
                taxRate: 18,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: 0,
                createdAt: new Date().toISOString(),
              },
            ],
            customer: { 
              id: crypto.randomUUID(),
              name: '',
              phone: '',
              email: '',
              gstin: '',
              address: '',
              state: '',
              createdAt: new Date().toISOString()
            },
          });
        }
      } catch (e) {
        console.error('Failed to restore draft:', e);
      } finally {
        setIsLoadingDraft(false);
      }
    };

    restoreData();
  }, [user?.id]);

  // --- Guest Data Lifecycle & Expiration ---
  useEffect(() => {
    if (user || isLoadingDraft || !invoice) return;

    // 1. Delete on page refresh
    const handleBeforeUnload = () => {
      localStorage.removeItem(getDraftKey());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 2. 10 minute expiration logic
    const duration = 10 * 60 * 1000; // 10 minutes
    const updateTimer = () => {
      if (!invoice.guestCreatedAt) return;
      const elapsed = Date.now() - invoice.guestCreatedAt;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        // Auto-delete
        localStorage.removeItem(getDraftKey());
        window.location.reload();
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(intervalId);
    };
  }, [user, isLoadingDraft, invoice?.guestCreatedAt]);

  // UI-only states (not persisted to DB)
  const [customerMatches, setCustomerMatches] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [activeCustomerIdx, setActiveCustomerIdx] = useState<number>(-1);

  const [productMatches, setProductMatches] = useState<any[]>([]);
  const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null);
  const [activeProductMatchIdx, setActiveProductMatchIdx] = useState<number>(-1);

  const customerSearchTimeout = useRef<any>(null);
  const productSearchTimeout = useRef<any>(null);

  const activeDomain = globalBranding.domain || 'general';

  // --- Derived Math ---
  const subtotal = useMemo(() => {
    if (!invoice?.items) return 0;
    return invoice.items.reduce(
      (sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
  }, [invoice?.items]);

  const tax = useMemo(() => {
    if (!invoice?.items) return 0;
    return invoice.items.reduce(
      (sum: number, item: any) =>
        sum + (item.quantity || 0) * (item.unitPrice || 0) * ((item.taxRate || 0) / 100),
      0
    );
  }, [invoice?.items]);

  const grandTotal = useMemo(() => {
    return (
      subtotal +
      tax +
      Number(invoice?.transportCharges || 0) -
      Number(invoice?.discountTotal || 0)
    );
  }, [subtotal, tax, invoice?.transportCharges, invoice?.discountTotal]);

  const isCustomerValid =
    !Object.values(customerErrors).some((err) => err !== null) && invoice?.customer?.name?.trim();

  const areItemsValid = useMemo(() => {
    if (!invoice?.items || invoice.items.length === 0) return false;
    return invoice.items.every((i: any) => {
      const errs = itemErrors[i.id] || {};
      return (
        !errs.quantity &&
        !errs.unitPrice &&
        i.productName?.trim() &&
        i.quantity > 0 &&
        i.unitPrice > 0
      );
    });
  }, [invoice?.items, itemErrors]);

  const isReady = Boolean(isCustomerValid && areItemsValid);

  // --- Fetch Next Invoice Number on Mount (if new) ---
  useEffect(() => {
    if (invoice && !invoice.invoiceNumber && !isLoadingDraft) {
      getAndIncrementInvoiceNumber().then((num) => {
        updateInvoice({ invoiceNumber: num });
      });
    }
  }, [isLoadingDraft]);

  // --- Autosave & Persistence ---
  useEffect(() => {
    if (!invoice || typeof window === 'undefined') return;

    const draftKey = getDraftKey();

    // 1. Instant sync to localStorage (Safety)
    localStorage.setItem(
      draftKey,
      JSON.stringify({ ...invoice, updatedAt: new Date().toISOString() })
    );

    // 2. Debounced save to Database (Real Reliability)
    const timer = setTimeout(async () => {
      if (isSaving || !user) return;

      try {
        setIsSaving(true);
        const toSave = {
          ...invoice,
          subtotal,
          taxTotal: tax,
          grandTotal,
          updatedAt: new Date().toISOString(),
        };

        await dbSaveInvoice(toSave);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (e) {
        console.warn('DB Autosave failed (likely offline):', e);
      } finally {
        setIsSaving(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [invoice, user?.id]);

  // --- Actions ---
  const updateInvoice = (updates: any) => {
    setInvoice((prev: any) => ({ ...prev, ...updates }));
  };

  const updateCustomer = (updates: any) => {
    setInvoice((prev: any) => ({
      ...prev,
      customer: { ...prev.customer, ...updates },
    }));

    const newErrs = { ...customerErrors };
    if (updates.name !== undefined) newErrs.name = validateInput('name', updates.name);
    if (updates.phone !== undefined)
      newErrs.phone = validateInput('mobile', String(updates.phone));
    setCustomerErrors(newErrs);

    // Smart Search Trigger
    if (updates.name !== undefined || updates.phone !== undefined) {
      if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
      customerSearchTimeout.current = setTimeout(async () => {
        const query = (updates.name || updates.phone || '').trim();
        if (query.length >= 2) {
          const { searchCustomers } = await import('@/shared/utils/storage');
          const matches = await searchCustomers(query);
          setCustomerMatches(matches);
          setShowCustomerDropdown(matches.length > 0);
          setActiveCustomerIdx(-1);
        } else {
          setShowCustomerDropdown(false);
        }
      }, 300);
    }
  };

  const selectCustomer = (match: any) => {
    updateCustomer({
      id: match.id,
      name: match.name,
      mobile: match.phone || '',
      email: match.email || '',
      address: match.address || `${match.city ? match.city + ', ' : ''}${match.state || ''}`.trim(),
    });
    setShowCustomerDropdown(false);
  };

  const updateItem = (id: string, updates: any) => {
    setInvoice((prev: any) => ({
      ...prev,
      items: prev.items.map((item: any) => (item.id === id ? { ...item, ...updates } : item)),
    }));

    const newErrs = { ...itemErrors[id] };
    if (updates.quantity !== undefined)
      newErrs.quantity = validateInput('quantity', String(updates.quantity));
    if (updates.unitPrice !== undefined)
      newErrs.unitPrice = validateInput('amount', String(updates.unitPrice));
    if (Object.keys(newErrs).length > 0) {
      setItemErrors((prev) => ({ ...prev, [id]: newErrs }));
    }

    // Product Search Trigger
    if (updates.productName !== undefined) {
      if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);
      productSearchTimeout.current = setTimeout(async () => {
        const val = updates.productName.trim();
        if (val.length >= 2) {
          const { searchProducts } = await import('@/shared/utils/storage');
          const matches = await searchProducts(val);
          setProductMatches(matches);
          const idx = invoice.items.findIndex((i: any) => i.id === id);
          setActiveProductIdx(idx);
          setActiveProductMatchIdx(-1);
        } else {
          setActiveProductIdx(null);
        }
      }, 300);
    }
  };

  const selectProduct = (itemId: string, match: any) => {
    updateItem(itemId, {
      productName: match.name,
      unitPrice: match.sellingPrice || 0,
      taxRate: match.gstRate || 0,
      hsn: match.hsnCode || '',
      unit: match.unit || 'pcs',
      totalAmount:
        (invoice.items.find((i: any) => i.id === itemId)?.quantity || 1) *
        (match.sellingPrice || 0),
    });
    setActiveProductIdx(null);
  };

  const addItem = () => {
    const newItem = {
      id: crypto.randomUUID(),
      productName: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      totalAmount: 0,
    };
    updateInvoice({ items: [...invoice.items, newItem] });
  };

  const removeItem = (id: string) => {
    if (invoice.items.length <= 1) return;
    updateInvoice({ items: invoice.items.filter((i: any) => i.id !== id) });
  };

  // --- More logic follows (handleDownload, customer search etc.) ---
  const getSerializedItems = () =>
    invoice.items.map((i: any) => {
      const extra = [];
      if (activeDomain === 'clothing') {
        if (i.unit) extra.push(`Size: ${i.unit}`);
        if (i.color) extra.push(`Color: ${i.color}`);
      } else if (activeDomain === 'furniture') {
        if (i.material) extra.push(`Material: ${i.material}`);
      } else if (activeDomain === 'freelance') {
        if (i.project) extra.push(`Project: ${i.project}`);
      } else if (activeDomain === 'medical') {
        if (i.patient) extra.push(`Patient: ${i.patient}`);
        if (i.procedure) extra.push(`Procedure: ${i.procedure}`);
      } else if (activeDomain === 'hotel') {
        if (i.room) extra.push(`Room: ${i.room}`);
      }
      const suffix = extra.length > 0 ? ` [${extra.join(', ')}]` : '';
      return {
        ...i,
        name: `${i.productName || 'Item'}${suffix}`,
        rate: i.unitPrice,
        amount: i.totalAmount,
        unit: i.unit || 'pcs',
      };
    });

  const buildInvoiceObj = (): any => ({
    id: invoice.id || crypto.randomUUID(),
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.date,
    store_id: currentStore?.id || 'draft',
    customerId: invoice.customer.id || null,
    status: 'unpaid',
    customer: {
      id: invoice.customer.id || crypto.randomUUID(),
      name: invoice.customer.name || 'Walk-in',
      phone: invoice.customer.phone || '',
      email: invoice.customer.email || '',
      address: invoice.customer.address || '',
      gstin: invoice.customer.gstin || '',
      state: invoice.customer.state || '',
      createdAt: invoice.customer.createdAt || new Date().toISOString(),
    },
    items: getSerializedItems(),
    subtotal,
    taxTotal: tax,
    discountTotal: Number(invoice.discountTotal),
    grandTotal,
    transportCharges: Number(invoice.transportCharges),
    notes: invoice.notes,
    templateId:
      typeof window !== 'undefined'
        ? localStorage.getItem('invoice_default_template') || 'standard'
        : 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const validateForm = () => {
    let isValid = true;
    const newCustomerErrors = { ...customerErrors };
    const newItemErrors: Record<string, { quantity?: string | null; unitPrice?: string | null }> =
      {};

    // Validate customer name
    if (!invoice.customer.name?.trim()) {
      newCustomerErrors.name = 'Customer name is required.';
      isValid = false;
    } else {
      newCustomerErrors.name = null;
    }

    // Validate items
    if (!invoice.items || invoice.items.length === 0) {
      toast.error('At least one item is required.');
      isValid = false;
    } else {
      invoice.items.forEach((item: any) => {
        let itemValid = true;
        const errors: { quantity?: string | null; unitPrice?: string | null } = {};

        if (!item.productName?.trim()) {
          toast.error(`Item "${item.id}" description is required.`);
          itemValid = false;
        }
        if (item.quantity <= 0) {
          errors.quantity = 'Quantity must be greater than 0.';
          itemValid = false;
        }
        if (item.unitPrice <= 0) {
          errors.unitPrice = 'Unit price must be greater than 0.';
          itemValid = false;
        }
        if (!itemValid) {
          newItemErrors[item.id] = errors;
          isValid = false;
        }
      });
    }

    setCustomerErrors(newCustomerErrors);
    setItemErrors(newItemErrors);
    return isValid;
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    const draftKey = getDraftKey();
    localStorage.removeItem(draftKey);
    window.location.reload(); // Simplest way to ensure all derived state & hooks reset
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const toastId = toast.loading('Saving invoice...');

    try {
      // Auto-save new Customer/Product
      const { saveCustomer, saveProduct } = await import('@/shared/utils/storage');

      // 1. Customer
      if (invoice.customer && invoice.customer.name) {
        await saveCustomer({
          id: invoice.customer.id || crypto.randomUUID(),
          name: invoice.customer.name,
          phone: invoice.customer.phone || '',
          email: invoice.customer.email || '',
          address: invoice.customer.address || '',
          gstin: invoice.customer.gstin || '',
          state: invoice.customer.state || '',
          isSynced: false,
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Products
      for (const item of invoice.items) {
        if (item.productName) {
          await saveProduct({
            id: item.product_id || crypto.randomUUID(),
            name: item.productName,
            category: 'Other',
            hsnCode: item.hsn || '',
            sellingPrice: item.unitPrice,
            gstRate: item.taxRate,
            unit: item.unit || 'pcs',
            isSynced: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const finalInvoice = {
        ...buildInvoiceObj(), // Use buildInvoiceObj to get the full invoice data
        updatedAt: new Date().toISOString(),
        status: invoice.status || 'unpaid',
      };

      const result = await dbSaveInvoice(finalInvoice);
      if (result) {
        toast.success('Invoice saved successfully!', { id: toastId });
        // Notify the user or redirect
        setTimeout(() => navigate('/invoices'), 500);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = (templateId: string) => {
    // Standard JS PDF Download - templateId would map to different layouts later
    const invoiceObj = buildInvoiceObj();
    const doc = generateInvoicePDF(
      invoiceObj,
      currentStore || ({ name: 'Business' } as any),
      globalBranding
    );
    doc.save(getInvoiceFilename(invoiceObj));
    toast.success(`Downloading with ${templateId} template`);
    setShowPreviewModal(false);
  };

  const hasInteracted = useMemo(() => {
    if (!invoice) return false;
    return (
      (invoice.customer?.name?.trim() !== '') ||
      (invoice.customer?.phone?.trim() !== '') ||
      (invoice.items.some(i => i.productName?.trim() !== '' || i.unitPrice > 0)) ||
      (invoice.notes && invoice.notes.trim() !== '' && invoice.notes !== 'Thank you for your business.') ||
      (invoice.termsAndConditions && invoice.termsAndConditions.trim() !== '') ||
      (globalBranding.logo !== null) ||
      (globalBranding.signatureImage !== null) ||
      (globalBranding.signatureText && globalBranding.signatureText.trim() !== '')
    );
  }, [invoice, globalBranding]);

  useEffect(() => {
    if (onInteractionChange) {
      onInteractionChange(Boolean(hasInteracted));
    }
  }, [hasInteracted, onInteractionChange]);

  if (isLoadingDraft || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold">Restoring your draft...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto pb-6">
      {showPreviewModal && (
        <InvoicePreviewModal
          invoiceData={{
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            customer: invoice.customer,
          }}
          items={getSerializedItems()}
          subtotal={subtotal}
          tax={tax}
          discount={Number(invoice.discountTotal)}
          transportCharges={Number(invoice.transportCharges)}
          grandTotal={grandTotal}
          notes={invoice.notes}
          termsAndConditions={invoice.termsAndConditions}
          onClose={() => setShowPreviewModal(false)}
          onDownload={handleDownloadPDF}
        />
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl scale-in-center">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Reset Invoice</h3>
            <p className="text-slate-500 font-medium mb-8">This will clear all data permanently</p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="font-bold rounded-xl h-12 px-6 border-slate-200"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="font-bold rounded-xl h-12 px-6 flex items-center gap-2 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                onClick={confirmReset}
              >
                <Trash2 size={18} />
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Warning for Guests */}
      {!user && timeLeft !== null && hasInteracted && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in">
          <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
            <Info size={20} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-amber-800 font-bold text-sm">Guest Session Expiring</h4>
            <p className="text-amber-700 text-xs font-medium mt-0.5">
              This invoice will be deleted in <span className="font-black text-amber-900">{Math.floor(timeLeft / 60000)}m {Math.floor((timeLeft % 60000) / 1000)}s</span>. Download it to avoid losing data.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Invoice Details</h2>
          <p className="text-sm text-slate-500">
            Fill out the structured form data. Changes save automatically.
          </p>
        </div>
      </div>

      {/* FORM CONTAINER */}
      <div className="bg-white border text-sm border-slate-200 rounded-3xl shadow-sm p-6">
        
        {/* ─── GUEST BRANDING SECTION ─── */}
        {!user && (
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Palette size={20} strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">Business Details</h3>
                <p className="text-xs text-slate-500 font-bold">Customize how your business appears on the invoice.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Logo & Color */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Logo</label>
                  <div className="relative group w-32 h-32">
                    <div className="w-full h-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 overflow-hidden transition-all group-hover:bg-slate-100 group-hover:border-slate-300">
                      {globalBranding.logo ? (
                        <img src={globalBranding.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <>
                          <Upload size={24} className="text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500">Upload Logo</span>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleLogoUpload}
                    />
                    {globalBranding.logo && (
                      <button 
                        onClick={() => updateSettings({ ...globalBranding, logo: null })}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                      >
                        <Trash2 size={14} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brand Accent Color</label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl border-4 border-white shadow-xl" 
                      style={{ background: globalBranding.primaryColor }} 
                    />
                    <div className="flex-1 relative">
                      <input 
                        type="color" 
                        value={globalBranding.primaryColor} 
                        onChange={handleColorChange}
                        className="absolute inset-x-0 bottom-0 top-0 opacity-0 cursor-pointer w-full"
                      />
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 h-11 flex items-center justify-between pointer-events-none">
                        <span className="font-mono font-bold text-slate-700 tracking-tight">{globalBranding.primaryColor.toUpperCase()}</span>
                        <Palette size={16} className="text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                  <div className="relative items-center flex group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                    <Input 
                      className="pl-12 h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-amber-400 transition-all text-base"
                      placeholder="My Awesome Business"
                      value={currentStore?.name || ''}
                      onChange={(e) => handleStoreInfoChange('name', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</label>
                    <Input 
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white transition-all"
                      placeholder="+91 99999 99999"
                      value={currentStore?.phone || ''}
                      onChange={(e) => handleStoreInfoChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                    <Input 
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white transition-all"
                      placeholder="business@example.com"
                      value={currentStore?.email || ''}
                      onChange={(e) => handleStoreInfoChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Address</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold text-slate-700 focus:bg-white focus:border-amber-400 transition-all min-h-[100px] outline-none"
                    placeholder="123, Street Name, City, State, ZIP"
                    value={currentStore?.address || ''}
                    onChange={(e) => handleStoreInfoChange('address', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GSTIN (Optional)</label>
                    <Input 
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white transition-all"
                      placeholder="27AABCU1234F1Z5"
                      value={currentStore?.gstin || ''}
                      onChange={(e) => handleStoreInfoChange('gstin', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signer Name (Optional)</label>
                    <Input 
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-700 focus:bg-white transition-all"
                      placeholder="e.g. John Doe"
                      value={globalBranding?.signatureText || ''}
                      onChange={(e) => updateSettings({ ...globalBranding, signatureText: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── CUSTOMER DETAILS HEADER ─── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Users size={20} strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Customer Details</h3>
            <p className="text-xs text-slate-500 font-bold">Provide invoice meta and customer information below.</p>
          </div>
        </div>

        {/* ─── EXISTING FORM HEADER (INVOICE NO & DATE) ─── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-100/80">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Invoice Number
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">#</span>
              <input
                className="bg-transparent border-none p-0 font-mono font-black text-xl text-slate-900 outline-none w-40"
                value={invoice.invoiceNumber}
                onChange={(e) => updateInvoice({ invoiceNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Issue Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] h-10 justify-start text-left font-bold border-none bg-slate-50 hover:bg-slate-100 transition-all rounded-xl",
                      !invoice.date && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[var(--brand-color)]" />
                    {invoice.date ? format(new Date(invoice.date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden shadow-2xl border-slate-100" align="start">
                  <Calendar
                    mode="single"
                    selected={invoice.date ? new Date(invoice.date) : undefined}
                    onSelect={(date) => updateInvoice({ date: date?.toISOString().split('T')[0] })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* 1. Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100">
          <div className={cn("relative", !user ? "order-2 md:order-2" : "order-1 md:order-1")}>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
              Phone Number
            </label>
            <input
                          className={`w-full bg-slate-50 p-3 rounded-xl border outline-none transition-colors ${customerErrors.phone ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'focus:border-slate-300'}`}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
              value={invoice.customer.phone || ''}
              onChange={(e) => {
                const val = ValidationRules.mobile.format(e.target.value);
                updateCustomer({ phone: val });
              }}
              onKeyDown={(e) => {
                if (showCustomerDropdown) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveCustomerIdx((prev) => Math.min(prev + 1, customerMatches.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveCustomerIdx((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter' && activeCustomerIdx >= 0) {
                    e.preventDefault();
                    selectCustomer(customerMatches[activeCustomerIdx]);
                  } else if (e.key === 'Escape') {
                    setShowCustomerDropdown(false);
                  }
                }
              }}
            />
            {customerErrors.phone && (
              <p className="text-red-500 text-[10px] mt-1 font-semibold absolute -bottom-5 left-0">
                {customerErrors.phone}
              </p>
            )}
          </div>
          <div className={cn("md:col-span-2 relative", !user ? "order-1 md:order-1" : "order-2 md:order-2")}>
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
              Customer Name *
            </label>
            <input
              className={`w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-800 outline-none border transition-colors ${customerErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'focus:border-slate-300'}`}
              placeholder="Type customer name..."
              value={invoice.customer.name}
              onChange={(e) => updateCustomer({ name: e.target.value })}
              onFocus={() => {
                if (customerMatches.length > 0) setShowCustomerDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              onKeyDown={(e) => {
                if (showCustomerDropdown) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveCustomerIdx((prev) => Math.min(prev + 1, customerMatches.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveCustomerIdx((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter' && activeCustomerIdx >= 0) {
                    e.preventDefault();
                    selectCustomer(customerMatches[activeCustomerIdx]);
                  } else if (e.key === 'Escape') {
                    setShowCustomerDropdown(false);
                  }
                }
              }}
            />
            {customerErrors.name && (
              <p className="text-red-500 text-[10px] mt-1 font-semibold absolute -bottom-5 left-0">
                {customerErrors.name}
              </p>
            )}

            {showCustomerDropdown && customerMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                {customerMatches.map((match: any, i: number) => (
                  <button
                    key={match.id}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 transition-colors ${activeCustomerIdx === i ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'hover:bg-slate-50'}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomer(match);
                    }}
                    onMouseEnter={() => setActiveCustomerIdx(i)}
                  >
                    <div className="font-bold text-slate-800">{match.name}</div>
                    <div className="text-xs text-slate-500">
                      {match.phone} {match.email && `• ${match.email}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-3 order-3 md:order-3">
            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Address</label>
            <input
              className="w-full bg-slate-50 p-3 rounded-xl border focus:border-slate-300 outline-none transition-colors"
              placeholder="Invoicing Address..."
              value={invoice.customer.address}
              onChange={(e) => updateCustomer({ address: e.target.value })}
            />
          </div>
        </div>

        {/* 2. Items Table Section (Dynamic) */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-4">Invoice Items</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left bg-white">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">
                    {activeDomain === 'medical'
                      ? 'Consultation/Treatment'
                      : activeDomain === 'freelance'
                        ? 'Task/Service'
                        : 'Item Description'}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">
                    HSN
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">
                    {activeDomain === 'freelance'
                      ? 'Hours'
                      : activeDomain === 'hotel'
                        ? 'Nights'
                        : 'Qty'}
                  </th>
                  {activeDomain === 'clothing' && (
                    <>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-20">
                        Size
                      </th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-20">
                        Color
                      </th>
                    </>
                  )}
                  {activeDomain === 'furniture' && (
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-28">
                      Material
                    </th>
                  )}
                  {activeDomain === 'freelance' && (
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">
                      Project
                    </th>
                  )}
                  {activeDomain === 'medical' && (
                    <>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">
                        Patient
                      </th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">
                        Procedure
                      </th>
                    </>
                  )}
                  {activeDomain === 'hotel' && (
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">
                      Room No
                    </th>
                  )}
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-32">
                    {activeDomain === 'freelance'
                      ? 'Rate/Hr'
                      : activeDomain === 'hotel'
                        ? 'Rate/Night'
                        : 'Price'}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-24">
                    GST %
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-32">
                    Total
                  </th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b last:border-0 border-slate-100">
                    <td className="p-3 relative">
                      <input
                        className="w-full bg-slate-50 p-2 rounded-lg outline-none font-semibold text-slate-800"
                        placeholder="Product name..."
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                        onFocus={() => {
                          if (
                            (item.productName || '').trim().length >= 2 &&
                            productMatches.length > 0
                          )
                            setActiveProductIdx(idx);
                        }}
                        onBlur={() => setTimeout(() => setActiveProductIdx(null), 200)}
                        onKeyDown={(e) => {
                          if (activeProductIdx === idx && productMatches.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setActiveProductMatchIdx((prev) =>
                                Math.min(prev + 1, productMatches.length - 1)
                              );
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setActiveProductMatchIdx((prev) => Math.max(prev - 1, 0));
                            } else if (e.key === 'Enter' && activeProductMatchIdx >= 0) {
                              e.preventDefault();
                              selectProduct(item.id, productMatches[activeProductMatchIdx]);
                            } else if (e.key === 'Escape') {
                              setActiveProductIdx(null);
                            }
                          }
                        }}
                      />
                      {activeProductIdx === idx && productMatches.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                          {productMatches.map((match: any, mIdx: number) => (
                            <button
                              key={match.id}
                              className={`w-full text-left px-3 py-2 border-b border-slate-100 last:border-0 transition-colors ${activeProductMatchIdx === mIdx ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'hover:bg-slate-50'}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectProduct(item.id, match);
                              }}
                              onMouseEnter={() => setActiveProductMatchIdx(mIdx)}
                            >
                              <div className="font-bold text-slate-800 text-sm truncate">
                                {match.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {match.hsnCode && `HSN: ${match.hsnCode} • `}₹
                                {match.sellingPrice?.toLocaleString()} • GST {match.gstRate}%
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center font-semibold text-slate-500 text-xs"
                        placeholder="HSN/SAC"
                        value={item.hsn || ''}
                        onChange={(e) => updateItem(item.id, { hsn: e.target.value })}
                      />
                    </td>
                    <td className="p-3 text-center relative">
                      <input
                        type="number"
                        className={`w-full bg-slate-50 p-2 rounded-lg outline-none text-center font-bold transition-colors ${itemErrors[item.id] && itemErrors[item.id].quantity ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border border-transparent hover:border-slate-200'}`}
                        value={item.quantity === 0 ? '' : item.quantity}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateItem(item.id, {
                            quantity: Number(e.target.value),
                            totalAmount: Number(e.target.value) * item.unitPrice,
                          })
                        }
                      />
                    </td>
                    {activeDomain === 'clothing' && (
                      <>
                        <td className="p-3 text-center">
                          <input
                            className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                            placeholder="L/XL"
                            value={item.unit || ''}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                            placeholder="Red"
                            value={item.color || ''}
                            onChange={(e) => updateItem(item.id, { color: e.target.value })}
                          />
                        </td>
                      </>
                    )}
                    {activeDomain === 'furniture' && (
                      <td className="p-3 text-center">
                        <input
                          className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                          placeholder="Wood"
                          value={item.material || ''}
                          onChange={(e) => updateItem(item.id, { material: e.target.value })}
                        />
                      </td>
                    )}
                    {activeDomain === 'freelance' && (
                      <td className="p-3 text-center">
                        <input
                          className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                          placeholder="Website"
                          value={item.project || ''}
                          onChange={(e) => updateItem(item.id, { project: e.target.value })}
                        />
                      </td>
                    )}
                    {activeDomain === 'medical' && (
                      <>
                        <td className="p-3 text-center">
                          <input
                            className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                            placeholder="Jane Doe"
                            value={item.patient || ''}
                            onChange={(e) => updateItem(item.id, { patient: e.target.value })}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                            placeholder="C001"
                            value={item.procedure || ''}
                            onChange={(e) => updateItem(item.id, { procedure: e.target.value })}
                          />
                        </td>
                      </>
                    )}
                    {activeDomain === 'hotel' && (
                      <td className="p-3 text-center">
                        <input
                          className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center"
                          placeholder="204"
                          value={item.room || ''}
                          onChange={(e) => updateItem(item.id, { room: e.target.value })}
                        />
                      </td>
                    )}
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        className={`w-full bg-slate-50 p-2 rounded-lg outline-none text-right font-bold text-slate-600 transition-colors ${itemErrors[item.id] && itemErrors[item.id].unitPrice ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border border-transparent hover:border-slate-200'}`}
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) =>
                          updateItem(item.id, {
                            unitPrice: Number(e.target.value),
                            totalAmount: item.quantity * Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="p-3 text-right">
                      <select
                        className="w-full bg-slate-50 p-2 rounded-lg outline-none appearance-none text-center font-bold"
                        value={item.taxRate}
                        onChange={(e) => updateItem(item.id, { taxRate: Number(e.target.value) })}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-black text-slate-800">
                      ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all text-xs font-bold tracking-wide"
          >
            <Plus size={16} /> ADD ITEM
          </button>
        </div>

        {/* 3 & 4. Notes and Totals Summary (Side by side) */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mt-4">
          {/* Notes and Terms (Left Side) */}
          <div className="flex-1 w-full space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Invoice Notes
              </label>
              <textarea
                className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]/20 outline-none transition-all text-slate-600 min-h-[100px] text-sm"
                placeholder="Message for your customer..."
                value={invoice.notes || ''}
                onChange={(e) => updateInvoice({ notes: e.target.value })}
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Terms & Conditions
              </label>
              <textarea
                className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 focus:border-[var(--brand-color)] focus:ring-1 focus:ring-[var(--brand-color)]/20 outline-none transition-all text-slate-600 min-h-[120px] text-sm"
                placeholder="Standard business terms..."
                value={invoice.termsAndConditions || globalBranding.termsAndConditions || ''}
                onChange={(e) => updateInvoice({ termsAndConditions: e.target.value })}
              />
              {lastSaved && (
                <p className="absolute -bottom-6 left-0 text-[10px] text-slate-400 font-medium italic">
                  Draft saved at {lastSaved}
                </p>
              )}
            </div>
          </div>

          {/* Totals Summary (Right Side) */}
          <div className="w-full md:w-[400px] shrink-0 bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-slate-600 text-sm pb-3 border-b border-slate-200/60">
              <span className="font-bold">Subtotal:</span>
              <span className="font-bold">
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600 text-sm pb-3 border-b border-slate-200/60">
              <span className="font-bold">Total Tax (GST):</span>
              <span className="font-bold">
                ₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200/60">
              <label className="font-bold text-slate-600">Discount (-):</label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 w-32">
                <span className="text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 outline-none text-right font-bold text-slate-800"
                  value={invoice.discountTotal === 0 ? '' : invoice.discountTotal}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateInvoice({ discountTotal: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200/60">
              <label className="font-bold text-slate-600">Transport (+):</label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 w-32">
                <span className="text-slate-400">₹</span>
                <input
                  type="number"
                  min="0"
                  className="w-full p-2 outline-none text-right font-bold text-slate-800"
                  value={invoice.transportCharges === 0 ? '' : invoice.transportCharges}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateInvoice({ transportCharges: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-slate-900 text-xl pt-2">
              <span className="font-black">Total Amount:</span>
              <span className="font-black tracking-tight" style={{ color: 'var(--brand-color)' }}>
                ₹{Math.round(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION FOOTER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-6 z-40">
        <div className="text-sm font-medium text-slate-500">
          {/* Status hint removed for cleaner UI */}
        </div>
        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={handleReset}
            className="w-full sm:w-auto font-bold h-12 px-8 rounded-xl order-2 sm:order-1 flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </Button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              className="font-bold border-2 border-[var(--brand-color)] text-[var(--brand-color)] hover:bg-[var(--brand-color)]/5 h-12 px-8 rounded-xl"
            >
              <Eye className="h-5 w-5 mr-2" />
              Preview
            </Button>
            <Button
              type="button"
              onClick={() => handleDownloadPDF('standard')}
              className="font-black bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white shadow-lg shadow-[var(--brand-color)]/20 h-12 px-10 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              <span>Download Invoice</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
