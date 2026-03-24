import React, { useState, useEffect } from 'react';
import { Download, Shield, Plus, Trash2, Camera, Pencil, Save, X, Palette, Eye } from 'lucide-react';
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
    }, [items, customer, notes, transportCharges, discount, user]);

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
        await updateStoreInfo({...(globalStore || {id:'guest', name: '', phone: '', email: '', address: '', state: 'Bihar', gstin: ''}), [key]: val});
    };

    // --- Actions ---
    const handleSaveInvoice = async () => {
        if (!user) {
            setSaveAlertOpen(true);
            return;
        }

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
        
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPreviewModal(true);
    };

    if (brandingLoading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">Loading Builder...</div>;

    const brandColor = globalBranding.primaryColor || '#0f172a';

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
        <div className="flex flex-col items-center gap-8 w-full max-w-5xl mx-auto">
            {showDomainSelector && <DomainSelectorModal />}
            
            {/* The Main Invoice Sheet */}
            <div className="w-full relative shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-2xl bg-white text-slate-800 overflow-hidden border border-slate-200" style={{ minHeight: '800px' }}>
                
                {/* INVOICE HEADER */}
                <div className="flex flex-col sm:flex-row justify-between" style={{ backgroundColor: brandColor, color: '#fff' }}>
                    {/* Left: Logo & Business Name */}
                    <div className="p-8 sm:w-1/2 flex flex-col gap-4 relative z-10">
                        <div className="relative inline-block group w-fit h-fit bg-white/10 rounded-xl p-2 transition-colors hover:bg-white/20">
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, true)} />
                            {globalBranding.logo ? (
                                <img src={globalBranding.logo} alt="Logo" className="max-h-20 object-contain" />
                            ) : (
                                <div className="h-16 w-40 flex flex-col items-center justify-center text-xs font-bold text-white/70">
                                    <Camera size={20} className="mb-2" /> ADD LOGO
                                </div>
                            )}
                        </div>
                        <input 
                            className="text-3xl font-black bg-transparent border-none outline-none text-white placeholder:text-white/50 w-full"
                            placeholder="Your Business Name"
                            value={currentStore.name} 
                            onChange={e => handleUpdateStore('name', e.target.value)} 
                        />
                    </div>

                    {/* Right: Invoice Info */}
                    <div className="p-8 sm:w-1/2 flex flex-col justify-end items-end text-right bg-black/10">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white uppercase opacity-90">Invoice</h1>
                        
                        <div className="flex flex-col gap-2 w-full max-w-xs">
                            <div className="flex justify-between items-center border-b border-white/20 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Invoice No</span>
                                <span className="font-mono text-sm font-bold">Auto-generated</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/20 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Date</span>
                                <span className="font-mono text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-white/20 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-white/70">Due Date</span>
                                <span className="font-mono text-sm font-bold">On Receipt</span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-colors" onClick={() => setShowDomainSelector(true)}>
                            <Pencil size={12} />
                            <span>Template: {activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    {/* CUSTOMER SECTION */}
                    <div className="mb-10">
                        <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: brandColor }}>BILL TO</label>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-w-md">
                            <input 
                                className="text-xl font-bold text-slate-800 bg-transparent border-none outline-none w-full placeholder:text-slate-300 mb-2" 
                                placeholder="Customer Name"
                                value={customer.name} 
                                onChange={e => setCustomer({...customer, name: e.target.value})} 
                            />
                            <textarea 
                                className="text-sm font-medium text-slate-500 bg-transparent border-none outline-none w-full resize-none placeholder:text-slate-300" 
                                placeholder="Customer Contact Details (Phone, Email, Address...)"
                                rows={2}
                                value={customer.mobile} 
                                onChange={e => setCustomer({...customer, mobile: e.target.value})} 
                            />
                        </div>
                    </div>

                    {/* ITEMS TABLE */}
                    <div className="mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px] border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <th className="py-2 px-4 w-[10%] text-center">Qty</th>
                                        <th className="py-2 px-4 w-[35%]">{activeDomain === 'hotel' ? 'Service Description' : 'Item Description'}</th>
                                        
                                        {/* Domain Specific Headers */}
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && <th className="py-2 px-2 w-[10%]">HSN</th>}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <th className="py-2 px-2 w-[10%] text-center">Size</th>
                                                <th className="py-2 px-2 w-[10%]">Color</th>
                                            </>
                                        )}
                                        {activeDomain === 'furniture' && <th className="py-2 px-2 w-[15%]">Material</th>}

                                        <th className="py-2 px-4 text-right w-[15%]">Price (₹)</th>
                                        <th className="py-2 px-4 text-right w-[15%]">Total</th>
                                        <th className="w-[5%]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id} className="group transition-colors relative" 
                                            style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : `${brandColor}10` }}>
                                            <td className="p-0 align-top rounded-l-full overflow-hidden">
                                                <input 
                                                    type="number"
                                                    className="w-full h-full min-h-[48px] px-4 py-2 text-center bg-transparent border-none outline-none font-bold text-slate-800"
                                                    placeholder="1"
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
                                                    className="w-full h-full min-h-[48px] px-4 py-2 bg-transparent border-none outline-none font-bold text-slate-800 placeholder:font-normal placeholder:text-slate-400"
                                                    placeholder={activeDomain === 'hotel' ? "Room / Service" : "Description..."}
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
                                                        className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600"
                                                        placeholder="HSN Code (Required)"
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
                                                            className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm font-bold text-center text-slate-700 cursor-pointer appearance-none"
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
                                                            className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600"
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
                                                        className="w-full h-full min-h-[48px] px-2 py-2 bg-transparent border-none outline-none text-sm text-slate-600"
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

                                            <td className="p-0 align-top">
                                                <input 
                                                    type="number"
                                                    className="w-full h-full min-h-[48px] px-4 py-2 text-right bg-transparent border-none outline-none font-bold text-slate-800"
                                                    placeholder="0"
                                                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                    onChange={e => {
                                                        const newArr = [...items];
                                                        newArr[idx].unitPrice = Number(e.target.value);
                                                        newArr[idx].totalAmount = newArr[idx].quantity * newArr[idx].unitPrice;
                                                        setItems(newArr);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right font-black text-slate-900 rounded-r-full">
                                                {item.totalAmount.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-2 text-center align-middle rounded-r-full">
                                                <button 
                                                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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

                    {/* TOTAL SUB-SECTION */}
                    <div className="flex flex-col md:flex-row justify-between gap-8 mt-8 border-t border-slate-200 pt-8">
                        <div className="flex-1 max-w-sm">
                            <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: brandColor }}>NOTES / TERMS</label>
                            <textarea 
                                className="w-full text-sm font-medium text-slate-500 bg-slate-50 border border-slate-100 p-4 rounded-xl resize-none outline-none focus:ring-2 focus:ring-slate-200 placeholder:text-slate-300"
                                placeholder="Enter terms and conditions here..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="w-full md:w-80">
                            <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-500">
                                <span>Sub-Total:</span>
                                <span className="font-bold text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            
                            {(activeDomain === 'furniture' || activeDomain === 'clothing') && tax > 0 ? (
                                <>
                                    <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-500">
                                        <span className="border-b border-dashed border-slate-300">CGST</span>
                                        <span className="font-bold text-slate-800">₹{Math.round(tax / 2).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-500">
                                        <span className="border-b border-dashed border-slate-300">SGST</span>
                                        <span className="font-bold text-slate-800">₹{Math.round(tax / 2).toLocaleString('en-IN')}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-500">
                                    <span className="border-b border-dashed border-slate-300">Tax VAT/GST:</span>
                                    <span className="font-bold text-slate-800">₹{Math.round(tax).toLocaleString('en-IN')}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-3 text-sm font-semibold text-slate-500">
                                <span className="border-b border-dashed border-slate-300 cursor-pointer">Transport:</span>
                                <div className="flex items-center gap-1 font-bold text-slate-800">
                                    <span>₹</span>
                                    <input type="number" className="w-16 bg-slate-50 rounded px-2 text-right outline-none border border-transparent focus:border-slate-200 py-1" value={transportCharges || ''} onChange={e => setTransportCharges(Number(e.target.value))} placeholder="0" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-5 text-sm font-semibold text-slate-500">
                                <span className="border-b border-dashed border-slate-300 cursor-pointer">Discount:</span>
                                <div className="flex items-center gap-1 font-bold text-red-500">
                                    <span>-₹</span>
                                    <input type="number" className="w-16 bg-slate-50 rounded px-2 text-right outline-none border border-transparent focus:border-slate-200 py-1" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-between items-center border-t-2" style={{ borderColor: brandColor }}>
                                <span className="text-sm font-black uppercase tracking-widest" style={{ color: brandColor }}>Total:</span>
                                <span className="text-3xl font-black text-slate-900 border-none outline-none">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* SIGNATURE SECTION */}
                    <div className="flex justify-end mt-12 pt-8 border-t border-slate-100">
                        <div className="flex flex-col items-end">
                            {globalBranding.signatureImage ? (
                                <div className="mb-2 relative w-fit group cursor-pointer border border-transparent hover:border-slate-200 rounded-lg p-2 transition-all">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                                    <img src={globalBranding.signatureImage} alt="Signature" className="h-16 w-auto object-contain" />
                                    <button onClick={(e) => { e.stopPropagation(); updateSettings({...globalBranding, signatureImage: ''}); }} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-md text-white z-20 hover:scale-110 transition-transform"><X size={12}/></button>
                                </div>
                            ) : (
                                <div className="h-16 w-40 mb-2 flex items-center justify-center cursor-pointer group relative overflow-hidden bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-dashed border-slate-300">
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" onChange={(e) => handleImageUpload(e, false)} />
                                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 flex items-center gap-1 uppercase tracking-wider"><Pencil size={10}/> Add Signature</span>
                                </div>
                            )}
                            <div className="w-48 border-t border-slate-300 pt-2 text-center">
                                <span className="text-xs font-bold text-slate-800 tracking-wider">AUTHORIZED SIGNATORY</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BUSINESS FOOTER (Address / Contact) */}
                <div className="border-t border-slate-200 bg-slate-50/50 p-6 flex flex-col sm:flex-row gap-4 justify-between items-center text-sm font-medium text-slate-600">
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full">
                        <input 
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 outline-none placeholder:text-slate-400 w-full sm:w-auto text-center sm:text-left flex-1"
                            placeholder="Business Address"
                            value={currentStore.address} 
                            onChange={e => handleUpdateStore('address', e.target.value)} 
                        />
                        <div className="flex items-center gap-4 text-slate-400 w-full sm:w-auto">
                            <input 
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 outline-none placeholder:text-slate-400 w-32 text-center"
                                placeholder="Phone"
                                value={currentStore.phone} 
                                onChange={e => handleUpdateStore('phone', e.target.value)} 
                            />
                            <span>•</span>
                            <input 
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 outline-none placeholder:text-slate-400 w-48 text-center"
                                placeholder="Email"
                                value={currentStore.email} 
                                onChange={e => handleUpdateStore('email', e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* ACTION BUTTONS (Moved Below Invoice) */}
            <div className="w-full flex flex-col items-center justify-center gap-4 mt-8 bg-white p-6 sm:p-4 rounded-2xl border border-slate-200 shadow-sm relative z-20">
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
                                    sessionStorage.setItem('bill_guest_mode', 'true');
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
                                    sessionStorage.setItem('bill_guest_mode', 'true');
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
                                src={pdfPreviewUrl} 
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
