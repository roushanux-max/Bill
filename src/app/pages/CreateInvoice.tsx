import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Eye, Download, Printer, Share2, Trash2, Save, Pencil, Filter, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { Invoice, InvoiceItem, Customer, Product, StoreInfo } from '../types/invoice';
import { getCustomers, saveCustomer, getProducts, saveProduct, saveInvoice, getInvoices, getStoreInfo, getBrandingSettings, getNextInvoiceNumber, searchCustomers, searchProducts } from '../utils/storage';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { formatDateForDisplay, parseDateFromDisplay } from '../utils/dateUtils';
import { useBranding } from '../contexts/BrandingContext';
import InvoiceTemplate from '../components/InvoiceTemplate';
import { generateInvoicePDF, getInvoiceFilename } from '../utils/generateInvoicePDF';
import { SearchableSelect } from '../components/SearchableSelect';
import { SuggestionInput } from '../components/SuggestionInput';
import { cn } from '../components/ui/utils';


export default function CreateInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const invoiceRef = useRef<HTMLDivElement>(null);
  const customerCardRef = useRef<HTMLDivElement>(null);
  const itemsCardRef = useRef<HTMLDivElement>(null);
  const detailsCardRef = useRef<HTMLDivElement>(null);

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerFilterState, setCustomerFilterState] = useState<string>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [transportCharges, setTransportCharges] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { settings, storeInfo } = useBranding();

  // New customer form state
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', gstin: '', address: '', state: '' });
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  // New item form state
  const [newItemData, setNewItemData] = useState({ name: '', hsn: '', quantity: 1, rate: 0, taxRate: 0, amount: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [saveToProductList, setSaveToProductList] = useState(true);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Search states
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const customerSearchTimeout = useRef<any>(null);
  const productSearchTimeout = useRef<any>(null);

  // Restore form progress
  useEffect(() => {
    const savedItem = localStorage.getItem('itemFormDraft');
    const savedCustomer = localStorage.getItem('customerFormDraft');
    
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer);
        setNewCustomerData(parsed);
        setIsNewCustomer(true);
      } catch (e) { }
    }

    if (savedItem && newItemData.name === '') {
      try { setNewItemData(JSON.parse(savedItem)); } catch (e) { }
    }
  }, []);


  useEffect(() => {
    if (newItemData.name || newItemData.rate) {
      localStorage.setItem('itemFormDraft', JSON.stringify(newItemData));
    }
  }, [newItemData]);

  useEffect(() => {
    if (newCustomerData.name || newCustomerData.phone || newCustomerData.address) {
      localStorage.setItem('customerFormDraft', JSON.stringify(newCustomerData));
    }
  }, [newCustomerData]);

  // Load existing data
  useEffect(() => {
    const init = async () => {
      await loadData();

      // Check for editing or draft
      if (editId) {
        const invoices = await getInvoices();
        let existing = invoices.find(i => i.id === editId);

        // FALLBACK: If not found in main list, check the local draft or preview cache
        // This is crucial for returning from preview without a full backend round-trip
        if (!existing) {
          try {
            const draftRaw = localStorage.getItem('invoiceDraft');
            if (draftRaw) {
              const draft = JSON.parse(draftRaw);
              if (draft && (draft.id === editId || draft.id === 'sample')) existing = draft;
            }
          } catch (e) { }
        }
        if (!existing) {
          try {
            const previewRaw = localStorage.getItem('previewInvoice');
            if (previewRaw) {
              const preview = JSON.parse(previewRaw);
              if (preview && (preview.id === editId || preview.invoiceNumber === editId)) existing = preview;
            }
          } catch (e) { }
        }

        if (existing) {
          setInvoiceNumber(existing.invoiceNumber);
          setDate(parseDateFromDisplay(existing.date));
          setSelectedCustomerId(existing.customerId);
          setItems(existing.items);
          setTransportCharges(existing.transportCharges);
          setDiscount(existing.discount);
          setNotes(existing.notes || '');

          // Always restore customer form data from the invoice snapshot in edit mode.
          // The old guard (!selectedCustomerId) was preventing re-population on re-renders.
          if (existing.customer) {
            setNewCustomerData({
              name: existing.customer.name || '',
              phone: existing.customer.phone || '',
              gstin: existing.customer.gstin || '',
              address: existing.customer.address || '',
              state: existing.customer.state || '',
              email: (existing.customer as any).email || '',
            });
            setSelectedCustomerId(existing.customerId);
            setIsNewCustomer(false);

            // Also set the activeCustomer reference so Smart Save comparisons work correctly
            const matchedCustomer = customers.find(c => c.id === existing.customerId);
            if (matchedCustomer) setActiveCustomer(matchedCustomer);
          }
        }
      } else {
        // Not editing, check for draft
        const draft = localStorage.getItem('invoiceDraft');
        if (draft) {
          try {
            const parsedDraft = JSON.parse(draft);
            if (parsedDraft.items?.length > 0 || parsedDraft.customerId) {
              if (confirm('You have an unsaved draft. Would you like to restore it?')) {
                const nextNum = await getNextInvoiceNumber();
                setInvoiceNumber(parsedDraft.invoiceNumber || nextNum);
                setDate(parseDateFromDisplay(parsedDraft.date) || new Date().toISOString().split('T')[0]);
                setSelectedCustomerId(parsedDraft.customerId || '');
                setItems(parsedDraft.items || []);
                setTransportCharges(parsedDraft.transportCharges || 0);
                setDiscount(parsedDraft.discount || 0);
                setNotes(parsedDraft.notes || '');
                if (parsedDraft.newCustomerData) {
                  setNewCustomerData(parsedDraft.newCustomerData);
                  setIsNewCustomer(parsedDraft.isNewCustomer ?? true);
                }
                toast.success('Draft restored!');
              } else {
                localStorage.removeItem('invoiceDraft');
                setInvoiceNumber(await getNextInvoiceNumber());
              }
            } else {
              setInvoiceNumber(await getNextInvoiceNumber());
            }
          } catch (e) {
            console.error('Error parsing draft:', e);
            setInvoiceNumber(await getNextInvoiceNumber());
          }
        } else if (!invoiceNumber) {
          setInvoiceNumber(await getNextInvoiceNumber());
        }
      }
    };
    init();
  }, [editId]);

  // Sync default notes from settings when starting a new invoice
  useEffect(() => {
    if (!editId && !notes && settings.invoiceNotes) {
      setNotes(settings.invoiceNotes);
    }
  }, [settings.invoiceNotes, editId]);

  // Robust Auto-save logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      // 1. Always save a local draft regardless of completeness
      const currentDraft = {
        invoiceNumber,
        date,
        selectedCustomerId,
        items,
        transportCharges,
        discount,
        notes,
        newCustomerData,
        isNewCustomer,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('invoiceDraft', JSON.stringify(currentDraft));

      // 2. Try to auto-save to Supabase if mandatory fields are present
      if (!selectedCustomerId || items.length === 0) return;

      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;

      const { subtotal, totalTax, total } = calculateTotals();

      const invoices = await getInvoices();
      const existingInvoice = editId ? invoices.find(inv => inv.id === editId) : null;

      const invoice: Invoice = {
        id: editId || invoiceNumber, 
        invoiceNumber,
        date: formatDateForDisplay(date), 
        customerId: selectedCustomerId,
        customer: {
          name: customer.name,
          gstin: customer.gstin,
          address: customer.address,
          state: customer.state,
          phone: customer.phone,
          email: customer.email || '',
        },
        items,
        transportCharges,
        discount,
        notes,
        subtotal,
        totalTax,
        total,
        createdAt: existingInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const savedId = await saveInvoice(invoice);
        if (savedId && !editId) {
          navigate(`/create-invoice?edit=${savedId}`, { replace: true });
        }
      } catch (e) {
        console.error('Supabase auto-save failed:', e);
      }
    }, 1500); // 1.5s debounce for local + remote auto-save

    return () => clearTimeout(timer);
  }, [invoiceNumber, date, selectedCustomerId, items, transportCharges, discount, notes, editId, customers, newCustomerData, isNewCustomer]);

  const loadData = async () => {
    const [customerData, productData] = await Promise.all([
      getCustomers(false, 50),
      getProducts(false, 50)
    ]);
    setCustomers(customerData);
    setProducts(productData);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      subtotal += item.rate * item.quantity;
      totalTax += (item.rate * item.quantity * item.taxRate) / 100;
    });

    subtotal += transportCharges;
    const finalSubtotal = subtotal - discount;
    const total = finalSubtotal + totalTax;

    return { subtotal: finalSubtotal, totalTax, total };
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ref.current.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      const el = ref.current;
      setTimeout(() => {
        el?.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      }, 3000);
    }
  };

  const handleAddCustomer = async () => {
    // If a customer is already selected and no new name is entered, we can just proceed
    if (selectedCustomerId && !newCustomerData.name) {
      toast.success('Using selected customer');
      scrollToSection(itemsCardRef);
      return;
    }

    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error('Please fill in customer name and phone');
      return;
    }

    // If we're updating an existing customer
    if (!isNewCustomer && selectedCustomerId) {
      const existingCustomer = customers.find(c => c.id === selectedCustomerId);
      if (existingCustomer) {
        // Detect if any field has been modified
        const isModified = 
          newCustomerData.name !== existingCustomer.name ||
          newCustomerData.phone !== existingCustomer.phone ||
          (newCustomerData.gstin || '') !== (existingCustomer.gstin || '') ||
          (newCustomerData.address || '') !== (existingCustomer.address || '') ||
          (newCustomerData.state || '') !== (existingCustomer.state || '');

        if (isModified) {
          // Save as a NEW customer if data changed
          const newId = crypto.randomUUID();
          const newCustomer: Customer = {
            id: newId,
            name: newCustomerData.name,
            phone: newCustomerData.phone,
            gstin: newCustomerData.gstin || '',
            address: newCustomerData.address || '',
            state: newCustomerData.state || '',
            email: newCustomerData.email || '',
            createdAt: new Date().toISOString()
          };
          await saveCustomer(newCustomer);
          setCustomers([...customers, newCustomer]);
          setSelectedCustomerId(newId);
          setActiveCustomer(newCustomer);
          toast.success('Modified details saved as a new customer!');
          return;
        }

        const updatedCustomer = {
          ...existingCustomer,
          ...newCustomerData,
        };
        await saveCustomer(updatedCustomer);
        setCustomers(customers.map(c => c.id === selectedCustomerId ? updatedCustomer : c));
        setActiveCustomer(updatedCustomer);
        toast.success('Customer details updated successfully!');
        return;
      }
    }

    // Creating a completely new customer
    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      gstin: newCustomerData.gstin || '',
      address: newCustomerData.address || '',
      state: newCustomerData.state,
      email: newCustomerData.email || '',
      createdAt: new Date().toISOString(),
    };
    await saveCustomer(customer);
    setCustomers([...customers, customer]);
    setSelectedCustomerId(customer.id);
    setActiveCustomer(customer);
    setIsNewCustomer(false);
    setNewCustomerData({ name: '', phone: '', email: '', gstin: '', address: '', state: '' });
    toast.success('Customer added successfully!');
  };

  const handleSuggestionSelect = (suggestion: Customer) => {
    setSelectedCustomerId(suggestion.id);
    setActiveCustomer(suggestion);
    setIsNewCustomer(false);
    toast.success(`Selected customer: ${suggestion.name}`);
  };

  const handleSelectExistingCustomer = (value: string) => {
    console.log("CreateInvoice: Selecting customer", value);
    setSelectedCustomerId(value);

    // Set as active but don't auto-fill input fields (user wants supportive text instead)
    const customer = customers.find(c => c.id === value);
    if (customer) {
      setActiveCustomer(customer);
      setIsNewCustomer(false);
      toast.success(`Selected customer: ${customer.name}`);
    }
  };

  const handleCustomerSearch = async (query: string) => {
    if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);

    if (!query.trim()) {
      setIsCustomerLoading(false);
      // Restore initial subset
      const results = await getCustomers(false, 50);
      setCustomers(results);
      return;
    }

    setIsCustomerLoading(true);
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchCustomers(query);
        setCustomers(results);
      } catch (e) {
        console.error('Customer search failed:', e);
      } finally {
        setIsCustomerLoading(false);
      }
    }, 300);
  };

  const clearCustomerForm = () => {
    setSelectedCustomerId('');
    setActiveCustomer(null);
    setNewCustomerData({ name: '', phone: '', email: '', gstin: '', address: '', state: '' });
    localStorage.removeItem('customerFormDraft');
    setIsNewCustomer(true);
  };

  const handleAddItem = async () => {
    if (!newItemData.name || newItemData.quantity <= 0 || newItemData.rate <= 0) {
      toast.error('Please fill in all required item fields');
      return;
    }

    // Save product to database if selected and it's a new product
    let finalProductId = selectedProductId;

    if (saveToProductList && !selectedProductId) {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: newItemData.name,
        category: 'Other', // Set default category
        hsnCode: newItemData.hsn || '',
        sellingPrice: newItemData.rate,
        gstRate: newItemData.taxRate,
        unit: 'pcs',
        createdAt: new Date().toISOString(),
      };
      await saveProduct(newProduct);
      setProducts([...products, newProduct]);
      finalProductId = newProduct.id;
      toast.success('Product saved to catalog!');
    }

    const amount = newItemData.rate * newItemData.quantity;
    const item: InvoiceItem = {
      id: Date.now().toString(),
      productId: finalProductId,
      name: newItemData.name,
      hsn: newItemData.hsn,
      quantity: newItemData.quantity,
      unit: 'pcs',
      rate: newItemData.rate,
      taxRate: newItemData.taxRate,
      amount,
    };
    if (editingItemIndex !== null) {
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = item;
      setItems(updatedItems);
      setEditingItemIndex(null);
      toast.success('Item updated!');
    } else {
      setItems([...items, item]);
      toast.success('Item added successfully!');
    }

    setNewItemData({ name: '', hsn: '', quantity: 1, rate: 0, taxRate: 0, amount: 0 });
    setSelectedProductId('');
    localStorage.removeItem('itemFormDraft');
    
    // Scroll to items list on mobile to show it was added
    if (window.innerWidth < 768) {
      itemsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    setNewItemData({
      name: item.name,
      hsn: item.hsn || '',
      quantity: item.quantity,
      rate: item.rate,
      taxRate: item.taxRate,
      amount: item.amount,
    });
    setEditingItemIndex(index);
    scrollToSection(itemsCardRef);
  };

  const handleSelectExistingProduct = (value: string) => {
    setSelectedProductId(value);
    const product = products.find(p => p.id === value);
    if (product) {
      setNewItemData({
        name: product.name,
        hsn: product.hsnCode || '',
        quantity: 1,
        rate: product.sellingPrice,
        taxRate: product.gstRate,
        amount: product.sellingPrice,
      });
    }
  };

  const handleSuggestionSelectProduct = (suggestion: Product) => {
    setNewItemData({
      name: suggestion.name,
      hsn: suggestion.hsnCode || '',
      quantity: 1,
      rate: suggestion.sellingPrice,
      taxRate: suggestion.gstRate,
      amount: suggestion.sellingPrice,
    });
    setSelectedProductId(suggestion.id);
    toast.success(`Selected product: ${suggestion.name}`);
  };

  const handleProductSearch = async (query: string) => {
    if (productSearchTimeout.current) clearTimeout(productSearchTimeout.current);

    if (!query.trim()) {
      setIsProductLoading(false);
      // Restore initial subset
      const results = await getProducts(false, 50);
      setProducts(results);
      return;
    }

    setIsProductLoading(true);
    productSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchProducts(query);
        setProducts(results);
      } catch (e) {
        console.error('Product search failed:', e);
      } finally {
        setIsProductLoading(false);
      }
    }, 300);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleNavigateAway = (callback: () => void) => {
    const hasData = items.length > 0 || (selectedCustomerId && selectedCustomerId !== '');
    const isComplete = items.length > 0 && selectedCustomerId && selectedCustomerId !== '';

    if (hasData && !isComplete) {
      setPendingAction(() => callback);
      setShowConfirm(true);
    } else {
      callback();
    }
  };

  const handlePreview = async () => {
    const invoice = await buildInvoiceObject();
    if (!invoice) return;

    try {
      // Auto-save the invoice before previewing
      const savedId = await saveInvoice(invoice);

      // Also save to draft for persistence if they edit and come back
      localStorage.setItem('invoiceDraft', JSON.stringify({
        ...invoice,
        // Store raw items/customer for form restoration
        items: items,
        customerId: selectedCustomerId,
        date: date,
      }));

      localStorage.setItem('previewInvoice', JSON.stringify(invoice));

      // Navigate to preview with a return path that includes the ID
      const finalId = savedId || editId || invoice.id;
      const returnPath = `/create-invoice?edit=${finalId}`;
      navigate(`/invoice-preview?return=${encodeURIComponent(returnPath)}`);
    } catch (error) {
      console.error('Error saving preview:', error);
      toast.error('Failed to save and preview');
    }
  };

  const buildInvoiceObject = async (): Promise<Invoice | null> => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      scrollToSection(customerCardRef);
      return null;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      scrollToSection(itemsCardRef);
      return null;
    }

    const customer = activeCustomer || customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      toast.error('Customer not found');
      return null;
    }

    const { subtotal, totalTax, total } = calculateTotals();

    const invoices = await getInvoices();
    const existingInvoice = editId ? invoices.find(inv => inv.id === editId) : null;

    return {
      id: editId || Date.now().toString(),
      invoiceNumber,
      date: formatDateForDisplay(date), // Always save as DD.MM.YY for consistency
      customerId: selectedCustomerId,
      customer: {
        name: customer.name,
        gstin: customer.gstin,
        address: customer.address,
        state: customer.state,
        phone: customer.phone,
        email: (customer as any).email || '',
      },
      items,
      transportCharges,
      discount,
      notes: notes || settings.invoiceNotes || (settings as any).termsAndConditions || '',
      subtotal,
      totalTax,
      total,
      createdAt: existingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleDownload = async () => {
    const invoice = await buildInvoiceObject();
    if (!invoice) return;

    setIsGenerating(true);
    const toastId = toast.loading('Preparing invoice...');

    try {
      const currentStoreInfo = storeInfo || await getStoreInfo();
      if (!currentStoreInfo) throw new Error('Store information not found');
      
      const pdf = generateInvoicePDF(invoice, currentStoreInfo, settings);
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

  const handleSaveInvoice = async () => {
    const invoiceObj = await buildInvoiceObject();
    if (!invoiceObj) return;

    setIsGenerating(true);
    const toastId = toast.loading('Saving invoice...');
    try {
      const savedId = await saveInvoice(invoiceObj);
      toast.success('Invoice saved successfully!', { id: toastId });

      if (savedId && !editId) {
        navigate(`/create-invoice?edit=${savedId}`, { replace: true });
      }

      // Clean up draft
      localStorage.removeItem('invoiceDraft');
      navigate('/invoices');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save invoice', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    const invoice = await buildInvoiceObject();
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

      const pdf = generateInvoicePDF(invoice, currentStoreInfo, settings);

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
    const invoice = await buildInvoiceObject();
    if (!invoice) return;

    setIsGenerating(true);
    const toastId = toast.loading('Preparing to share...');

    try {
      const currentStoreInfo = storeInfo || await getStoreInfo();
      if (!currentStoreInfo) throw new Error('Store information not found');

      const pdf = generateInvoicePDF(invoice, currentStoreInfo, settings);
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

  const { total } = calculateTotals();

  return (
    <div className="min-h-screen bg-slate-50 pb-24 sm:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => handleNavigateAway(() => navigate('/invoices'))}
              className="inline-flex items-center gap-2 sm:gap-3"
            >
              <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </button>
            <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 truncate">
              {editId ? 'Edit Invoice' : 'Create Invoice'}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 sm:py-8 max-w-6xl mx-auto print:hidden">
        <div className="space-y-4 sm:space-y-6">
          {/* Invoice Metadata */}
          <div ref={detailsCardRef} className="transition-all duration-300 rounded-lg">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber" className="text-sm">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="1001"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm">Invoice Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="text-sm w-full relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:cursor-pointer flex justify-between items-center"
                      style={{ borderColor: settings.primaryColor + '40' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Selection */}
          <div ref={customerCardRef} className="transition-all duration-300 rounded-lg animate-fade-in-up">
            <Card className="border-slate-200/60 shadow-sm overflow-hidden hover-lift glass-card">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between py-4 px-6 gap-4">
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold text-slate-800">Customer Details</CardTitle>
                  <p className="text-[11px] text-slate-500 font-normal mt-1">Select an existing customer or enter details manually below.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full sm:w-64">
                    <SearchableSelect
                      options={customers.map(c => ({ value: c.id, label: c.name, subLabel: c.phone }))}
                      onValueChange={handleSelectExistingCustomer}
                      placeholder="Select Customer"
                      onSearchChange={handleCustomerSearch}
                      isLoading={isCustomerLoading}
                      value={selectedCustomerId}
                    />
                  </div>
                  {!isNewCustomer && selectedCustomerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCustomerForm}
                      className="h-8 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Unified Select */}
                  {/* Customer Info Form (Unified Search & Input) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity duration-300">
                    <div className="space-y-1.5">
                      <Label htmlFor="customerName" className="text-sm flex items-center gap-1">
                        Customer Name <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Legal name for billing</p>
                      <SuggestionInput
                        id="customerName"
                        value={newCustomerData.name}
                        onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        suggestions={customers}
                        onSuggestionSelect={handleSuggestionSelect}
                        placeholder="John Doe"
                        className="text-sm bg-white/50"
                      />
                      {!newCustomerData.name && activeCustomer?.name && (
                        <p className="text-[10px] text-indigo-500 font-medium">Existing: {activeCustomer.name}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customerPhone" className="text-sm flex items-center gap-1">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Mobile number for contact</p>
                      <SuggestionInput
                        id="customerPhone"
                        value={newCustomerData.phone}
                        onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        suggestions={customers}
                        onSuggestionSelect={handleSuggestionSelect}
                        labelKey="phone"
                        subLabelKey="name"
                        placeholder="9876543210"
                        className="text-sm bg-white/50"
                      />
                      {!newCustomerData.phone && activeCustomer?.phone && (
                        <p className="text-[10px] text-indigo-500 font-medium">Existing: {activeCustomer.phone}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerGSTIN" className="text-sm">GSTIN (Optional)</Label>
                      <SuggestionInput
                        id="customerGSTIN"
                        value={newCustomerData.gstin}
                        onChange={e => setNewCustomerData({ ...newCustomerData, gstin: e.target.value })}
                        suggestions={customers}
                        onSuggestionSelect={handleSuggestionSelect}
                        labelKey="gstin"
                        subLabelKey="name"
                        placeholder="e.g. 09AAAAA0000A1Z5"
                        className="text-sm bg-white/50"
                      />
                      {!newCustomerData.gstin && activeCustomer?.gstin && (
                        <p className="text-[10px] text-indigo-500 font-medium">Existing: {activeCustomer.gstin}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail" className="text-sm">Email (Optional)</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newCustomerData.email}
                        onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        placeholder="customer@example.com"
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="customerAddress" className="text-sm">Billing Address</Label>
                      <Input
                        id="customerAddress"
                        value={newCustomerData.address}
                        onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                        placeholder="Street, City, Area"
                        className="text-sm bg-white/50"
                      />
                      {!newCustomerData.address && activeCustomer?.address && (
                        <p className="text-[10px] text-indigo-500 font-medium">Existing: {activeCustomer.address}</p>
                      )}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="customerState" className="text-sm flex items-center gap-1">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Determines tax type (IGST vs CGST/SGST)</p>
                      <Select value={newCustomerData.state} onValueChange={value => setNewCustomerData({ ...newCustomerData, state: value })}>
                        <SelectTrigger className="bg-white/50">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 overflow-y-auto">
                          {[
                            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
                            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
                            'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
                            'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
                          ].map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all font-semibold rounded-xl h-11"
                      onClick={handleAddCustomer}
                    >
                      {selectedCustomerId ? 'Update Customer Record' : 'Save & Set Customer'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items Section */}
          <div ref={itemsCardRef} className="transition-all duration-300 rounded-lg animate-fade-in-up [animation-delay:100ms]">
            <Card className="border-slate-200/60 shadow-sm overflow-hidden hover-lift glass-card">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between py-4 px-6 gap-4">
                <div className="flex flex-col">
                  <CardTitle className="text-base font-semibold text-slate-800">
                    {editingItemIndex !== null ? 'Edit Item' : 'Add Items'}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full sm:w-64">
                    <SearchableSelect
                      options={products.map(p => ({ value: p.id, label: p.name, subLabel: p.hsnCode }))}
                      onValueChange={handleSelectExistingProduct}
                      placeholder="Select Product"
                      onSearchChange={handleProductSearch}
                      isLoading={isProductLoading}
                      value={selectedProductId}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label htmlFor="itemName" className="text-sm flex items-center gap-1">
                        Product Name <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Description of goods or services</p>
                      <SuggestionInput
                        id="itemName"
                        value={newItemData.name}
                        onChange={e => setNewItemData({ ...newItemData, name: e.target.value })}
                        suggestions={products.map(p => ({ ...p, phone: p.hsnCode }))}
                        onSuggestionSelect={handleSuggestionSelectProduct}
                        labelKey="name"
                        subLabelKey="phone"
                        placeholder='e.g. Samsung 24" Monitor'
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemHSN" className="text-sm">HSN Code</Label>
                      <Input
                        id="itemHSN"
                        value={newItemData.hsn}
                        onChange={e => setNewItemData({ ...newItemData, hsn: e.target.value })}
                        placeholder="8471"
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemQuantity" className="text-sm">Quantity</Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Number of units (Min 1)</p>
                      <Input
                        id="itemQuantity"
                        type="number"
                        value={newItemData.quantity}
                        onChange={e => setNewItemData({ ...newItemData, quantity: parseFloat(e.target.value) || 1 })}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemRate" className="text-sm flex items-center gap-1">
                        Rate (₹) <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Unit price excluding GST</p>
                      <Input
                        id="itemRate"
                        type="number"
                        value={newItemData.rate}
                        onChange={e => setNewItemData({ ...newItemData, rate: parseFloat(e.target.value) || 0 })}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemTaxRate" className="text-sm">GST (%)</Label>
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">Applicable tax rate</p>
                      <Input
                        id="itemTaxRate"
                        type="number"
                        value={newItemData.taxRate}
                        onChange={e => setNewItemData({ ...newItemData, taxRate: parseFloat(e.target.value) || 0 })}
                        className="text-sm bg-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="saveProduct"
                        checked={saveToProductList}
                        onChange={(e) => setSaveToProductList(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        disabled={!!selectedProductId}
                      />
                      <Label htmlFor="saveProduct" className={cn("text-xs font-medium", selectedProductId ? 'text-slate-400' : 'text-slate-600')}>
                        Add to permanent catalog
                      </Label>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 mr-2">Line Total:</span>
                      <span className="text-lg font-bold text-slate-900">₹{(newItemData.rate * newItemData.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNewItemData({ name: '', hsn: '', quantity: 1, rate: 0, taxRate: 0, amount: 0 });
                        setSelectedProductId('');
                        setEditingItemIndex(null);
                      }}
                      className="flex-1 rounded-xl h-11 border-slate-200"
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="flex-[2] bg-[var(--color-primary)] hover:opacity-90 text-white shadow-lg shadow-primary/20 transition-all font-semibold rounded-xl h-11"
                      onClick={handleAddItem}
                    >
                      {editingItemIndex !== null ? 'Update Item' : 'Add to Invoice'}
                    </Button>
                  </div>

                  {/* Added Items List */}
                  {items.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm font-semibold text-slate-800">Bill Items ({items.length})</Label>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-wider">Scroll to view all</span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {items.map((item, index) => (
                          <div
                            key={item.id}
                            className={cn(
                              "p-4 border rounded-xl flex items-center justify-between transition-all group",
                              editingItemIndex === index ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md"
                            )}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="font-semibold text-sm text-slate-900 truncate">{item.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                                  Qty: {item.quantity}
                                </span>
                                <span className="text-xs text-slate-500">
                                  × ₹{item.rate.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">|</span>
                                <span className="text-xs font-medium text-[var(--color-primary)]">
                                  {item.taxRate}% GST
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(index)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Charges */}
          <Card className="border-slate-200/60 shadow-sm glass-card overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6">
              <CardTitle className="text-base font-semibold text-slate-800">Additional Charges</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="transport" className="text-sm font-medium text-slate-700">Transport Charges (₹)</Label>
                  <Input
                    id="transport"
                    type="number"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm bg-white/50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-sm font-medium text-slate-700">Overall Discount (₹)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm bg-white/50 border-slate-200"
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">
                  Notes and Terms are now managed globally in <Link to="/branding" className="text-indigo-600 hover:underline font-medium">Branding Settings</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Sticky Footer - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 sm:hidden shadow-lg z-50 print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={isGenerating} className="flex-1 min-w-[30%]">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={isGenerating} className="flex-1 min-w-[30%]">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="default" size="sm" onClick={handleSaveInvoice} disabled={isGenerating} className="flex-1 min-w-[30%]">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={isGenerating} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} disabled={isGenerating} className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Sticky Footer - Desktop */}
      <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-50 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600">Total Amount</div>
            <div className="text-2xl font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handlePreview} disabled={isGenerating}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={isGenerating}>
              <Printer className="h-4 w-4 mr-2" />
              Print Preview
            </Button>
            <Button variant="default" onClick={handleSaveInvoice} disabled={isGenerating}>
              <Save className="h-4 w-4 mr-2" />
              Save Invoice
            </Button>
            <Button variant="outline" onClick={handleDownload} disabled={isGenerating}>
              <Download className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={isGenerating}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>



      {/* Unsaved/Incomplete Changes Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This invoice is missing mandatory fields (customer and at least one item) and will not be saved if you leave now. Are you sure you want to discard it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false);
                pendingAction?.();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Invoice
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
