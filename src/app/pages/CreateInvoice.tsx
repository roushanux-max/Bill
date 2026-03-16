import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Eye, Download, Printer, Share2, Trash2, Save, Pencil, Filter, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { Invoice, InvoiceItem, Customer, Product, StoreInfo } from '../types/invoice';
import { getCustomers, saveCustomer, getProducts, saveProduct, saveInvoice, getInvoices, getInvoice, getStoreInfo, getBrandingSettings, getNextInvoiceNumber, searchCustomers, searchProducts, getUserKey } from '../utils/storage';
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
  const [transportCharges, setTransportCharges] = useState<string | number>(0);
  const [discount, setDiscount] = useState<string | number>(0);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Stable local ID to prevent creating duplicates before URL updates
  const [localInvoiceId] = useState<string>(() => crypto.randomUUID());
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { settings, storeInfo } = useBranding();
  const { user } = useAuth();

  // New customer form state
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', email: '', gstin: '', address: '', state: '' });
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  // New item form state
  const [newItemData, setNewItemData] = useState<{
    name: string;
    hsn: string;
    quantity: string | number;
    rate: string | number;
    taxRate: string | number;
    amount: number;
  }>({ name: '', hsn: '', quantity: 1, rate: 0, taxRate: 0, amount: 0 });
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  // Search states
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const customerSearchTimeout = useRef<any>(null);
  const productSearchTimeout = useRef<any>(null);

  // Restore form progress - Reduced auto-restoration to ensure clean start
  useEffect(() => {
    // Only restore if user hasn't started typing and there's a draft
    // But per user request "No customer should be selected on default", 
    // we should let the user start fresh or restore via the main "Draft Restored" dialog.
    
    // We'll keep the itemFormDraft restoration if it's not confusing, 
    // but customer draft should definitely be clean.
    const savedItem = localStorage.getItem(getUserKey('itemFormDraft'));
    if (savedItem && newItemData.name === '') {
      try { setNewItemData(JSON.parse(savedItem)); } catch (e) { }
    }
  }, []);


  useEffect(() => {
    if (newItemData.name || newItemData.rate) {
      localStorage.setItem(getUserKey('itemFormDraft'), JSON.stringify(newItemData));
    }
  }, [newItemData]);

  useEffect(() => {
    if (newCustomerData.name || newCustomerData.phone || newCustomerData.address) {
      localStorage.setItem(getUserKey('customerFormDraft'), JSON.stringify(newCustomerData));
      
      // Debounced auto-save to database
      if (customerSearchTimeout.current) clearTimeout(customerSearchTimeout.current);
      customerSearchTimeout.current = setTimeout(async () => {
        if (!newCustomerData.name || !newCustomerData.phone) return;

        try {
          if (selectedCustomerId) {
            const existing = customers.find(c => c.id === selectedCustomerId);
            if (existing) {
              const isModified = 
                newCustomerData.name !== existing.name ||
                newCustomerData.phone !== existing.phone ||
                newCustomerData.gstin !== existing.gstin ||
                newCustomerData.address !== existing.address ||
                newCustomerData.state !== existing.state ||
                newCustomerData.email !== existing.email;

              if (isModified) {
                const updated = { ...existing, ...newCustomerData };
                await saveCustomer(updated);
                setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? updated : c));
                setActiveCustomer(updated);
              }
            }
          } else {
            // New customer
            const newId = crypto.randomUUID();
            const customer: Customer = {
              id: newId,
              ...newCustomerData,
              createdAt: new Date().toISOString(),
            };
            await saveCustomer(customer);
            setCustomers(prev => [...prev, customer]);
            setSelectedCustomerId(newId);
            setActiveCustomer(customer);
            setIsNewCustomer(false);
          }
        } catch (e) {
          console.error('Auto-save customer failed:', e);
        }
      }, 1000);
    }
  }, [newCustomerData]);

  // Load existing data
  useEffect(() => {
    const init = async () => {
      await loadData();

      // Check for editing or draft
      if (editId) {
        // Use getInvoice to get full details including items
        let existing = await getInvoice(editId);

        // FALLBACK: If not found in main database, check the local draft or preview cache
        if (!existing) {
          try {
            const draftRaw = localStorage.getItem(getUserKey('invoiceDraft'));
            if (draftRaw) {
              const draft = JSON.parse(draftRaw);
              if (draft && (draft.id === editId || draft.id === 'sample')) existing = draft;
            }
          } catch (e) { }
        }
        if (!existing) {
          try {
            const previewRaw = localStorage.getItem(getUserKey('previewInvoice'));
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
          setItems(existing.items || []);
          setTransportCharges(existing.transportCharges);
          setDiscount(existing.discountTotal || 0);
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
        const draft = localStorage.getItem(getUserKey('invoiceDraft'));
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
                setDiscount(parsedDraft.discountTotal || 0);
                setNotes(parsedDraft.notes || '');
                if (parsedDraft.newCustomerData) {
                  setNewCustomerData(parsedDraft.newCustomerData);
                  setIsNewCustomer(parsedDraft.isNewCustomer ?? true);
                }
                toast.success('Draft restored!');
              } else {
                localStorage.removeItem(getUserKey('invoiceDraft'));
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
      localStorage.setItem(getUserKey('invoiceDraft'), JSON.stringify(currentDraft));

      // 2. Try to auto-save to Supabase if mandatory fields are present
      if (!selectedCustomerId || items.length === 0) return;

      const customer = customers.find(c => c.id === selectedCustomerId);
      if (!customer) return;

      const { subtotal, totalTax, total } = calculateTotals();

      const invoices = await getInvoices();
      const existingInvoice = editId ? invoices.find(inv => inv.id === editId) : null;

      const invoice: Invoice = {
        id: editId || localInvoiceId, 
        invoiceNumber,
        date: formatDateForDisplay(date), 
        customerId: selectedCustomerId,
        customer: {
          id: selectedCustomerId,
          name: newCustomerData.name || 'Walk-in Customer',
          gstin: newCustomerData.gstin,
          address: newCustomerData.address,
          state: newCustomerData.state,
          phone: newCustomerData.phone,
          email: newCustomerData.email || '',
          createdAt: activeCustomer?.createdAt || new Date().toISOString(),
        },
        items,
        transportCharges: Number(transportCharges) || 0,
        discountTotal: Number(discount) || 0,
        notes,
        subtotal,
        taxTotal: totalTax,
        grandTotal: total,
        status: 'unpaid',
        createdAt: existingInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        store_id: storeInfo?.id || '',
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
    let itemSubtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const rate = Number(item.unitPrice || (item as any).rate) || 0;
      const qty = Number(item.quantity) || 0;
      const tax = Number(item.taxRate) || 0;
      itemSubtotal += rate * qty;
      totalTax += (rate * qty * tax) / 100;
    });

    const transport = Number(transportCharges) || 0;
    const disc = Number(discount) || 0;

    const grossTotal = itemSubtotal + totalTax + transport;
    const total = Math.round(grossTotal - disc);

    return { subtotal: itemSubtotal, totalTax, total };
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



  const handleSuggestionSelect = (suggestion: Customer) => {
    setSelectedCustomerId(suggestion.id);
    setActiveCustomer(suggestion);
    setIsNewCustomer(false);
    toast.success(`Selected customer: ${suggestion.name}`);
  };

  const handleSelectExistingCustomer = (value: string) => {
    console.log("CreateInvoice: Selecting customer", value);
    setSelectedCustomerId(value);

    // Set as active and populate input fields
    const customer = customers.find(c => c.id === value);
    if (customer) {
      setActiveCustomer(customer);
      setNewCustomerData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        address: customer.address || '',
        state: customer.state || 'Bihar'
      });
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
    localStorage.removeItem(getUserKey('customerFormDraft'));
  };
  
  const handleAddItem = async () => {
    const qty = Number(newItemData.quantity);
    const rate = Number(newItemData.rate);
    const taxRate = Number(newItemData.taxRate);

    if (!newItemData.name || isNaN(qty) || qty <= 0 || isNaN(rate) || rate < 0) {
      if (!newItemData.name) toast.error('Please enter product name');
      else if (isNaN(qty) || qty <= 0) toast.error('Quantity must be greater than 0');
      else toast.error('Please enter a valid rate');
      return;
    }

    // Auto-save product to catalog
    let finalProductId = selectedProductId;

    try {
      if (selectedProductId) {
        // Check if existing product needs update
        const existing = products.find(p => p.id === selectedProductId);
        if (existing) {
          const isModified = 
            newItemData.name !== existing.name ||
            (newItemData.hsn || '') !== (existing.hsnCode || '') ||
            newItemData.rate !== existing.sellingPrice ||
            newItemData.taxRate !== existing.gstRate;

          if (isModified) {
            const updated: Product = { 
              ...existing, 
              name: newItemData.name,
              hsnCode: newItemData.hsn || '',
              sellingPrice: Number(newItemData.rate),
              gstRate: Number(newItemData.taxRate)
            };
            await saveProduct(updated);
            setProducts((prev: Product[]) => prev.map(p => p.id === selectedProductId ? updated : p));
          }
        }
      } else {
        // Create new product
        const newProduct: Product = {
          id: crypto.randomUUID(),
          name: newItemData.name,
          category: 'Other',
          hsnCode: newItemData.hsn || '',
          sellingPrice: Number(newItemData.rate),
          gstRate: Number(newItemData.taxRate),
          unit: 'pcs',
          createdAt: new Date().toISOString(),
        };
        await saveProduct(newProduct);
        setProducts(prev => [...prev, newProduct]);
        finalProductId = newProduct.id;
      }
    } catch (e) {
      console.error('Failed to auto-save product:', e);
    }

    const amount = rate * qty;
    const item: InvoiceItem = {
      id: crypto.randomUUID(),
      invoice_id: editId || localInvoiceId,
      product_id: finalProductId,
      productName: newItemData.name, // Snapshot
      unitPrice: rate,               // Snapshot
      quantity: qty,
      hsn: newItemData.hsn,
      unit: 'pcs',
      taxRate: taxRate,
      taxAmount: (rate * qty * taxRate) / 100,
      discountAmount: 0,
      totalAmount: rate * qty,       // Keeping matches current UI "amount" expectation (pre-tax)
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
    localStorage.removeItem(getUserKey('itemFormDraft'));
    
    // Scroll to items list on mobile to show it was added
    if (window.innerWidth < 768) {
      itemsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  const handleEditItem = (index: number) => {
    const item = items[index];
    setNewItemData({
      name: item.productName || (item as any).name,
      hsn: item.hsn || '',
      quantity: item.quantity,
      rate: item.unitPrice || (item as any).rate,
      taxRate: item.taxRate,
      amount: item.totalAmount || (item as any).amount,
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

  const handleNavigateAway = async (callback: () => void) => {
    const hasData = items.length > 0 || (selectedCustomerId && selectedCustomerId !== '');
    const isComplete = items.length > 0 && selectedCustomerId && selectedCustomerId !== '';

    if (hasData && !isComplete) {
      setPendingAction(() => callback);
      setShowConfirm(true);
    } else if (isComplete) {
      // Auto-save user's valid work when they leave
      await persistAndGetInvoice();
      callback();
    } else {
      callback();
    }
  };

  const handleExplicitSave = async () => {
    const invoice = await persistAndGetInvoice();
    if (invoice) {
        toast.success(`Invoice ${invoice.invoiceNumber} saved!`);
        navigate('/invoices');
    }
  };

  const handlePreview = async () => {
    const invoice = await persistAndGetInvoice();
    if (!invoice) return;

    try {
      // Also save to draft for persistence if they edit and come back
      localStorage.setItem(getUserKey('invoiceDraft'), JSON.stringify({
        ...invoice,
        // Store raw items/customer for form restoration
        items: items,
        customerId: selectedCustomerId,
        date: date,
      }));

      localStorage.setItem(getUserKey('previewInvoice'), JSON.stringify(invoice));

      // Navigate to preview with a return path that includes the ID
      const finalId = editId || invoice.id;
      const returnPath = `/create-invoice?edit=${finalId}`;
      navigate(`/invoice-preview?return=${encodeURIComponent(returnPath)}`);
    } catch (error) {
      console.error('Error saving preview:', error);
      toast.error('Failed to save and preview');
    }
  };

  const ensureCustomerIsSaved = async (): Promise<string | null> => {
    // 1. If we have a selection and NO manual name input, it's an existing customer use as-is.
    if (selectedCustomerId && !newCustomerData.name) {
      const existing = customers.find(c => c.id === selectedCustomerId);
      if (existing) return existing.id;
    }

    // 2. If no name and no selection, we can't proceed.
    if (!newCustomerData.name && !selectedCustomerId) {
      toast.error('Please enter or select a customer');
      scrollToSection(customerCardRef);
      return null;
    }

    // 3. Fallback: if name is entered (new or modification), save/update.
    try {
      const customer: Customer = {
        id: selectedCustomerId && !selectedCustomerId.startsWith('temp-') ? selectedCustomerId : crypto.randomUUID(),
        ...newCustomerData,
        // Ensure name is present, fallback to activeCustomer if user cleared it but we have one
        name: newCustomerData.name || activeCustomer?.name || 'Walk-in Customer',
        createdAt: activeCustomer?.createdAt || new Date().toISOString(),
      };
      
      await saveCustomer(customer);
      setSelectedCustomerId(customer.id);
      setActiveCustomer(customer);
      return customer.id;
    } catch (e) {
      console.error('Failed to ensure customer is saved:', e);
      toast.error('Failed to save customer details');
      return null;
    }
  };

  const buildInvoiceObject = async (resolvedCustomerId: string): Promise<Invoice | null> => {
    if (!newCustomerData.name && !resolvedCustomerId) {
      toast.error('Please enter or select a customer');
      scrollToSection(customerCardRef);
      return null;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      scrollToSection(itemsCardRef);
      return null;
    }

    const { subtotal, totalTax, total } = calculateTotals();
    
    // Ensure we use the actual text from input fields, not stale database names
    const customerDetails = {
      name: newCustomerData.name || activeCustomer?.name || 'Walk-in Customer',
      gstin: newCustomerData.gstin || activeCustomer?.gstin || '',
      address: newCustomerData.address || activeCustomer?.address || '',
      state: newCustomerData.state || activeCustomer?.state || 'Bihar',
      phone: newCustomerData.phone || activeCustomer?.phone || '',
      email: newCustomerData.email || activeCustomer?.email || '',
    };

    const invoices = await getInvoices();
    const existingInvoice = editId ? invoices.find(inv => inv.id === editId) : null;

    return {
      id: editId || localInvoiceId,
      invoiceNumber,
      date: formatDateForDisplay(date),
      customerId: resolvedCustomerId,
      customer: {
        id: resolvedCustomerId,
        name: newCustomerData.name || activeCustomer?.name || 'Walk-in Customer',
        gstin: newCustomerData.gstin || activeCustomer?.gstin || '',
        address: newCustomerData.address || activeCustomer?.address || '',
        state: newCustomerData.state || activeCustomer?.state || 'Bihar',
        phone: newCustomerData.phone || activeCustomer?.phone || '',
        email: newCustomerData.email || activeCustomer?.email || '',
        createdAt: activeCustomer?.createdAt || new Date().toISOString(),
      },
      items,
      transportCharges: Number(transportCharges) || 0,
      discountTotal: Number(discount) || 0,
      notes: notes || settings.invoiceNotes || (settings as any).termsAndConditions || '',
      subtotal,
      taxTotal: totalTax,
      grandTotal: total,
      status: 'unpaid',
      createdAt: existingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      store_id: storeInfo?.id || '',
    };
  };

  // Unify saving logic for all actions
  const persistAndGetInvoice = async (): Promise<Invoice | null> => {
    const realCustomerId = await ensureCustomerIsSaved();
    if (!realCustomerId) return null;

    const invoiceObj = await buildInvoiceObject(realCustomerId);
    if (!invoiceObj) return null;

    try {
      await saveInvoice(invoiceObj);
      return invoiceObj;
    } catch (e) {
      console.error('Persistence failed:', e);
      toast.error('Failed to sync data. Please check your connection.');
      return null;
    }
  };

  const handleDownload = async () => {
    const invoice = await persistAndGetInvoice();
    if (!invoice) return;

    setIsGenerating(true);
    const toastId = toast.loading('Preparing invoice...');

    try {
      const currentStoreInfo = await getStoreInfo();
      const pdf = generateInvoicePDF(invoice, currentStoreInfo || storeInfo || (settings as any).globalStoreInfo!, settings);
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
    const invoice = await persistAndGetInvoice();
    if (!invoice) return;
    setIsGenerating(true);
    const toastId = toast.loading('Preparing print preview...');
    try {
      const currentStoreInfo = await getStoreInfo();
      const pdf = generateInvoicePDF(invoice, currentStoreInfo || storeInfo || (settings as any).globalStoreInfo!, settings);

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
    const invoice = await persistAndGetInvoice();
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
            text: `Invoice for ${invoice.customer?.name}`,
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

    const isInvoiceIncomplete = !selectedCustomerId || items.length === 0 || items.some(item => !item.productName?.trim());

    return (
        <div className="min-h-screen bg-slate-50 pb-12 sm:pb-8">
            <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 print:hidden transition-all duration-300 h-20">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleNavigateAway(() => navigate('/invoices'))}
                            className="h-9 px-2 sm:px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg group"
                        >
                            <ArrowLeft className="h-4 w-4 sm:mr-2 transition-transform group-hover:-translate-x-0.5" />
                            <span className="hidden sm:inline font-medium">Back</span>
                        </Button>
                        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
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
                <CardTitle className="text-xl font-bold">Invoice Details</CardTitle>
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
                  <CardTitle className="text-xl font-bold text-slate-900">Customer Details</CardTitle>
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
                      <SuggestionInput
                        id="customerName"
                        value={newCustomerData.name}
                        onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                        suggestions={customers}
                        onSuggestionSelect={handleSuggestionSelect}
                        placeholder={activeCustomer?.name || "John Doe"}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="customerPhone" className="text-sm flex items-center gap-1">
                        Phone <span className="text-red-500">*</span>
                      </Label>
                      <SuggestionInput
                        id="customerPhone"
                        value={newCustomerData.phone}
                        onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                        suggestions={customers}
                        onSuggestionSelect={handleSuggestionSelect}
                        labelKey="phone"
                        subLabelKey="name"
                        placeholder={activeCustomer?.phone || "9876543210"}
                        className="text-sm bg-white/50"
                      />
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
                        placeholder={activeCustomer?.gstin || "e.g. 09AAAAA0000A1Z5"}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail" className="text-sm">Email (Optional)</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newCustomerData.email}
                        onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                        placeholder={activeCustomer?.email || "customer@example.com"}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="customerAddress" className="text-sm">Billing Address</Label>
                      <Input
                        id="customerAddress"
                        value={newCustomerData.address}
                        onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                        placeholder={activeCustomer?.address || "Street, City, Area"}
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="customerState" className="text-sm flex items-center gap-1">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <Select value={newCustomerData.state} onValueChange={value => setNewCustomerData({ ...newCustomerData, state: value })}>
                        <SelectTrigger className="bg-white/50">
                          <SelectValue placeholder={activeCustomer?.state || "Select state"} />
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
                      <Input
                        id="itemQuantity"
                        value={newItemData.quantity}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            // If user types a number after 0, remove the leading 0
                            const finalVal = (newItemData.quantity === 0 || newItemData.quantity === '0') && val.length > 1 && val.startsWith('0') 
                              ? val.substring(1) 
                              : val;
                            setNewItemData({ ...newItemData, quantity: finalVal });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="1"
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemRate" className="text-sm flex items-center gap-1">
                        Rate (₹) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="itemRate"
                        value={newItemData.rate}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            const finalVal = (newItemData.rate === 0 || newItemData.rate === '0') && val.length > 1 && val.startsWith('0') && !val.startsWith('0.')
                              ? val.substring(1) 
                              : val;
                            setNewItemData({ ...newItemData, rate: finalVal });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="text-sm bg-white/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="itemTaxRate" className="text-sm">GST</Label>
                      <Input
                        id="itemTaxRate"
                        value={newItemData.taxRate}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            const finalVal = (newItemData.taxRate === 0 || newItemData.taxRate === '0') && val.length > 1 && val.startsWith('0')
                              ? val.substring(1) 
                              : val;
                            setNewItemData({ ...newItemData, taxRate: finalVal });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="text-sm bg-white/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 mr-2">Line Total:</span>
                      <span className="text-lg font-bold text-slate-900">₹{((Number(newItemData.rate) || 0) * (Number(newItemData.quantity) || 0)).toLocaleString('en-IN')}</span>
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
                              <div className="font-semibold text-sm text-slate-900 truncate">{item.productName}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                                  Qty: {item.quantity}
                                </span>
                                <span className="text-xs text-slate-500">
                                  × ₹{item.unitPrice.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs font-semibold text-slate-400">|</span>
                                <span className="text-xs font-medium text-[var(--color-primary)]">
                                  {item.taxRate}% GST
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-900">₹{item.totalAmount.toLocaleString('en-IN')}</div>
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
                    onChange={(e) => setTransportCharges(e.target.value)}
                    onFocus={(e) => e.target.select()}
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
                    onChange={(e) => setDiscount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className="text-sm bg-white/50 border-slate-200"
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">
                  Notes and Terms are now managed globally in <Link to="/settings?section=terms" className="text-indigo-600 hover:underline font-medium">Branding Settings</Link>.
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Action Buttons - Inline */}
          <Card className="border-slate-200/60 shadow-md glass-card overflow-hidden mt-6 pb-6">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4 px-6 mb-6">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-base font-semibold text-slate-800">Invoice Actions</CardTitle>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Total Amount</div>
                  <div className="text-xl font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Button 
                  onClick={handleExplicitSave} 
                  disabled={isGenerating || isInvoiceIncomplete} 
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 border-none font-semibold shadow-sm lg:col-span-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Invoice
                </Button>
                <Button variant="outline" size="lg" onClick={handlePreview} disabled={isGenerating} className="w-full rounded-xl">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" size="lg" onClick={handlePrint} disabled={isGenerating || isInvoiceIncomplete} className="w-full rounded-xl">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </Button>
                <Button variant="outline" size="lg" onClick={handleDownload} disabled={isGenerating || isInvoiceIncomplete} className="w-full rounded-xl">
                  <Download className="h-4 w-4 mr-2" />
                  Save PDF
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare} disabled={isGenerating || isInvoiceIncomplete} className="w-full rounded-xl">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>



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
