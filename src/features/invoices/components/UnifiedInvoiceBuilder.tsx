import React, { useState, useEffect, useRef } from 'react';
import { Download, Shield, Plus, Trash2, Camera, User, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
import { defaultBrandingSettings, BrandingSettings } from '@/shared/types/branding';
import { StoreInfo, Invoice, Customer, InvoiceItem } from '@/features/invoices/types/invoice';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { saveInvoice as dbSaveInvoice, isGuestMode } from '@/shared/utils/storage';
import { useNavigate } from 'react-router-dom';

export default function UnifiedInvoiceBuilder() {
    const { user } = useAuth();
    const { settings: globalBranding, storeInfo: globalStore, updateSettings, updateStoreInfo, loading: brandingLoading } = useBranding();
    const navigate = useNavigate();
    const getDraftKey = (key: string) => user ? `draft_${user.id}_${key}` : `guest_demo_${key}`;

    // --- State: Items ---
    const [items, setItems] = useState<any[]>(() => {
        if(typeof window === 'undefined') return [];
        // Try draft first, then Guest demo (for migration flow)
        const saved = sessionStorage.getItem(getDraftKey('items')) || sessionStorage.getItem('guest_demo_items');
        return saved ? JSON.parse(saved) : [
            { id: crypto.randomUUID(), productName: 'Professional Consulting', quantity: 1, unitPrice: 15000, taxRate: 18, totalAmount: 15000 },
        ];
    });
    
    // --- State: Customer ---
    const [customer, setCustomer] = useState<{name: string, mobile: string}>(() => {
        if(typeof window === 'undefined') return { name: '', mobile: '' };
        const saved = sessionStorage.getItem(getDraftKey('customer')) || sessionStorage.getItem('guest_demo_customer');
        return saved ? JSON.parse(saved) : { name: '', mobile: '' };
    });
    
    // --- State: Details ---
    const [notes, setNotes] = useState(() => {
        if(typeof window === 'undefined') return '';
        const saved = sessionStorage.getItem(getDraftKey('notes')) || sessionStorage.getItem('guest_demo_notes');
        return saved || 'Thank you for your business.';
    });

    const [transportCharges, setTransportCharges] = useState<number>(() => {
        if(typeof window === 'undefined') return 0;
        const saved = sessionStorage.getItem(getDraftKey('charges')) || sessionStorage.getItem('guest_demo_charges');
        return saved ? Number(saved) : 0;
    });

    const [discount, setDiscount] = useState<number>(() => {
        if(typeof window === 'undefined') return 0;
        const saved = sessionStorage.getItem(getDraftKey('discount')) || sessionStorage.getItem('guest_demo_discount');
        return saved ? Number(saved) : 0;
    });

    // --- State: UI ---
    const [showBrandingPanel, setShowBrandingPanel] = useState(false);
    const [saveAlertOpen, setSaveAlertOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- Derived ---
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const grandTotal = subtotal + tax + Number(transportCharges) - Number(discount);

    // --- Sync State ---
    useEffect(() => {
        if(typeof window === 'undefined') return;
        sessionStorage.setItem(getDraftKey('items'), JSON.stringify(items));
        sessionStorage.setItem(getDraftKey('customer'), JSON.stringify(customer));
        sessionStorage.setItem(getDraftKey('notes'), notes);
        sessionStorage.setItem(getDraftKey('charges'), transportCharges.toString());
        sessionStorage.setItem(getDraftKey('discount'), discount.toString());
    }, [items, customer, notes, transportCharges, discount, user]);

    // --- Helpers: Branding Updates ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLogo: boolean) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                if(isLogo) {
                    await updateSettings({...globalBranding, logo: base64});
                } else {
                    await updateSettings({...globalBranding, signatureImage: base64});
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateStore = async (key: string, val: string) => {
        await updateStoreInfo({...(globalStore || {id:'guest', name: 'Your Business', phone: '', email: '', address: '', state: 'Bihar', gstin: ''}), [key]: val});
    };

    // --- Actions ---
    const handleSaveInvoice = async () => {
        if (!user) {
            setSaveAlertOpen(true);
            return;
        }

        setIsSaving(true);
        try {
            const invoice: any = {
                id: crypto.randomUUID(),
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                customer: { name: customer.name || 'Walk-in Customer', phone: customer.mobile },
                items, subtotal, taxTotal: tax, discountTotal: discount,
                grandTotal, transportCharges, notes,
                createdAt: new Date().toISOString()
            };
            
            await dbSaveInvoice(invoice);
            toast.success('Invoice saved successfully');
            navigate('/dashboard');
        } catch (e) {
            toast.error('Failed to save invoice');
        } finally {
            setIsSaving(false);
        }
    };

    const downloadPDF = () => {
        // Map items to the shape expected by generateInvoicePDF
        const mappedItems = items.map(item => ({
            ...item,
            name: item.productName || item.name || 'Item',
            rate: item.unitPrice ?? item.rate ?? 0,
            amount: item.totalAmount ?? item.amount ?? 0,
            hsn: item.hsn || '',
            unit: item.unit || 'pcs',
        }));

        const effectiveSettings = {
            ...globalBranding,
            showSignature: !!globalBranding.signatureImage,
        };

        const invoiceObj: any = {
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            customer: { name: customer.name || 'Walk-in Customer', phone: customer.mobile },
            items: mappedItems,
            subtotal,
            taxTotal: tax,
            discountTotal: discount,
            grandTotal,
            transportCharges,
            notes,
        };
        const storeForPDF: any = {
            name: currentStore.name || 'Your Business',
            address: currentStore.address || '',
            phone: currentStore.phone || '',
            email: currentStore.email || '',
            gstin: currentStore.gstin || '',
            state: (currentStore as any).state || 'Bihar',
        };
        const doc = generateInvoicePDF(invoiceObj, storeForPDF, effectiveSettings);
        doc.save(getInvoiceFilename(invoiceObj));
    };

    if (brandingLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">Loading Builder...</div>;

    const currentStore = globalStore || { name: '', address: '', phone: '', email: '', gstin: '' };

    return (
        <div className="w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] rounded-xl border border-slate-200 bg-white overflow-hidden text-slate-800">
            {/* Header / Actions Block */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-8 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowBrandingPanel(!showBrandingPanel)}
                        className="px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border-2 border-dashed"
                        style={{
                            borderColor: `${globalBranding.primaryColor}50`,
                            color: globalBranding.primaryColor,
                            background: `${globalBranding.primaryColor}10`,
                        }}
                    >
                        <Pencil size={16} /> Select Color
                    </button>
                    {!globalStore?.name && user && (
                        <div className="text-xs font-bold px-3 py-1.5 rounded-full animate-pulse" style={{ color: globalBranding.primaryColor, background: `${globalBranding.primaryColor}15` }}>
                            Complete your business profile below
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={downloadPDF} className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors">
                        <Download size={16} /> Download PDF
                    </button>
                    <button
                        onClick={handleSaveInvoice}
                        disabled={isSaving}
                        className="px-5 py-2.5 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        style={{ background: globalBranding.primaryColor }}
                    >
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Invoice'}
                    </button>
                </div>
            </div>

            {/* WYSIWYG Editable Invoice Sheet */}
            <div className="p-4 md:p-8 xl:p-12" style={{ maxWidth: '850px', margin: '0 auto' }}>
                
                {/* INVOICE TOP: BRANDING & CUSTOMER */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
                    <div className="flex-1 min-w-[200px]">
                        {globalBranding.logo ? (
                            <img src={globalBranding.logo} alt="Logo" className="max-h-20 mb-3 object-contain" />
                        ) : (
                            <div className="h-16 w-32 bg-slate-100 border border-slate-200 rounded-lg mb-3 flex items-center justify-center text-xs text-slate-400">YOUR LOGO</div>
                        )}
                        <input className="text-2xl md:text-3xl font-black text-slate-900 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300" 
                            placeholder="Business Name"
                            value={currentStore.name} onChange={e => handleUpdateStore('name', e.target.value)} />
                        <textarea className="text-sm font-medium text-slate-500 border-none px-0 outline-none w-full bg-transparent resize-none overflow-hidden h-8 placeholder:text-slate-300 mt-1" 
                            placeholder="Business Address"
                            value={currentStore.address} onChange={e => handleUpdateStore('address', e.target.value)} />
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <input className="text-sm font-medium text-slate-500 border-none px-0 outline-none w-32 bg-transparent placeholder:text-slate-300" 
                            placeholder="Phone" value={currentStore.phone} onChange={e => handleUpdateStore('phone', e.target.value)} />
                            <input className="text-sm font-medium text-slate-500 border-none px-0 outline-none w-48 bg-transparent placeholder:text-slate-300" 
                            placeholder="Email" value={currentStore.email} onChange={e => handleUpdateStore('email', e.target.value)} />
                            <input className="text-sm font-bold text-indigo-500 border-none px-0 outline-none w-48 bg-transparent placeholder:text-indigo-200" 
                            placeholder="GSTIN (Optional)" value={currentStore.gstin} onChange={e => handleUpdateStore('gstin', e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="md:text-right w-full md:w-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-200 uppercase tracking-tighter mb-4" style={{ color: `${globalBranding.primaryColor || '#6366f1'}20` }}>
                            INVOICE
                        </h2>
                        
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left transition-colors hover:border-slate-300">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">BILL TO</div>
                            <input className="text-lg font-bold text-slate-800 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300 mb-1" 
                                placeholder="Customer Name"
                                value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                            <input className="text-sm font-medium text-slate-500 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300" 
                                placeholder="Customer Mobile"
                                value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[50%]">Item & Description</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">Qty</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">Rate (₹)</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">Amount</th>
                                    <th className="py-3 px-4 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-0 align-top">
                                            <input 
                                                className="w-full h-full min-h-[50px] px-4 py-3 bg-transparent border-none outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-300"
                                                placeholder="Service description..."
                                                value={item.productName}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].productName = e.target.value;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="p-0 align-top">
                                            <input 
                                                type="number"
                                                className="w-full h-full min-h-[50px] px-4 py-3 text-right bg-transparent border-none outline-none font-bold text-slate-700"
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].quantity = Number(e.target.value);
                                                    newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="p-0 align-top">
                                            <input 
                                                type="number"
                                                className="w-full h-full min-h-[50px] px-4 py-3 text-right bg-transparent border-none outline-none font-bold text-slate-700"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].unitPrice = Number(e.target.value);
                                                    newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-slate-900 border-l border-slate-50 bg-slate-50/50">
                                            {item.totalAmount.toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-2 py-3">
                                            <button 
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <button 
                    onClick={() => setItems([...items, { id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }])}
                    className="flex w-fit items-center gap-2 px-4 py-2 border border-dashed border-slate-300 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors text-sm font-bold mb-10"
                >
                    <Plus size={16} /> Add Line Item
                </button>

                {/* FOOTER TOTALS & SIGNATURE */}
                <div className="flex flex-col md:flex-row justify-between gap-8 mt-4">
                    
                    {/* Notes & Signature */}
                    <div className="flex-1 w-full flex flex-col justify-between">
                        <div className="mb-8">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">NOTES / TERMS</div>
                            <textarea 
                                className="w-full max-w-sm text-sm p-4 bg-slate-50 border border-slate-100 rounded-xl resize-none outline-none focus:border-indigo-300 transition-colors text-slate-600"
                                placeholder="..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                        
                        <div>
                            {globalBranding.signatureImage ? (
                                <div className="mb-2 relative w-fit">
                                    <img src={globalBranding.signatureImage} alt="Signature" className="h-16 w-auto object-contain border-b border-dashed border-slate-300 pb-1" />
                                    <button onClick={() => {
                                        updateSettings({...globalBranding, signatureImage: ''});
                                    }} className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border border-slate-100 text-red-500"><X size={12}/></button>
                                </div>
                            ) : (
                                <div className="h-16 w-40 border-b-2 border-slate-200 mb-2" />
                            )}
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authorized Signatory</div>
                        </div>
                    </div>

                    {/* Totals Box */}
                    <div className="w-full md:w-72 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <div className="flex justify-between items-center mb-3 text-sm font-bold text-slate-500">
                            <span>Subtotal</span>
                            <span>{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3 text-sm font-bold text-slate-500">
                            <span>Tax (18% Default)</span>
                            <span>{Math.round(tax).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3 text-sm font-bold text-slate-500 group relative">
                            <span className="cursor-pointer border-b border-dashed border-slate-300">Transport (+)</span>
                            <div className="flex items-center gap-1">
                                <span>₹</span>
                                <input type="number" className="w-16 bg-transparent text-right outline-none text-slate-800" style={{ borderBottom: `1px solid ${globalBranding.primaryColor}40` }} value={transportCharges || ''} onChange={e => setTransportCharges(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-6 text-sm font-bold text-slate-500 group relative">
                            <span className="cursor-pointer border-b border-dashed border-slate-300">Discount (-)</span>
                            <div className="flex items-center gap-1">
                                <span>₹</span>
                                <input type="number" className="w-16 bg-transparent text-right outline-none text-slate-800" style={{ borderBottom: `1px solid ${globalBranding.primaryColor}40` }} value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} />
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t-2 border-slate-200">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-sm font-black text-slate-800">TOTAL</span>
                                <span className="text-2xl font-black" style={{ color: globalBranding.primaryColor }}>₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* BRANDING PANEL MODAL */}
            {showBrandingPanel && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-scale-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Select Color & Images</h3>
                            <button onClick={() => setShowBrandingPanel(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Upload Logo</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 cursor-pointer relative overflow-hidden transition-colors" style={{}} onMouseEnter={e => (e.currentTarget.style.borderColor = globalBranding.primaryColor)} onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => handleImageUpload(e, true)} />
                                    {globalBranding.logo ? (
                                        <img src={globalBranding.logo} className="h-16 object-contain pointer-events-none" />
                                    ) : (
                                        <>
                                            <Camera size={24} className="text-slate-400 mb-2" />
                                            <span className="text-sm font-medium text-slate-500">Tap to upload your logo</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Upload Signature</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 cursor-pointer relative overflow-hidden transition-colors" onMouseEnter={e => (e.currentTarget.style.borderColor = globalBranding.primaryColor)} onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                                    {globalBranding.signatureImage ? (
                                        <img src={globalBranding.signatureImage} className="h-16 object-contain pointer-events-none" />
                                    ) : (
                                        <>
                                            <Pencil size={24} className="text-slate-400 mb-2" />
                                            <span className="text-sm font-medium text-slate-500">Tap to upload signature</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">GSTIN Number</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. 10ABCDE1234F1Z5"
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-sm uppercase transition-colors"
                                    style={{ borderColor: '' }}
                                    onFocus={e => (e.currentTarget.style.borderColor = globalBranding.primaryColor)}
                                    onBlur={e => (e.currentTarget.style.borderColor = '')}
                                    value={currentStore.gstin}
                                    onChange={e => handleUpdateStore('gstin', e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">Theme Color</label>
                                <div className="flex gap-3">
                                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0f172a'].map(c => (
                                        <button key={c} onClick={() => { updateSettings({...globalBranding, primaryColor: c}); }} className={`w-8 h-8 rounded-full shadow-sm ring-offset-2 border border-slate-200`} style={{ background: c, outline: globalBranding.primaryColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <button onClick={() => setShowBrandingPanel(false)} className="w-full mt-8 py-3 text-white rounded-xl font-bold transition-colors" style={{ background: globalBranding.primaryColor }}>
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* SAVE INVOICE NATIVE COMPONENT ALERT (UX FIX!) */}
            {saveAlertOpen && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl max-w-sm w-full p-8 scale-in-center overflow-hidden relative border border-slate-100">
                        <div className="absolute top-0 left-0 w-full h-2" style={{ background: `linear-gradient(to right, ${globalBranding.primaryColor}, ${globalBranding.primaryColor}aa)` }} />
                        
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ background: `${globalBranding.primaryColor}20`, color: globalBranding.primaryColor }}>
                            <Shield size={24} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Save your invoice</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                            Create a free account to permanently save this invoice, organize your business, and access it from any device.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    sessionStorage.setItem('bill_guest_mode', 'true');
                                    sessionStorage.setItem('guest_mode_bill_branding_settings', JSON.stringify({...globalBranding}));
                                    sessionStorage.setItem('guest_mode_bill_store_info', JSON.stringify(currentStore));
                                    window.location.href = '/register';
                                }}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] transition-transform active:scale-[0.98]"
                            >
                                Save & Continue
                            </button>
                            <button 
                                onClick={() => {
                                    sessionStorage.setItem('bill_guest_mode', 'true');
                                    sessionStorage.setItem('guest_mode_bill_branding_settings', JSON.stringify({...globalBranding}));
                                    sessionStorage.setItem('guest_mode_bill_store_info', JSON.stringify(currentStore));
                                    window.location.href = '/login';
                                }}
                                className="w-full py-3.5 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-xl font-bold transition-transform active:scale-[0.98]"
                            >
                                Login / Register
                            </button>
                        </div>
                        
                        <button onClick={() => setSaveAlertOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 p-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
            
            <style>{`
            .scale-in-center {
                animation: scale-in-center 0.3s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
            }
            @keyframes scale-in-center {
                0% { transform: scale(0.9); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-scale-up {
                animation: scaleUp 0.3s cubic-bezier(0.16,1,0.3,1) both;
            }
            @keyframes scaleUp {
                0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            `}</style>
        </div>
    );
}
