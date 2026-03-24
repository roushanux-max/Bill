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
    const [showDomainSelector, setShowDomainSelector] = useState(false);
    
    // --- UI State: Download Validation ---
    const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);
    
    // --- Derived ---
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const grandTotal = subtotal + tax + Number(transportCharges) - Number(discount);
    
    const currentStore = globalStore || { name: '', address: '', phone: '', email: '', gstin: '' };

    const isDownloadReady = Boolean(
        (globalStore?.name || currentStore.name)?.trim() &&
        customer.name?.trim() &&
        items.length > 0 &&
        items.every(i => i.productName?.trim() && i.quantity > 0 && i.unitPrice > 0)
    );

    // --- Sync State ---
    useEffect(() => {
        if(typeof window === 'undefined') return;
        sessionStorage.setItem(getDraftKey('items'), JSON.stringify(items));
        sessionStorage.setItem(getDraftKey('customer'), JSON.stringify(customer));
        sessionStorage.setItem(getDraftKey('notes'), notes);
        sessionStorage.setItem(getDraftKey('charges'), transportCharges.toString());
        sessionStorage.setItem(getDraftKey('discount'), discount.toString());
    }, [items, customer, notes, transportCharges, discount, user]);

    // Check if domain is set, if not prompt it
    useEffect(() => {
        if (!brandingLoading && (!globalBranding.domain || globalBranding.domain === 'general')) {
            // Only show if it matches the exact empty/default state, and hasn't been dismissed
            // Actually, we'll force the prompt if it's 'general' for this redesign requirement
            // But to avoid annoyance we'll only do it right after load if no items exist, or if they click setting
        }
    }, [globalBranding.domain, brandingLoading]);

    // Force checking domain on mount
    useEffect(() => {
        if (!brandingLoading) {
            const hasDomain = globalBranding.domain && globalBranding.domain !== 'general';
            const isFirstTime = !sessionStorage.getItem('domain_prompted_once');
            if (!hasDomain && isFirstTime) {
                setShowDomainSelector(true);
                sessionStorage.setItem('domain_prompted_once', 'true');
            }
        }
    }, [brandingLoading, globalBranding.domain]);

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
            // Serialize domain specific fields into productName so DB schema doesn't break
            const serializedItems = items.map(i => {
                let extra = [];
                if (activeDomain === 'clothing') {
                    if (i.unit && ['S','M','L','XL','XXL'].includes(i.unit)) extra.push(`Size: ${i.unit}`);
                    if ((i as any).color) extra.push(`Color: ${(i as any).color}`);
                } else if (activeDomain === 'furniture') {
                    if ((i as any).material) extra.push(`Material: ${(i as any).material}`);
                }
                const suffix = extra.length > 0 ? ` [${extra.join(', ')}]` : '';
                return {
                    ...i,
                    productName: `${i.productName || ''}${suffix}`
                };
            });

            const invoice: any = {
                id: crypto.randomUUID(),
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                customer: { name: customer.name || 'Walk-in Customer', phone: customer.mobile },
                items: serializedItems, subtotal, taxTotal: tax, discountTotal: discount,
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
        // Map items to the shape expected by generateInvoicePDF and serialize domain logic
        const mappedItems = items.map(item => {
            let extra = [];
            if (activeDomain === 'clothing') {
                if (item.unit && ['S','M','L','XL','XXL'].includes(item.unit)) extra.push(`Size: ${item.unit}`);
                if ((item as any).color) extra.push(`Color: ${(item as any).color}`);
            } else if (activeDomain === 'furniture') {
                if ((item as any).material) extra.push(`Material: ${(item as any).material}`);
            }
            const suffix = extra.length > 0 ? ` [${extra.join(', ')}]` : '';
            const finalName = `${item.productName || item.name || 'Item'}${suffix}`;

            return {
                ...item,
                name: finalName,
                productName: finalName,
                rate: item.unitPrice ?? item.rate ?? 0,
                amount: item.totalAmount ?? item.amount ?? 0,
                hsn: item.hsn || '',
                unit: item.unit || 'pcs',
            };
        });

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

    const activeDomain = globalBranding.domain || 'general';

    // Renders the domain selector modal
    const DomainSelectorModal = () => (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-slate-800">Choose Your Business Type</h3>
                    {sessionStorage.getItem('domain_prompted_once') && (
                        <button onClick={() => setShowDomainSelector(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
                    )}
                </div>
                
                <p className="text-slate-500 mb-6 -mt-2">This tailors the invoice fields specifically for your industry.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                        { id: 'furniture', icon: <span className="text-3xl mb-2 block">🛋️</span>, name: 'Furniture Store', desc: 'Adds HSN, Material' },
                        { id: 'clothing', icon: <span className="text-3xl mb-2 block">👕</span>, name: 'Clothing Store', desc: 'Adds Size, Color' },
                        { id: 'hotel', icon: <span className="text-3xl mb-2 block">🏨</span>, name: 'Hotel & Lodging', desc: 'Adds Room, Days' }
                    ].map(d => (
                        <button 
                            key={d.id}
                            onClick={async () => {
                                await updateSettings({...globalBranding, domain: d.id as any});
                                setShowDomainSelector(false);
                                toast.success(`${d.name} template applied!`);
                            }}
                            className={`p-4 rounded-xl border-2 text-center transition-all hover:bg-slate-50 ${activeDomain === d.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}
                            style={activeDomain === d.id ? { borderColor: globalBranding.primaryColor, backgroundColor: `${globalBranding.primaryColor}10` } : {}}
                        >
                            {d.icon}
                            <div className="font-bold text-slate-800 text-sm mb-1">{d.name}</div>
                            <div className="text-[10px] text-slate-500">{d.desc}</div>
                        </button>
                    ))}
                </div>
                
                <button onClick={() => setShowDomainSelector(false)} className="w-full py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">
                    Cancel / Skip
                </button>
            </div>
        </div>
    );

    return (
        <div className="w-full relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] rounded-xl border border-slate-200 bg-white text-slate-800">
            {showDomainSelector && <DomainSelectorModal />}
            {/* WYSIWYG Editable Invoice Sheet */}
            <div className="p-4 md:p-8 xl:p-12" style={{ maxWidth: '850px', margin: '0 auto' }}>
                
                {/* INVOICE TOP: BRANDING & CUSTOMER (Redesigned 2-Column) */}
                <div className="flex flex-col md:flex-row justify-between mb-8 overflow-hidden rounded-t-2xl shadow-sm border border-slate-100">
                    
                    {/* Left Column: Business Info & Bill To */}
                    <div className="flex-1 bg-white p-6 md:p-8 flex flex-col justify-between">
                        <div>
                            <div className="mb-4 relative inline-block group w-fit h-fit">
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, true)} />
                                {globalBranding.logo ? (
                                    <img src={globalBranding.logo} alt="Logo" className="max-h-16 object-contain group-hover:opacity-80 transition-opacity" />
                                ) : (
                                    <div className="h-12 w-32 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-slate-400 font-bold group-hover:border-indigo-300 transition-colors">
                                        <Camera size={14} className="mb-1 text-slate-300" /> ADD LOGO
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <input className="text-xl md:text-2xl font-black text-slate-900 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300 focus:ring-0" 
                                    placeholder="Business Name"
                                    value={currentStore.name} onChange={e => handleUpdateStore('name', e.target.value)} />
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <input className="border-none px-0 outline-none w-24 bg-transparent placeholder:text-slate-300 focus:ring-0" 
                                        placeholder="Phone" value={currentStore.phone} onChange={e => handleUpdateStore('phone', e.target.value)} />
                                    <span className="text-slate-300">•</span>
                                    <input className="border-none px-0 outline-none flex-1 bg-transparent placeholder:text-slate-300 focus:ring-0" 
                                        placeholder="Email" value={currentStore.email} onChange={e => handleUpdateStore('email', e.target.value)} />
                                </div>
                                <textarea className="text-sm text-slate-500 border-none px-0 outline-none w-full bg-transparent resize-none overflow-hidden h-10 placeholder:text-slate-300 focus:ring-0 mt-1" 
                                    placeholder="Business Address"
                                    value={currentStore.address} onChange={e => handleUpdateStore('address', e.target.value)} />
                                <input className="text-xs font-bold text-slate-400 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300 focus:ring-0" 
                                    placeholder="GSTIN (Optional)" value={currentStore.gstin} onChange={e => handleUpdateStore('gstin', e.target.value)} />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Invoice To.</label>
                            <input className="text-lg font-bold text-slate-800 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-300 focus:ring-0 mb-1" 
                                placeholder="Customer Name"
                                value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})} />
                            <input className="text-sm font-medium text-slate-500 border-none px-0 outline-none w-full bg-transparent placeholder:text-slate-400 focus:ring-0" 
                                placeholder="Customer Phone/Email"
                                value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
                        </div>
                    </div>

                    {/* Right Column: Dark Title Block */}
                    <div className="w-full md:w-[40%] text-white p-6 md:p-8 flex flex-col justify-between" style={{ backgroundColor: '#1e1e1e' }}>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-8" style={{ color: globalBranding.primaryColor }}>Invoice</h1>
                            
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Invoice No.</span>
                                    <span className="font-mono text-sm font-semibold text-white/90">Auto-generated</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Date.</span>
                                    <span className="font-mono text-sm font-semibold text-white/90">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                    <span className="text-xs font-medium text-white/50 uppercase tracking-wider">Due Date.</span>
                                    <span className="font-mono text-sm font-semibold text-white/90">On Receipt</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <div className="flex items-center gap-2 text-xs font-medium text-white/40 cursor-pointer hover:text-white/80 transition-colors bg-white/5 py-1.5 px-3 rounded-full border border-white/10" onClick={() => setShowDomainSelector(true)}>
                                <Pencil size={12} />
                                <span>Domain: {activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ITEMS TABLE */}
                <div className="mb-6">
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-left border-collapse min-w-[600px] border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-white text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: '#1e1e1e', borderRadius: '999px' }}>
                                    <th className="py-3 px-6 rounded-l-full w-[35%]">
                                        {activeDomain === 'hotel' ? 'Service Description' : 'Item Description'}
                                    </th>
                                    
                                    {/* Domain Specific Headers */}
                                    {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                        <th className="py-3 px-2 w-[10%]">HSN</th>
                                    )}
                                    {activeDomain === 'clothing' && (
                                        <>
                                            <th className="py-3 px-2 w-[8%] text-center">Size</th>
                                            <th className="py-3 px-2 w-[10%]">Color</th>
                                        </>
                                    )}
                                    {activeDomain === 'furniture' && (
                                        <th className="py-3 px-2 w-[15%]">Material</th>
                                    )}

                                    <th className="py-3 px-4 text-center w-[10%]">
                                        {activeDomain === 'hotel' ? 'Days/Qty' : 'Qty'}
                                    </th>
                                    <th className="py-3 px-4 text-right w-[15%]">
                                        {activeDomain === 'hotel' ? 'Rate (₹)' : 'Price (₹)'}
                                    </th>
                                    <th className="py-3 px-6 text-right rounded-r-full w-[15%]">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="group transition-colors relative" 
                                        style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : `${globalBranding.primaryColor}10` }}>
                                        <td className="p-0 align-top rounded-l-full overflow-hidden">
                                            <input 
                                                className="w-full h-full min-h-[48px] px-6 py-2 bg-transparent border-none outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400 focus:bg-white/50"
                                                placeholder={activeDomain === 'hotel' ? "e.g., Deluxe Room (Dec 12-14)" : "Item name..."}
                                                value={item.productName || ''}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].productName = e.target.value;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>

                                        {/* Domain Specific Inputs */}
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                            <td className="p-0 align-top">
                                                <input 
                                                    className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600 focus:bg-white/50"
                                                    placeholder="HSN"
                                                    value={item.hsn || ''}
                                                    onChange={e => {
                                                        const newArr = [...items];
                                                        newArr[idx].hsn = e.target.value;
                                                        setItems(newArr);
                                                    }}
                                                />
                                            </td>
                                        )}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <td className="p-0 align-top">
                                                    <select 
                                                        className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm font-bold text-center text-slate-700 cursor-pointer focus:bg-white/50 appearance-none"
                                                        value={item.unit || ''}
                                                        onChange={e => {
                                                            const newArr = [...items];
                                                            newArr[idx].unit = e.target.value;
                                                            setItems(newArr);
                                                        }}
                                                    >
                                                        <option value="" disabled>Size</option>
                                                        <option value="S">S</option>
                                                        <option value="M">M</option>
                                                        <option value="L">L</option>
                                                        <option value="XL">XL</option>
                                                        <option value="XXL">XXL</option>
                                                    </select>
                                                </td>
                                                <td className="p-0 align-top">
                                                    <input 
                                                        className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600 focus:bg-white/50"
                                                        placeholder="Color"
                                                        value={(item as any).color || ''}
                                                        onChange={e => {
                                                            const newArr = [...items];
                                                            (newArr[idx] as any).color = e.target.value;
                                                            setItems(newArr);
                                                        }}
                                                    />
                                                </td>
                                            </>
                                        )}
                                        {activeDomain === 'furniture' && (
                                            <td className="p-0 align-top">
                                                <input 
                                                    className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600 focus:bg-white/50"
                                                    placeholder="Material (e.g., Teak)"
                                                    value={(item as any).material || ''}
                                                    onChange={e => {
                                                        const newArr = [...items];
                                                        (newArr[idx] as any).material = e.target.value;
                                                        setItems(newArr);
                                                    }}
                                                />
                                            </td>
                                        )}

                                        <td className="p-0 align-top">
                                            <input 
                                                type="number"
                                                className="w-full h-full min-h-[48px] px-4 py-2 text-center bg-transparent border-none outline-none font-bold text-slate-700 focus:bg-white/50"
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
                                                className="w-full h-full min-h-[48px] px-4 py-2 text-right bg-transparent border-none outline-none font-bold text-slate-700 focus:bg-white/50"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].unitPrice = Number(e.target.value);
                                                    newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-2 text-right font-black text-slate-900 rounded-r-full">
                                            {item.totalAmount.toLocaleString('en-IN')}
                                            <button 
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
                                                title="Remove Item"
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
                    className="flex w-fit items-center gap-2 px-5 py-2.5 border-2 border-dashed border-slate-200 text-slate-500 rounded-full hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-colors text-sm font-bold mb-10"
                >
                    <Plus size={16} /> Add Line Item
                </button>

                {/* FOOTER TOTALS & SIGNATURE */}
                <div className="flex flex-col md:flex-row justify-between gap-12 mt-8 pt-8 border-t border-slate-100">
                    
                    {/* Left: Terms & Signature */}
                    <div className="flex-1 w-full flex flex-col justify-between">
                        <div className="mb-8">
                            <div className="text-[10px] font-bold text-slate-800 uppercase tracking-widest mb-3">TERMS & CONDITION.</div>
                            <textarea 
                                className="w-full max-w-sm text-sm text-slate-500 bg-transparent border-none resize-none outline-none focus:ring-0 p-0 leading-relaxed"
                                placeholder="Enter terms and conditions here..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={4}
                            />
                        </div>
                        
                        <div className="flex flex-col items-end w-fit">
                            {globalBranding.signatureImage ? (
                                <div className="mb-2 relative w-fit group cursor-pointer">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                                    <img src={globalBranding.signatureImage} alt="Signature" className="h-16 w-auto object-contain pb-1 group-hover:opacity-80 transition-opacity" />
                                    <button onClick={(e) => { e.stopPropagation(); updateSettings({...globalBranding, signatureImage: ''}); }} className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-slate-100 text-red-500 z-20 hover:bg-slate-50"><X size={12}/></button>
                                </div>
                            ) : (
                                <div className="h-16 w-40 mb-2 flex items-center justify-center cursor-pointer group relative overflow-hidden bg-slate-50/50 hover:bg-slate-50 rounded-lg transition-colors border border-dashed border-slate-200">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 flex items-center gap-1 uppercase tracking-wider"><Pencil size={10}/> Add Signature</span>
                                </div>
                            )}
                            <div className="w-48 border-t border-slate-200 pt-2 text-right">
                                <span className="text-xs font-bold text-slate-800">Authorized Signatory</span>
                                <div className="text-[10px] text-slate-500">{currentStore.name}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Totals Box */}
                    <div className="w-full md:w-80">
                        <div className="flex justify-between items-center mb-4 text-sm font-semibold text-slate-600">
                            <span>Sub-Total:</span>
                            <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-sm font-semibold text-slate-600">
                            <span>Tax Vat (18%):</span>
                            <span className="font-bold text-slate-800">₹{Math.round(tax).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4 text-sm font-semibold text-slate-600 group relative">
                            <span className="cursor-pointer border-b border-dashed border-slate-300">Transport:</span>
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                                <span>₹</span>
                                <input type="number" className="w-16 bg-transparent text-right outline-none" value={transportCharges || ''} onChange={e => setTransportCharges(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mb-6 text-sm font-semibold text-slate-600 group relative">
                            <span className="cursor-pointer border-b border-dashed border-slate-300">Discount:</span>
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                                <span>-₹</span>
                                <input type="number" className="w-16 bg-transparent text-right outline-none" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} />
                            </div>
                        </div>
                        
                        <div className="pt-4 flex justify-between items-center border-t border-slate-800">
                            <span className="text-lg font-black text-slate-800">Total:</span>
                            <span className="text-2xl font-black text-slate-900">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* BUSINESS FOOTER BAR */}
                <div className="mt-12 pt-6 border-t-[6px] flex flex-wrap justify-between items-center text-xs font-semibold text-white p-6 rounded-b-2xl shadow-inner gap-4" 
                     style={{ backgroundColor: '#1e1e1e', borderColor: `${globalBranding.primaryColor}` }}>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10">📞</div>
                            <span>{currentStore.phone || '+91 000 000 0000'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10">✉️</div>
                            <span>{currentStore.email || 'yourmail@gmail.com'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/10">📍</div>
                        <span>{currentStore.address ? currentStore.address.substring(0, 40) + '...' : 'Your Business Address Here'}</span>
                    </div>
                </div>
                
                {/* BOTTOM ACTION BAR (Moved from Top) */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-8 mt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setShowBrandingPanel(!showBrandingPanel)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-2 border-dashed"
                            style={{ borderColor: `${globalBranding.primaryColor}50`, color: globalBranding.primaryColor, background: `${globalBranding.primaryColor}08` }}
                        >
                            <span className="w-4 h-4 rounded-full mr-1 shadow-sm" style={{ background: globalBranding.primaryColor }} />
                            Select Theme Color
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                        <div className="relative" onMouseEnter={() => !isDownloadReady && setShowDownloadTooltip(true)} onMouseLeave={() => setShowDownloadTooltip(false)}>
                            <button 
                                onClick={downloadPDF} 
                                disabled={!isDownloadReady}
                                className={`px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${!isDownloadReady ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 shadow-md hover:shadow-lg'}`}
                            >
                                <Download size={16} /> Download
                            </button>
                            {showDownloadTooltip && !isDownloadReady && (
                                <div className="absolute bottom-full mb-2 right-0 w-64 p-3 bg-slate-800 text-white text-xs font-medium rounded-lg shadow-xl animate-in slide-in-from-bottom-2 z-50">
                                    Missing required fields: Add your business name, customer name, and at least 1 priced item to download.
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSaveInvoice}
                            disabled={isSaving}
                            className="px-6 py-3 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                            style={{ background: globalBranding.primaryColor }}
                        >
                            <Save size={16} /> {isSaving ? 'Saving...' : 'Save & Share'}
                        </button>
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
                                <div className="flex gap-4 flex-wrap">

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
