import React, { useState, useEffect } from 'react';
import { Download, Shield, Plus, Trash2, Camera, Pencil, Save, X, Palette, Eye, User, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
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
        const saved = sessionStorage.getItem(getDraftKey('items')) || sessionStorage.getItem('guest_demo_items');
        return saved ? JSON.parse(saved) : [
            { id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 },
        ];
    });
    
    const [customer, setCustomer] = useState<{name: string, mobile: string, email: string, address: string}>(() => {
        if(typeof window === 'undefined') return { name: '', mobile: '', email: '', address: '' };
        const saved = sessionStorage.getItem(getDraftKey('customer')) || sessionStorage.getItem('guest_demo_customer');
        return saved ? JSON.parse(saved) : { name: '', mobile: '', email: '', address: '' };
    });
    
    const [customerMatches, setCustomerMatches] = useState<any[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    
    // --- State: Product Recall ---
    const [productMatches, setProductMatches] = useState<any[]>([]);
    const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
    
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
    
    // --- State: Invoice Metadata ---
    const [invoiceNumber, setInvoiceNumber] = useState(() => {
        if(typeof window === 'undefined') return `INV-${Date.now().toString().slice(-6)}`;
        const saved = sessionStorage.getItem(getDraftKey('inv_no'));
        return saved || `INV-${Date.now().toString().slice(-6)}`;
    });
    const [invoiceDate, setInvoiceDate] = useState(() => {
        if(typeof window === 'undefined') return new Date().toISOString().split('T')[0];
        const saved = sessionStorage.getItem(getDraftKey('inv_date'));
        return saved || new Date().toISOString().split('T')[0];
    });
    const [dueDate, setDueDate] = useState(() => {
        if(typeof window === 'undefined') return '';
        const saved = sessionStorage.getItem(getDraftKey('due_date'));
        return saved || '';
    });
    const [showDomainSelector, setShowDomainSelector] = useState(false);
    const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    
    // --- Derived ---
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const grandTotal = subtotal + tax + Number(transportCharges) - Number(discount);
    
    const currentStore = globalStore || { name: '', address: '', phone: '', email: '', gstin: '' };
    const activeDomain = globalBranding.domain || 'general';

    const isDownloadReady = Boolean(
        (globalStore?.name || currentStore.name)?.trim() &&
        customer.name?.trim() &&
        items.length > 0 &&
        items.every(i => {
            const basic = i.productName?.trim() && i.quantity > 0 && i.unitPrice > 0;
            const hsnRequired = (activeDomain === 'furniture' || activeDomain === 'clothing') ? Boolean(i.hsn?.trim()) : true;
            return basic && hsnRequired;
        })
    );

    // --- Sync State ---
    useEffect(() => {
        if(typeof window === 'undefined') return;
        sessionStorage.setItem(getDraftKey('items'), JSON.stringify(items));
        sessionStorage.setItem(getDraftKey('customer'), JSON.stringify(customer));
        sessionStorage.setItem(getDraftKey('notes'), notes);
        sessionStorage.setItem(getDraftKey('charges'), transportCharges.toString());
        sessionStorage.setItem(getDraftKey('discount'), discount.toString());
        sessionStorage.setItem(getDraftKey('inv_no'), invoiceNumber);
        sessionStorage.setItem(getDraftKey('inv_date'), invoiceDate);
        sessionStorage.setItem(getDraftKey('due_date'), dueDate);
    }, [items, customer, notes, transportCharges, discount, invoiceNumber, invoiceDate, dueDate, user]);

    const brandColor = globalBranding.primaryColor || '#0f172a';
    const accentColor = brandColor + '15'; // ~8% opacity

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
        await updateStoreInfo({...(globalStore || {id:'guest', name: '', phone: '', email: '', address: '', state: 'Bihar', gstin: ''}), [key]: val});
    };

    // --- Actions ---
    const handleSaveInvoice = async () => {
        setIsSaving(true);
        try {
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
                invoiceNumber: invoiceNumber,
                date: invoiceDate,
                dueDate: dueDate,
                customer: { 
                    name: customer.name || 'Walk-in Customer', 
                    phone: customer.mobile,
                    email: customer.email,
                    address: customer.address 
                },
                items: serializedItems, subtotal, taxTotal: tax, discountTotal: discount,
                grandTotal, transportCharges, notes,
                createdAt: new Date().toISOString()
            };

            if (!user) {
                // For guests, we save to sessionStorage (as draft) before prompting for registration
                sessionStorage.setItem('bill_guest_mode', 'true');
                await dbSaveInvoice(invoice);
                setSaveAlertOpen(true);
                return;
            }
            
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
            invoiceNumber: invoiceNumber,
            date: invoiceDate,
            dueDate: dueDate,
            customer: { 
                name: customer.name || 'Walk-in Customer', 
                phone: customer.mobile,
                email: customer.email,
                address: customer.address
            },
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

    const handlePreviewPDF = () => {
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
            invoiceNumber: invoiceNumber,
            date: invoiceDate,
            dueDate: dueDate,
            customer: { 
                name: customer.name || 'Walk-in Customer', 
                phone: customer.mobile,
                email: customer.email,
                address: customer.address
            },
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
        
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPreviewModal(true);
    };

    if (brandingLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">Loading Builder...</div>;

    const DomainSelectorModal = () => (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-2xl font-black text-slate-800">Choose Business Type</h3>
                    {sessionStorage.getItem('domain_prompted_once') && (
                        <button onClick={() => setShowDomainSelector(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                        { id: 'furniture', icon: '🛋️', name: 'Furniture', desc: 'Adds HSN, Material' },
                        { id: 'clothing', icon: '👕', name: 'Clothing', desc: 'Adds Size, Color' },
                        { id: 'hotel', icon: '🏨', name: 'Hotel', desc: 'Adds Room, Days' }
                    ].map(d => (
                        <button 
                            key={d.id}
                            onClick={async () => {
                                await updateSettings({...globalBranding, domain: d.id as any});
                                setShowDomainSelector(false);
                                toast.success(`${d.name} template applied`);
                            }}
                            className={`p-4 rounded-xl border-2 text-center transition-all hover:bg-slate-50 ${activeDomain === d.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}
                            style={activeDomain === d.id ? { borderColor: brandColor, backgroundColor: `${brandColor}10` } : {}}
                        >
                            <span className="text-3xl mb-2 block">{d.icon}</span>
                            <div className="font-bold text-slate-800 text-sm mb-1">{d.name}</div>
                            <div className="text-[10px] text-slate-500">{d.desc}</div>
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowDomainSelector(false)} className="w-full py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors">
                    Close
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto user-theme" style={{ fontFamily: 'var(--font-family)' }}>
            {showDomainSelector && <DomainSelectorModal />}
            
              {/* Decorative Background Shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-40" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)', backgroundColor: accentColor }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none opacity-40" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)', backgroundColor: accentColor }} />

            {/* The Main Invoice Sheet */}
            <div className="w-full relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] rounded-2xl bg-white text-slate-800 overflow-hidden border border-slate-100 flex flex-col pt-0" style={{ minHeight: '1100px' }}>
                
                {/* Top Geometric Accent (Top Right) */}
                <div className="absolute top-0 right-0 w-[300px] h-[300px] pointer-events-none overflow-hidden z-0">
                    <div className="absolute -top-10 -right-10 w-full h-full">
                        <div className="absolute top-10 right-0 w-48 h-48 rotate-[35deg] opacity-90" style={{ backgroundColor: accentColor }}></div>
                        <div className="absolute top-2 right-12 w-40 h-40 border-2 rotate-[15deg]" style={{ borderColor: accentColor }}></div>
                        <div className="absolute top-32 right-32 w-12 h-12 rounded-full" style={{ backgroundColor: accentColor + '66' }}></div>
                    </div>
                </div>

                {/* Bottom Geometric Accent (Bottom Left) */}
                <div className="absolute bottom-16 left-0 w-[300px] h-[200px] pointer-events-none overflow-hidden z-0">
                    <div className="absolute -bottom-10 -left-10 w-full h-full">
                        <div className="absolute bottom-10 left-0 w-48 h-48 -rotate-[15deg] opacity-90" style={{ backgroundColor: accentColor }}></div>
                        <div className="absolute bottom-4 left-16 w-44 h-44 border-2 rotate-[10deg]" style={{ borderColor: accentColor }}></div>
                        <div className="absolute bottom-20 left-10 w-32 h-32 -rotate-12" style={{ backgroundColor: accentColor + '4d' }}></div>
                    </div>
                </div>

                {/* INVOICE HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start relative z-10">
                    <div className="pl-6 md:pl-16 pt-8 md:pt-12 flex flex-col">
                        {/* Logo Section */}
                        <div className="mb-10 group relative">
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, true)} />
                            <div className="flex items-start gap-4 mb-2">
                                {globalBranding.logo ? (
                                    <img src={globalBranding.logo} alt="Logo" className="max-h-16 object-contain" />
                                ) : (
                                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                        <div className="w-3.5 h-3.5 rounded-full border-[2.5px]" style={{ borderColor: brandColor }}></div>
                                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: brandColor }}></div>
                                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: brandColor }}></div>
                                        <div className="w-3.5 h-3.5 rounded-full border-[2.5px]" style={{ borderColor: brandColor }}></div>
                                    </div>
                                )}
                                <div>
                                    <input 
                                        className="font-extrabold text-3xl tracking-tight leading-none bg-transparent border-none outline-none w-full"
                                        placeholder="Design Studio"
                                        value={currentStore.name} 
                                        onChange={e => handleUpdateStore('name', e.target.value)} 
                                    />
                                    <input 
                                        className="text-[11px] text-slate-500 tracking-[0.3em] uppercase mt-2 bg-transparent border-none outline-none w-full"
                                        placeholder="Your Tagline Here"
                                        value={globalBranding.tagline || ''} 
                                        onChange={e => updateSettings({...globalBranding, tagline: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Billing Info */}
                        <div className="mb-8 pr-6 md:pr-0">
                            <h3 className="font-bold text-base mb-3 tracking-wide text-slate-900">Invoice To.</h3>
                            <input 
                                className="text-3xl md:text-5xl font-extrabold mb-6 bg-transparent border-none outline-none w-full tracking-tight text-slate-900 placeholder:text-slate-100"
                                placeholder="Customer Name"
                                value={customer.name} 
                                onChange={e => setCustomer({...customer, name: e.target.value})} 
                            />
                            <div className="text-slate-500 text-[15px] leading-relaxed space-y-1 relative">
                                <div className="flex items-center gap-2 group">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }}></span>
                                    <input 
                                        className="bg-transparent border-none outline-none w-full placeholder:text-slate-200"
                                        placeholder="+039 123 456 7890"
                                        value={customer.mobile} 
                                        onChange={async (e) => {
                                            const val = e.target.value;
                                            setCustomer({...customer, mobile: val});
                                            if (val.length >= 3) {
                                                const { searchCustomers } = await import('@/shared/utils/storage');
                                                const matches = await searchCustomers(val);
                                                setCustomerMatches(matches);
                                                setShowCustomerDropdown(true);
                                            } else {
                                                setShowCustomerDropdown(false);
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                    />
                                    {showCustomerDropdown && customerMatches.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                            {customerMatches.map((c) => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => {
                                                        setCustomer({
                                                            name: c.name,
                                                            mobile: c.phone || '',
                                                            email: c.email || '',
                                                            address: c.address || ''
                                                        });
                                                        setShowCustomerDropdown(false);
                                                        toast.success(`Loaded: ${c.name}`);
                                                    }}
                                                    className="w-full px-5 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{c.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{c.phone} • {c.email || 'No Email'}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }}></span>
                                    <textarea 
                                        className="bg-transparent border-none outline-none w-full placeholder:text-slate-200 resize-none"
                                        placeholder="Customer Address"
                                        rows={2}
                                        value={customer.address} 
                                        onChange={e => setCustomer({...customer, address: e.target.value})} 
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentColor }}></span>
                                    <input 
                                        className="bg-transparent border-none outline-none w-full placeholder:text-slate-200"
                                        placeholder="customer@email.com"
                                        value={customer.email} 
                                        onChange={e => setCustomer({...customer, email: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Title Box */}
                    <div className="bg-slate-900 text-white w-full md:w-[600px] pt-12 md:pt-16 pb-16 md:pb-20 px-8 md:px-16 relative z-10 rounded-none md:rounded-bl-[120px]" data-purpose="invoice-header-box" style={{ backgroundColor: brandColor }}>
                        <h2 className="text-6xl md:text-8xl font-bold mb-12 tracking-tight">Invoice</h2>
                        <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] font-bold gap-4">
                            <div>
                                <p className="opacity-60 mb-2">Invoice No.</p>
                                <input 
                                    className="bg-transparent border-none outline-none text-white text-sm w-full font-bold"
                                    value={invoiceNumber}
                                    placeholder="#003879"
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <p className="opacity-60 mb-2">Date.</p>
                                <input 
                                    type="date"
                                    className="bg-transparent border-none outline-none text-white text-sm w-full font-bold [color-scheme:dark]"
                                    value={invoiceDate}
                                    onChange={e => setInvoiceDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <p className="opacity-60 mb-2">Due Date.</p>
                                <input 
                                    type="date"
                                    className="bg-transparent border-none outline-none text-white text-sm w-full font-bold [color-scheme:dark]"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* ITEMS TABLE */}
                <section className="px-6 md:px-16 pt-12 flex-grow relative z-10">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-white text-[13px] font-bold" style={{ backgroundColor: brandColor }}>
                                    <th className="py-4 px-6 text-center rounded-l-full w-24">Qty</th>
                                    <th className="py-4 px-6 text-left">Item Description</th>
                                    {(activeDomain === 'furniture' || activeDomain === 'clothing') && <th className="py-4 px-2 w-24 border-l border-white/10 text-center">HSN</th>}
                                    {activeDomain === 'clothing' && (
                                        <>
                                            <th className="py-4 px-2 w-20 border-l border-white/10 text-center">Size</th>
                                            <th className="py-4 px-2 w-20 border-l border-white/10 text-center">Color</th>
                                        </>
                                    )}
                                    {activeDomain === 'furniture' && <th className="py-4 px-2 w-28 border-l border-white/10 text-center">Material</th>}
                                    <th className="py-4 px-6 text-right w-32 border-l border-white/10">Price</th>
                                    <th className="py-4 px-10 text-right rounded-r-full w-40">Total</th>
                                </tr>
                            </thead>
                            <tbody className="text-[15px] text-slate-800">
                                <tr className="h-6"></tr>
                                {items.map((item, idx) => (
                                    <tr key={item.id} className={`font-semibold group transition-all ${idx % 2 !== 0 ? 'bg-template-accent' : ''}`}
                                        style={{ backgroundColor: idx % 2 !== 0 ? accentColor : 'transparent' }}>
                                        <td className="py-4 px-6 text-center rounded-l-full">
                                            <input 
                                                type="number"
                                                className="w-full text-center bg-transparent border-none outline-none font-bold"
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].quantity = Number(e.target.value);
                                                    newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="py-4 px-6 relative">
                                            <input 
                                                className="w-full bg-transparent border-none outline-none font-bold placeholder:text-slate-100"
                                                placeholder="Item Name"
                                                value={item.productName}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].productName = e.target.value;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                            <td className="py-4 px-2 text-center border-l border-slate-100">
                                                <input 
                                                    className="w-full text-center bg-transparent border-none outline-none font-medium text-slate-500 placeholder:text-slate-100"
                                                    placeholder="HSN"
                                                    value={item.hsn}
                                                    onChange={async (e) => {
                                                        const val = e.target.value;
                                                        const newArr = [...items];
                                                        newArr[idx].hsn = val;
                                                        setItems(newArr);
                                                        if (val.length >= 2) {
                                                            const { searchProducts } = await import('@/shared/utils/storage');
                                                            const matches = await searchProducts(val);
                                                            setProductMatches(matches);
                                                            setActiveRowIdx(idx);
                                                        } else {
                                                            setActiveRowIdx(null);
                                                        }
                                                    }}
                                                    onBlur={() => setTimeout(() => setActiveRowIdx(null), 200)}
                                                />
                                            </td>
                                        )}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <td className="py-4 px-2 text-center border-l border-slate-100">
                                                    <input 
                                                        className="w-full text-center bg-transparent border-none outline-none font-medium text-slate-600 placeholder:text-slate-100"
                                                        placeholder="Size"
                                                        value={item.unit || ''}
                                                        onChange={e => {
                                                            const newArr = [...items];
                                                            newArr[idx].unit = e.target.value;
                                                            setItems(newArr);
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-4 px-2 text-center border-l border-slate-100">
                                                    <input 
                                                        className="w-full text-center bg-transparent border-none outline-none font-medium text-slate-600 placeholder:text-slate-100"
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
                                            <td className="py-4 px-2 text-center border-l border-slate-100">
                                                <input 
                                                    className="w-full text-center bg-transparent border-none outline-none font-medium text-slate-600 placeholder:text-slate-100"
                                                    placeholder="Material"
                                                    value={(item as any).material || ''}
                                                    onChange={e => {
                                                        const newArr = [...items];
                                                        (newArr[idx] as any).material = e.target.value;
                                                        setItems(newArr);
                                                    }}
                                                />
                                            </td>
                                        )}
                                        <td className="py-4 px-6 text-right border-l border-slate-100">
                                            <input 
                                                type="number"
                                                className="w-full text-right bg-transparent border-none outline-none font-bold text-slate-500"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={e => {
                                                    const newArr = [...items];
                                                    newArr[idx].unitPrice = Number(e.target.value);
                                                    newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                    setItems(newArr);
                                                }}
                                            />
                                        </td>
                                        <td className="py-4 px-10 text-right rounded-r-full whitespace-nowrap">
                                            ₹{item.totalAmount.toLocaleString('en-IN')}
                                            <button 
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                className="ml-4 p-1.5 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button 
                        onClick={() => setItems([...items, { id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }])}
                        className="mt-6 flex items-center gap-2 px-6 py-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-900 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest"
                    >
                        <Plus size={14} /> Add New Item
                    </button>
                </section>

                {/* FINANCIAL SUMMARY */}
                <section className="px-6 md:px-16 py-12 flex justify-end items-start relative z-10">
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-[15px]">Sub-Total:</span>
                            <span className="font-semibold text-[15px]">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-200">
                            <span className="text-slate-500 text-[15px]">Tax Vat ({(activeDomain === 'furniture' || activeDomain === 'clothing') ? 'GST' : '15%'}):</span>
                            <span className="font-semibold text-[15px]">₹{tax.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-900 font-bold text-2xl">Total:</span>
                            <span className="font-black text-3xl">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </section>

                {/* TERMS & SIGNATURE */}
                <section className="px-6 md:px-16 pb-16 flex flex-col md:flex-row justify-between items-end mt-auto relative z-10 gap-10">
                    <div className="w-full md:w-1/2">
                        <h4 className="font-bold text-base mb-3 text-slate-900">Terms & Condition.</h4>
                        <textarea 
                            className="text-[12px] text-slate-500 leading-relaxed w-full bg-transparent border-none outline-none resize-none placeholder:text-slate-100"
                            placeholder="Please make the payment within 10 days..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <div className="text-center w-full md:w-auto relative group">
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                        {globalBranding.signatureImage ? (
                            <div className="relative inline-block mb-3">
                                <img src={globalBranding.signatureImage} alt="Signature" className="h-16 mx-auto opacity-80" />
                                <button onClick={(e) => { e.stopPropagation(); updateSettings({...globalBranding, signatureImage: ''}); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white z-20 opacity-0 group-hover:opacity-100"><X size={10}/></button>
                            </div>
                        ) : (
                            <div className="font-signature text-5xl mb-3 text-slate-800 opacity-80" style={{ fontFamily: 'Homemade Apple, cursive' }}>
                                {globalBranding.signatureText || currentStore.name.split(' ')[0] || 'Signature'}
                            </div>
                        )}
                        <div className="h-[2px] w-64 bg-slate-200 mx-auto mb-3"></div>
                        <input 
                            className="font-extrabold text-lg uppercase tracking-tight text-center bg-transparent border-none outline-none w-full"
                            placeholder="Authorized Signatory"
                            value={globalBranding.signatureText || ''} 
                            onChange={e => updateSettings({...globalBranding, signatureText: e.target.value})} 
                        />
                        <p className="text-[13px] text-slate-400 font-medium uppercase tracking-widest mt-1">Authorized Person</p>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="text-white px-6 md:px-16 flex justify-between items-center relative z-10 py-8 mt-4" style={{ backgroundColor: brandColor }}>
                    <div className="text-[13px] font-medium flex flex-wrap justify-between w-full gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                <Phone size={14} />
                            </div>
                            <input 
                                className="bg-transparent border-none outline-none text-white w-32 placeholder:text-white/30"
                                placeholder="Phone"
                                value={currentStore.phone} 
                                onChange={e => handleUpdateStore('phone', e.target.value)} 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                <Mail size={14} />
                            </div>
                            <input 
                                className="bg-transparent border-none outline-none text-white w-48 placeholder:text-white/30"
                                placeholder="Email"
                                value={currentStore.email} 
                                onChange={e => handleUpdateStore('email', e.target.value)} 
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                <Globe size={14} />
                            </div>
                            <input 
                                className="bg-transparent border-none outline-none text-white w-40 placeholder:text-white/30"
                                placeholder="Website"
                                value={globalBranding.website || ''} 
                                onChange={e => updateSettings({...globalBranding, website: e.target.value})} 
                            />
                        </div>
                        <div className="flex items-center gap-3 hidden lg:flex">
                            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                                <MapPin size={14} />
                            </div>
                            <input 
                                className="bg-transparent border-none outline-none text-white w-64 placeholder:text-white/30"
                                placeholder="Address"
                                value={currentStore.address} 
                                onChange={e => handleUpdateStore('address', e.target.value)} 
                            />
                        </div>
                    </div>
                </footer>
            </div>

            {/* ACTION BUTTONS (Moved Below Invoice) */}
            <div className="w-full flex flex-col items-center justify-center gap-4 mt-16 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative z-20">
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                        onClick={() => setShowBrandingPanel(!showBrandingPanel)}
                        className="px-6 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all border-2 border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm text-slate-700 w-full sm:w-auto"
                    >
                        <Palette size={18} className="text-slate-400" />
                        Select Brand Color
                    </button>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <button 
                            onClick={handlePreviewPDF}
                            disabled={!isDownloadReady}
                            className={`px-8 py-3.5 bg-slate-100 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all min-w-max ${!isDownloadReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white shadow-sm hover:shadow'}`}
                        >
                            <Eye size={18} /> Preview Invoice
                        </button>
                        
                        <div className="relative min-w-max" onMouseEnter={() => !isDownloadReady && setShowDownloadTooltip(true)} onMouseLeave={() => setShowDownloadTooltip(false)}>
                            <button 
                                onClick={downloadPDF} 
                                disabled={!isDownloadReady}
                                className={`px-8 py-3.5 bg-slate-900 border-2 border-slate-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${!isDownloadReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl'}`}
                            >
                                <Download size={18} /> Download .PDF
                            </button>
                            {showDownloadTooltip && !isDownloadReady && (
                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-red-600 text-white text-xs font-bold rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 z-50 text-center">
                                    Complete invoice before downloading (Missing names or items)
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSaveInvoice}
                            disabled={isSaving}
                            className="px-8 py-3.5 text-white border-2 border-transparent rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl disabled:opacity-50 min-w-max"
                            style={{ background: brandColor }}
                        >
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save & Close'}
                        </button>
                    </div>
                </div>
            </div>

            {/* STRICT COLOR PICKER MODAL */}
            {showBrandingPanel && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-xl font-black text-slate-900">Brand Color</h3>
                            <button onClick={() => setShowBrandingPanel(false)} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-full"><X size={20}/></button>
                        </div>
                        
                        <p className="text-slate-500 mb-6 text-sm font-medium">Select a predefined color or pick a custom one to accent your invoice.</p>

                        <div className="flex gap-4 flex-wrap mb-8 justify-center">
                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0f172a', '#ec4899', '#8b5cf6', '#14b8a6'].map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => updateSettings({...globalBranding, primaryColor: c})} 
                                    className="w-10 h-10 rounded-full shadow-md transition-transform hover:scale-110" 
                                    style={{ background: c, outline: brandColor === c ? `3px solid ${c}` : 'none', outlineOffset: 3 }} 
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <label className="text-sm font-bold text-slate-700 flex-1">Custom Color</label>
                            <input 
                                type="color" 
                                value={brandColor} 
                                onChange={(e) => updateSettings({...globalBranding, primaryColor: e.target.value})}
                                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0"
                            />
                        </div>
                        
                        <button onClick={() => setShowBrandingPanel(false)} className="w-full mt-8 py-3.5 text-white rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-lg" style={{ background: brandColor }}>
                            Apply Color
                        </button>
                    </div>
                </div>
            )}

            {/* SAVE INVOICE NATIVE COMPONENT ALERT */}
            {saveAlertOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2" style={{ background: brandColor }} />
                        
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6" style={{ background: `${brandColor}15`, color: brandColor }}>
                            <Shield size={24} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Save Invoice</h3>
                        <p className="text-slate-500 mb-8 font-medium">
                            Create a free account to permanently save this invoice, organize your business, and access it from any device.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    sessionStorage.setItem('guest_mode_bill_branding_settings', JSON.stringify({...globalBranding}));
                                    sessionStorage.setItem('guest_mode_bill_store_info', JSON.stringify(currentStore));
                                    window.location.href = '/register';
                                }}
                                className="w-full py-3.5 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                                style={{ background: brandColor }}
                            >
                                Continue to Save
                            </button>
                            <button 
                                onClick={() => {
                                    sessionStorage.setItem('guest_mode_bill_branding_settings', JSON.stringify({...globalBranding}));
                                    sessionStorage.setItem('guest_mode_bill_store_info', JSON.stringify(currentStore));
                                    window.location.href = '/login';
                                }}
                                className="w-full py-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-all"
                            >
                                Login
                            </button>
                        </div>
                        
                        <button onClick={() => setSaveAlertOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* FULL SCREEN PDF PREVIEW MODAL */}
            {showPreviewModal && pdfPreviewUrl && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: `${brandColor}15`, color: brandColor }}>
                                    <Eye size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">Document Preview</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Final PDF Output</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={downloadPDF} 
                                    className="px-6 py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-md"
                                    style={{ background: brandColor }}
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button 
                                    onClick={() => setShowPreviewModal(false)} 
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-50 relative p-4 sm:p-8" style={{ minHeight: 0 }}>
                            <iframe 
                                src={pdfPreviewUrl || undefined} 
                                className="w-full h-full rounded-xl shadow-lg border border-slate-200 bg-white" 
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
