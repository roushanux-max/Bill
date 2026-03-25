import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { saveInvoice as dbSaveInvoice } from '@/shared/utils/storage';

import IndustrySelectorModal from './IndustrySelectorModal';
import InvoicePreviewModal from './InvoicePreviewModal';

export default function InvoiceForm() {
    const { user } = useAuth();
    const { settings: globalBranding, storeInfo: currentStore, updateSettings } = useBranding();
    const navigate = useNavigate();
    const getDraftKey = (key: string) => user ? `draft_${user.id}_${key}` : `guest_demo_${key}`;

    // --- State: Modals ---
    const [showDomainSelector, setShowDomainSelector] = useState(!globalBranding.domain);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [saveAlertOpen, setSaveAlertOpen] = useState(false); // Can be moved to separate component later
    const [isSaving, setIsSaving] = useState(false);

    const activeDomain = globalBranding.domain || 'general';

    // --- State: Items ---
    const [items, setItems] = useState<any[]>(() => {
        if(typeof window === 'undefined') return [];
        const saved = sessionStorage.getItem(getDraftKey('items'));
        return saved ? JSON.parse(saved) : [{ id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }];
    });
    
    // --- State: Customer ---
    const [customer, setCustomer] = useState<{id?: string, name: string, mobile: string, email: string, address: string}>(() => {
        if(typeof window === 'undefined') return { id: '', name: '', mobile: '', email: '', address: '' };
        const saved = sessionStorage.getItem(getDraftKey('customer'));
        return saved ? JSON.parse(saved) : { id: '', name: '', mobile: '', email: '', address: '' };
    });
    const [customerMatches, setCustomerMatches] = useState<any[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // --- State: Details ---
    const [notes, setNotes] = useState(() => sessionStorage.getItem(getDraftKey('notes')) || 'Thank you for your business.');
    const [transportCharges, setTransportCharges] = useState<number>(() => Number(sessionStorage.getItem(getDraftKey('charges'))) || 0);
    const [discount, setDiscount] = useState<number>(() => Number(sessionStorage.getItem(getDraftKey('discount'))) || 0);

    // --- State: Product Search ---
    const [productMatches, setProductMatches] = useState<any[]>([]);
    const [activeProductIdx, setActiveProductIdx] = useState<number | null>(null);

    // --- State: Metadata ---
    const [invoiceNumber, setInvoiceNumber] = useState(() => sessionStorage.getItem(getDraftKey('inv_no')) || `INV-${Date.now().toString().slice(-6)}`);
    const [invoiceDate, setInvoiceDate] = useState(() => sessionStorage.getItem(getDraftKey('inv_date')) || new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(() => sessionStorage.getItem(getDraftKey('due_date')) || '');
    
    // --- Derived Math ---
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate / 100)), 0);
    const grandTotal = subtotal + tax + Number(transportCharges) - Number(discount);

    // --- Sync ---
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
    }, [items, customer, notes, transportCharges, invoiceNumber, invoiceDate, dueDate, user]);

    // Validation
    const isReady = Boolean(customer.name?.trim() && items.length > 0 && items.every(i => i.productName?.trim() && i.quantity > 0 && i.unitPrice > 0));

    // --- Actions ---
    const getSerializedItems = () => items.map(i => {
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
        id: crypto.randomUUID(),
        invoiceNumber, date: invoiceDate, dueDate,
        store_id: currentStore?.id || 'draft',
        customerId: customer.id || null,
        status: 'unpaid',
        customer: { id: customer.id, name: customer.name || 'Walk-in', phone: customer.mobile, email: customer.email, address: customer.address },
        items: getSerializedItems(),
        subtotal, taxTotal: tax, discountTotal: Number(discount), grandTotal, transportCharges: Number(transportCharges), notes, 
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

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
            {showDomainSelector && <IndustrySelectorModal onClose={() => setShowDomainSelector(false)} canClose={true} />}
            
            {showPreviewModal && (
                <InvoicePreviewModal 
                    invoiceData={{ invoiceNumber, date: invoiceDate, dueDate, customer }}
                    items={getSerializedItems()}
                    subtotal={subtotal} tax={tax} discount={Number(discount)} transportCharges={Number(transportCharges)} grandTotal={grandTotal} notes={notes}
                    onClose={() => setShowPreviewModal(false)}
                    onDownload={handleDownloadPDF}
                />
            )}

            <div className="flex justify-between items-center mb-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Invoice Details</h2>
                    <p className="text-sm text-slate-500">Fill out the structured form data. Changes save automatically.</p>
                </div>
                <button onClick={() => setShowDomainSelector(true)} className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2">
                    <span className="text-xl">{activeDomain === 'furniture' ? '🛋️' : activeDomain === 'clothing' ? '👕' : activeDomain === 'freelance' ? '💻' : activeDomain === 'medical' ? '⚕️' : activeDomain === 'hotel' ? '🏨' : '📝'}</span>
                    Change Industry ({activeDomain})
                </button>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white border text-sm border-slate-200 rounded-3xl shadow-sm p-8">
                
                {/* 1. Header Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pb-10 border-b border-slate-100">
                    <div className="md:col-span-2 relative">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Customer Name *</label>
                        <input 
                            className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-800 outline-none border focus:border-slate-300 transition-colors"
                            placeholder="Type customer name..."
                            value={customer.name} 
                            onChange={async (e) => {
                                const val = e.target.value;
                                setCustomer({...customer, name: val});
                                if (val.trim().length >= 2) {
                                    const { searchCustomers } = await import('@/shared/utils/storage');
                                    setCustomerMatches(await searchCustomers(val));
                                    setShowCustomerDropdown(true);
                                } else setShowCustomerDropdown(false);
                            }}
                            onFocus={() => { if(customerMatches.length > 0) setShowCustomerDropdown(true); }}
                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        />
                        {showCustomerDropdown && customerMatches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50">
                                {customerMatches.map((match) => (
                                    <button
                                        key={match.id}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setCustomer({
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
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Phone Number</label>
                        <input className="w-full bg-slate-50 p-3 rounded-xl border focus:border-slate-300 outline-none transition-colors" placeholder="e.g. +91 9999..." value={customer.mobile} onChange={e => setCustomer({...customer, mobile: e.target.value})} />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Address</label>
                        <input className="w-full bg-slate-50 p-3 rounded-xl border focus:border-slate-300 outline-none transition-colors" placeholder="Billing Address..." value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Invoice No *</label>
                        <input className="w-full bg-slate-50 p-3 font-mono font-bold rounded-xl border-none outline-none" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Issue Date</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Due Date</label>
                        <input type="date" className="w-full bg-slate-50 p-3 rounded-xl border-none outline-none" value={dueDate} onChange={e => setDueDate(e.target.value)} />
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
                                {items.map((item, idx) => (
                                    <tr key={item.id} className="border-b last:border-0 border-slate-100">
                                        <td className="p-3 relative">
                                            <input 
                                                className="w-full bg-slate-50 p-2 rounded-lg outline-none font-semibold text-slate-800" 
                                                placeholder="Product name..." 
                                                value={item.productName} 
                                                onChange={async e => { 
                                                    const val = e.target.value;
                                                    const n = [...items]; 
                                                    n[idx].productName = val; 
                                                    setItems(n); 
                                                    
                                                    if (val.trim().length >= 2) {
                                                        const { searchProducts } = await import('@/shared/utils/storage');
                                                        setProductMatches(await searchProducts(val));
                                                        setActiveProductIdx(idx);
                                                    } else {
                                                        setActiveProductIdx(null);
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (item.productName.trim().length >= 2 && productMatches.length > 0) setActiveProductIdx(idx);
                                                }}
                                                onBlur={() => setTimeout(() => setActiveProductIdx(null), 200)}
                                            />
                                            {activeProductIdx === idx && productMatches.length > 0 && (
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                                                    {productMatches.map((match) => (
                                                        <button
                                                            key={match.id}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                const n = [...items];
                                                                n[idx].productName = match.name;
                                                                n[idx].unitPrice = match.sellingPrice || 0;
                                                                n[idx].taxRate = match.gstRate || 0;
                                                                if (match.hsnCode) n[idx].hsn = match.hsnCode;
                                                                if (match.unit) n[idx].unit = match.unit;
                                                                n[idx].totalAmount = n[idx].quantity * n[idx].unitPrice;
                                                                setItems(n);
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
                                        <td className="p-3 text-center">
                                            <input type="number" className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center font-bold" value={item.quantity || ''} onChange={e => { const n = [...items]; n[idx].quantity = Number(e.target.value); n[idx].totalAmount = n[idx].quantity * n[idx].unitPrice; setItems(n); }} />
                                        </td>
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="HSN" value={item.hsn || ''} onChange={e => { const n = [...items]; n[idx].hsn = e.target.value; setItems(n); }} />
                                            </td>
                                        )}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="L/XL" value={item.unit || ''} onChange={e => { const n = [...items]; n[idx].unit = e.target.value; setItems(n); }} />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Red" value={item.color || ''} onChange={e => { const n = [...items]; n[idx].color = e.target.value; setItems(n); }} />
                                                </td>
                                            </>
                                        )}
                                        {activeDomain === 'furniture' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Wood" value={item.material || ''} onChange={e => { const n = [...items]; n[idx].material = e.target.value; setItems(n); }} />
                                            </td>
                                        )}
                                        {activeDomain === 'freelance' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Website" value={item.project || ''} onChange={e => { const n = [...items]; n[idx].project = e.target.value; setItems(n); }} />
                                            </td>
                                        )}
                                        {activeDomain === 'medical' && (
                                            <>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="Jane Doe" value={item.patient || ''} onChange={e => { const n = [...items]; n[idx].patient = e.target.value; setItems(n); }} />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="C001" value={item.procedure || ''} onChange={e => { const n = [...items]; n[idx].procedure = e.target.value; setItems(n); }} />
                                                </td>
                                            </>
                                        )}
                                        {activeDomain === 'hotel' && (
                                            <td className="p-3 text-center">
                                                <input className="w-full bg-slate-50 p-2 rounded-lg outline-none text-center" placeholder="204" value={item.room || ''} onChange={e => { const n = [...items]; n[idx].room = e.target.value; setItems(n); }} />
                                            </td>
                                        )}
                                        <td className="p-3 text-right">
                                            <input type="number" className="w-full bg-slate-50 p-2 rounded-lg outline-none text-right font-bold text-slate-600" value={item.unitPrice || ''} onChange={e => { const n = [...items]; n[idx].unitPrice = Number(e.target.value); n[idx].totalAmount = n[idx].quantity * n[idx].unitPrice; setItems(n); }} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <select className="w-full bg-slate-50 p-2 rounded-lg outline-none appearance-none text-center font-bold" value={item.taxRate} onChange={e => { const n = [...items]; n[idx].taxRate = Number(e.target.value); setItems(n); }}>
                                                <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-right font-black text-slate-800">
                                            ₹{item.totalAmount.toLocaleString('en-IN')}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={() => setItems([...items, { id: crypto.randomUUID(), productName: '', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }])} className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all text-xs font-bold tracking-wide">
                        <Plus size={16} /> ADD ITEM
                    </button>
                </div>

                {/* 3. Totals & Notes */}
                <div className="flex flex-col md:flex-row justify-between gap-10">
                    <div className="flex-1 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Terms & Notes</label>
                            <textarea className="w-full bg-slate-50 p-4 rounded-xl border focus:border-slate-300 outline-none transition-colors text-slate-600 min-h-[120px]" placeholder="Payment terms..." value={notes} onChange={e => setNotes(e.target.value)} />
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
                                <input type="number" min="0" className="w-full p-2 outline-none text-right font-bold text-slate-800" value={discount === 0 ? '' : discount} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-200/60">
                            <label className="font-bold text-slate-600">Transport/Other (+):</label>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 w-32">
                                <span className="text-slate-400">₹</span>
                                <input type="number" min="0" className="w-full p-2 outline-none text-right font-bold text-slate-800" value={transportCharges === 0 ? '' : transportCharges} onChange={e => setTransportCharges(Number(e.target.value) || 0)} placeholder="0" />
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
                <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-red-400'}`}></div>
                    {isReady ? 'Ready for preview' : 'Missing required fields'}
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={() => setShowPreviewModal(true)}
                        disabled={!isReady}
                        className="flex-1 md:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
