import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { saveInvoice as dbSaveInvoice, getAndIncrementInvoiceNumber } from '@/shared/utils/storage';
import { validateInput, ValidationRules } from '@/shared/utils/validation';

import InvoicePreviewModal from './InvoicePreviewModal';

export default function InvoiceForm() {
    const { user } = useAuth();
    const { settings: globalBranding, storeInfo: currentStore, updateSettings } = useBranding();
    const navigate = useNavigate();
    const getDraftKey = () => user ? `draft_${user.id}_new_invoice` : `guest_draft_new_invoice`;

    // --- State: UI & Controls ---
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    // --- Validation State ---
    const [customerErrors, setCustomerErrors] = useState<{name?: string | null, mobile?: string | null}>({});
    const [itemErrors, setItemErrors] = useState<Record<string, {quantity?: string | null, unitPrice?: string | null}>>({});

    // --- State: Single Source of Truth ---
    const [invoice, setInvoice] = useState<any>(null); // Start null for loader
    const [isLoadingDraft, setIsLoadingDraft] = useState(true);

    // --- Restoration Logic ---
    useEffect(() => {
        const restoreData = async () => {
            setIsLoadingDraft(true);
            try {
                const draftKey = getDraftKey();
                const localDraft = localStorage.getItem(draftKey);
                let restored = null;

                if (localDraft) {
                    restored = JSON.parse(localDraft);
                }

                // If logged in, we COULD fetch the latest "draft" invoice from DB here if needed
                // but for now, localStorage is the primary "active work" buffer.
                
                if (restored) {
                    setInvoice(restored);
                } else {
                    setInvoice({
                        id: crypto.randomUUID(),
                        items: [{ id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }],
                        customer: { name: '', mobile: '', email: '', address: '' },
                        notes: 'Thank you for your business.',
                        transportCharges: 0,
                        discountTotal: 0,
                        invoiceNumber: '', 
                        date: new Date().toISOString().split('T')[0],
                        dueDate: '',
                        status: 'unpaid',
                        updatedAt: new Date().toISOString()
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

    // UI-only states (not persisted to DB)
    const [customerMatches, setCustomerMatches] = useState<any[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [productMatches, setProductMatches] = useState<any[]>([]);
    const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null);

    const activeDomain = globalBranding.domain || 'general';

    // --- Derived Math ---
    const subtotal = (invoice.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const tax = (invoice.items || []).reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const grandTotal = subtotal + tax + Number(invoice.transportCharges) - Number(invoice.discountTotal);

    const isCustomerValid = !Object.values(customerErrors).some(err => err !== null) && invoice.customer?.name?.trim();
    const areItemsValid = invoice.items?.length > 0 && invoice.items.every((i: any) => {
        const errs = itemErrors[i.id] || {};
        return !errs.quantity && !errs.unitPrice && i.productName?.trim() && i.quantity > 0 && i.unitPrice > 0;
    });
    
    const isReady = Boolean(isCustomerValid && areItemsValid);

    // --- Fetch Next Invoice Number on Mount (if new) ---
    useEffect(() => {
        if (!invoice.invoiceNumber) {
            getAndIncrementInvoiceNumber().then(num => {
                updateInvoice({ invoiceNumber: num });
            });
        }
    }, []);

    // --- Autosave & Persistence ---
    useEffect(() => {
        if (!invoice || typeof window === 'undefined') return;
        
        const draftKey = getDraftKey();
        
        // 1. Instant sync to localStorage (Safety)
        localStorage.setItem(draftKey, JSON.stringify({ ...invoice, updatedAt: new Date().toISOString() }));

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
                    updatedAt: new Date().toISOString()
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
            customer: { ...prev.customer, ...updates }
        }));

        let newErrs = { ...customerErrors };
        if (updates.name !== undefined) newErrs.name = validateInput('name', updates.name);
        if (updates.mobile !== undefined) newErrs.mobile = validateInput('mobile', String(updates.mobile));
        setCustomerErrors(newErrs);
    };

    const updateItem = (id: string, updates: any) => {
        setInvoice((prev: any) => ({
            ...prev,
            items: prev.items.map((item: any) => item.id === id ? { ...item, ...updates } : item)
        }));

        const newErrs = { ...itemErrors[id] };
        if (updates.quantity !== undefined) newErrs.quantity = validateInput('quantity', String(updates.quantity));
        if (updates.unitPrice !== undefined) newErrs.unitPrice = validateInput('amount', String(updates.unitPrice));
        if (Object.keys(newErrs).length > 0) {
            setItemErrors(prev => ({ ...prev, [id]: newErrs }));
        }
    };

    const addItem = () => {
        const newItem = { id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 };
        updateInvoice({ items: [...invoice.items, newItem] });
    };

    const removeItem = (id: string) => {
        if (invoice.items.length <= 1) return;
        updateInvoice({ items: invoice.items.filter((i: any) => i.id !== id) });
    };

    // --- More logic follows (handleDownload, customer search etc.) ---
    const getSerializedItems = () => invoice.items.map((i: any) => {
        let extra = [];
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
        return { ...i, name: `${i.productName || 'Item'}${suffix}`, rate: i.unitPrice, amount: i.totalAmount, unit: i.unit || 'pcs' };
    });

    const buildInvoiceObj = (): any => ({
        id: invoice.id || crypto.randomUUID(),
        invoiceNumber: invoice.invoiceNumber, date: invoice.date, dueDate: invoice.dueDate,
        store_id: currentStore?.id || 'draft',
        customerId: invoice.customer.id || null,
        status: 'unpaid',
        customer: { id: invoice.customer.id, name: invoice.customer.name || 'Walk-in', phone: invoice.customer.mobile, email: invoice.customer.email, address: invoice.customer.address },
        items: getSerializedItems(),
        subtotal, taxTotal: tax, discountTotal: Number(invoice.discountTotal), grandTotal, transportCharges: Number(invoice.transportCharges), notes: invoice.notes, 
        templateId: typeof window !== 'undefined' ? localStorage.getItem('bill_default_template') || 'standard' : 'standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    const handleSaveInvoice = async () => {
        setIsSaving(true);
        try {
            const invoice = buildInvoiceObj();
            if (!user) {
                sessionStorage.setItem('bill_guest_mode', 'true');
                await dbSaveInvoice(invoice);
                // setSaveAlertOpen(true); -> For simplicity just returning them to login or dashboard
                toast.success('Draft saved. Login to permanently save.');
                navigate('/register');
                return;
            }
            await dbSaveInvoice(invoice);
            toast.success('Invoice saved successfully');
            navigate('/dashboard');
        } catch (e) { toast.error('Failed to save invoice'); } 
        finally { setIsSaving(false); }
    };

    const handleDownloadPDF = (templateId: string) => {
        // Standard JS PDF Download - templateId would map to different layouts later
        const invoiceObj = buildInvoiceObj();
        const doc = generateInvoicePDF(invoiceObj, currentStore || ({ name: 'Business' } as any), globalBranding);
        doc.save(getInvoiceFilename(invoiceObj));
        toast.success(`Downloading with ${templateId} template`);
        setShowPreviewModal(false);
    };

    if (isLoadingDraft || !invoice) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl animate-pulse">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold">Restoring your draft...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
            {showPreviewModal && (
                <InvoicePreviewModal 
                    invoiceData={{ 
                        invoiceNumber: invoice.invoiceNumber, 
                        date: invoice.date, 
                        dueDate: invoice.dueDate, 
                        customer: invoice.customer 
                    }}
                    items={getSerializedItems()}
                    subtotal={subtotal} 
                    tax={tax} 
                    discount={Number(invoice.discountTotal)} 
                    transportCharges={Number(invoice.transportCharges)} 
                    grandTotal={grandTotal} 
                    notes={invoice.notes}
                    onClose={() => setShowPreviewModal(false)}
                    onDownload={handleDownloadPDF}
                />
            )}

            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Invoice Details</h2>
                    <p className="text-sm text-slate-500">Fill out the structured form data. Changes save automatically.</p>
                </div>
                <button onClick={() => { /* No action, domain selector removed */ }} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2">
                    <span className="text-xl">{activeDomain === 'furniture' ? '🛋️' : activeDomain === 'clothing' ? '👕' : activeDomain === 'freelance' ? '💻' : activeDomain === 'medical' ? '⚕️' : activeDomain === 'hotel' ? '🏨' : '📝'}</span>
                    Current Industry ({activeDomain})
                </button>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white border text-sm border-slate-200 rounded-3xl shadow-sm p-8">
                
                {/* 1. Header Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-10 border-b border-slate-100">
                    <div className="md:col-span-2 relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Customer Name *</label>
                        <input 
                            className={`w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-800 outline-none border transition-colors ${customerErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'focus:border-slate-300'}`}
                            placeholder="Type customer name..."
                            value={invoice.customer.name} 
                            onChange={async (e) => {
                                const val = e.target.value;
                                updateCustomer({ name: val });
                                if (val.trim().length >= 2) {
                                    const { searchCustomers } = await import('@/shared/utils/storage');
                                    setCustomerMatches(await searchCustomers(val));
                                    setShowCustomerDropdown(true);
                                } else setShowCustomerDropdown(false);
                            }}
                            onFocus={() => { if(customerMatches.length > 0) setShowCustomerDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        />
                        {customerErrors.name && <p className="text-red-500 text-[10px] mt-1 font-semibold absolute -bottom-5 left-0">{customerErrors.name}</p>}
                        {showCustomerDropdown && customerMatches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                                {customerMatches.map((match: any) => (
                                    <button
                                        key={match.id}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            updateCustomer({
                                                id: match.id,
                                                name: match.name,
                                                mobile: match.phone || '',
                                                email: match.email || '',
                                                address: match.address || `${match.city ? match.city + ', ' : ''}${match.state || ''}`.trim()
                                            });
                                            setShowCustomerDropdown(false);
                                        }}
                                    >
                                        <div className="font-bold text-slate-800">{match.name}</div>
                                        <div className="text-xs text-slate-500">{match.phone} {match.email && `• ${match.email}`}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Phone Number</label>
                        <input 
                            className={`w-full bg-slate-50 p-3 rounded-xl border outline-none transition-colors ${customerErrors.mobile ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'focus:border-slate-300'}`} 
                            placeholder="e.g. 9876543210" 
                            inputMode="numeric"
                            maxLength={10}
                            value={invoice.customer.mobile} 
                            onChange={e => {
                                const val = ValidationRules.mobile.format(e.target.value);
                                updateCustomer({ mobile: val });
                            }} 
                        />
                        {customerErrors.mobile && <p className="text-red-500 text-[10px] mt-1 font-semibold absolute -bottom-5 left-0">{customerErrors.mobile}</p>}
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Address</label>
                        <input className="w-full bg-slate-50 p-3 rounded-xl border focus:border-slate-300 outline-none transition-colors" placeholder="Billing Address..." value={invoice.customer.address} onChange={e => updateCustomer({ address: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Invoice No *</label>
                        <input className="w-full bg-slate-50 p-3 font-mono font-bold rounded-xl border-none outline-none" value={invoice.invoiceNumber} onChange={e => updateInvoice({ invoiceNumber: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Issue Date</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none" value={invoice.date} onChange={e => updateInvoice({ date: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Due Date</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none" value={invoice.dueDate} onChange={e => updateInvoice({ dueDate: e.target.value })} />
                    </div>
                </div>

                {/* 2. Items Table Section (Dynamic) */}
                <div className="mb-10 pb-10 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 mb-4">Invoice Items</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left bg-white">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">{activeDomain === 'medical' ? 'Consultation/Treatment' : activeDomain === 'freelance' ? 'Task/Service' : 'Item Description'}</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">{activeDomain === 'freelance' ? 'Hours' : activeDomain === 'hotel' ? 'Nights' : 'Qty'}</th>
                                    {(activeDomain === 'furniture' || activeDomain === 'clothing') && <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">HSN</th>}
                                    {activeDomain === 'clothing' && (
                                        <>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-20">Size</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-20">Color</th>
                                        </>
                                    )}
                                    {activeDomain === 'furniture' && <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-28">Material</th>}
                                    {activeDomain === 'freelance' && <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Project</th>}
                                    {activeDomain === 'medical' && (
                                        <>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Patient</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Procedure</th>
                                        </>
                                    )}
                                    {activeDomain === 'hotel' && <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center w-24">Room No</th>}
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-32">{activeDomain === 'freelance' ? 'Rate/Hr' : activeDomain === 'hotel' ? 'Rate/Night' : 'Price'}</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-24">GST %</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right w-32">Total</th>
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
                                                onChange={async e => { 
                                                    const val = e.target.value;
                                                    updateItem(item.id, { productName: val });
                                                    
                                                    if (val.trim().length >= 2) {
                                                        const { searchProducts } = await import('@/shared/utils/storage');
                                                        setProductMatches(await searchProducts(val));
                                                        setActiveProductIdx(idx);
                                                    } else {
                                                        setActiveProductIdx(null);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if ((item.productName || '').trim().length >= 2 && productMatches.length > 0) setActiveProductIdx(idx);
                                                }}
                                                onBlur={() => setTimeout(() => setActiveProductIdx(null), 200)}
                                            />
                                            {activeProductIdx === idx && productMatches.length > 0 && (
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                                                    {productMatches.map((match: any) => (
                                                        <button
                                                            key={match.id}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                updateItem(item.id, {
                                                                    productName: match.name,
                                                                    unitPrice: match.sellingPrice || 0,
                                                                    taxRate: match.gstRate || 0,
                                                                    hsn: match.hsnCode || '',
                                                                    unit: match.unit || 'pcs',
                                                                    totalAmount: item.quantity * (match.sellingPrice || 0)
                                                                });
                                                                setActiveProductIdx(null);
                                                            }}
                                                        >
                                                            <div className="font-bold text-slate-800 text-sm truncate">{match.name}</div>
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                ₹{match.sellingPrice?.toLocaleString()} • GST {match.gstRate}%
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center relative">
                                            <input type="number" className={`w-full bg-slate-50 p-2 rounded-lg outline-none text-center font-bold transition-colors ${(itemErrors[item.id] && itemErrors[item.id].quantity) ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border border-transparent hover:border-slate-200'}`} value={item.quantity === 0 ? '' : item.quantity} onFocus={e => e.target.select()} onChange={e => updateItem(item.id, { quantity: Number(e.target.value), totalAmount: Number(e.target.value) * item.unitPrice })} />
                                        </td>
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="HSN" value={item.hsn || ''} onChange={e => updateItem(item.id, { hsn: e.target.value })} />
                                            </td>
                                        )}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="L/XL" value={item.unit || ''} onChange={e => updateItem(item.id, { unit: e.target.value })} />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Red" value={item.color || ''} onChange={e => updateItem(item.id, { color: e.target.value })} />
                                                </td>
                                            </>
                                        )}
                                        {activeDomain === 'furniture' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Wood" value={item.material || ''} onChange={e => updateItem(item.id, { material: e.target.value })} />
                                            </td>
                                        )}
                                        {activeDomain === 'freelance' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Website" value={item.project || ''} onChange={e => updateItem(item.id, { project: e.target.value })} />
                                            </td>
                                        )}
                                        {activeDomain === 'medical' && (
                                            <>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Jane Doe" value={item.patient || ''} onChange={e => updateItem(item.id, { patient: e.target.value })} />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="C001" value={item.procedure || ''} onChange={e => updateItem(item.id, { procedure: e.target.value })} />
                                                </td>
                                            </>
                                        )}
                                        {activeDomain === 'hotel' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="204" value={item.room || ''} onChange={e => updateItem(item.id, { room: e.target.value })} />
                                            </td>
                                        )}
                                        <td className="p-3 text-right">
                                            <input type="number" className={`w-full bg-slate-50 p-2 rounded-lg outline-none text-right font-bold text-slate-600 transition-colors ${(itemErrors[item.id] && itemErrors[item.id].unitPrice) ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500' : 'border border-transparent hover:border-slate-200'}`} value={item.unitPrice === 0 ? '' : item.unitPrice} onFocus={e => e.target.select()} onChange={e => updateItem(item.id, { unitPrice: Number(e.target.value), totalAmount: item.quantity * Number(e.target.value) })} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <select className="w-full bg-slate-50 p-2 rounded-lg outline-none appearance-none text-center font-bold" value={item.taxRate} onChange={e => updateItem(item.id, { taxRate: Number(e.target.value) })}>
                                                <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-right font-black text-slate-800">
                                            ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => removeItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addItem} className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all text-xs font-bold tracking-wide">
                        <Plus size={16} /> ADD ITEM
                    </button>
                </div>

                {/* 3. Totals & Notes */}
                <div className="flex flex-col md:flex-row justify-between gap-10">
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Terms & Notes</label>
                            <textarea className="w-full bg-slate-50 p-4 rounded-xl border focus:border-slate-300 outline-none transition-colors text-slate-600 min-h-[120px]" placeholder="Payment terms..." value={invoice.notes} onChange={e => updateInvoice({ notes: e.target.value })} />
                            {lastSaved && <p className="text-[10px] text-slate-400 mt-2 font-medium">Last autosaved at {lastSaved}</p>}
                        </div>
                    </div>
                    <div className="w-full md:w-80 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit space-y-4">
                        <div className="flex justify-between items-center text-slate-600 text-sm pb-3 border-b border-slate-200/60">
                            <span className="font-bold">Subtotal:</span>
                            <span className="font-bold">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600 text-sm pb-3 border-b border-slate-200/60">
                            <span className="font-bold">Total Tax:</span>
                            <span className="font-bold">₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label className="font-bold text-slate-600">Discount (-):</label>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 w-32">
                                <span className="text-slate-400">₹</span>
                                <input type="number" min="0" className="w-full p-2 outline-none text-right font-bold text-slate-800" value={invoice.discountTotal === 0 ? '' : invoice.discountTotal} onFocus={e => e.target.select()} onChange={e => updateInvoice({ discountTotal: Number(e.target.value) || 0 })} placeholder="0" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200/60">
                            <label className="font-bold text-slate-600">Transport (+):</label>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 w-32">
                                <span className="text-slate-400">₹</span>
                                <input type="number" min="0" className="w-full p-2 outline-none text-right font-bold text-slate-800" value={invoice.transportCharges === 0 ? '' : invoice.transportCharges} onFocus={e => e.target.select()} onChange={e => updateInvoice({ transportCharges: Number(e.target.value) || 0 })} placeholder="0" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-slate-900 text-xl pt-2">
                            <span className="font-black">Total:</span>
                            <span className="font-black tracking-tight" style={{ color: globalBranding.primaryColor }}>₹{Math.round(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* ACTION FOOTER */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-6 z-40">
                <div className="text-sm font-medium text-slate-500">
                    {/* Status hint removed for cleaner UI */}
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={() => setShowPreviewModal(true)}
                        disabled={!isReady}
                        className="flex-1 md:flex-none px-6 py-3 bg-white border-2 hover:bg-slate-50 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        style={{ color: globalBranding.primaryColor, borderColor: globalBranding.primaryColor }}
                    >
                        <Eye size={18} /> Preview & Templates
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving || !isReady}
                        className="flex-1 md:flex-none px-6 py-3 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                        style={{ backgroundColor: globalBranding.primaryColor }}
                    >
                        <Save size={18} /> Save Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
