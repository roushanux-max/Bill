import React, { useMemo } from 'react';
import { BrandingSettings } from '@/shared/types/branding';
import { Invoice as InvoiceType, StoreInfo } from '@/features/invoices/types/invoice';

import { getContrastColor } from '@/shared/utils/colorUtils';
import { formatDateForDisplay } from '@/shared/utils/dateUtils';

interface InvoiceTemplateProps {
  invoice: InvoiceType;
  settings: BrandingSettings;
  storeInfo: StoreInfo | null;
}

export default function InvoiceTemplate({ invoice, settings, storeInfo }: InvoiceTemplateProps) {
  const subtotal = (invoice.items && invoice.items.length > 0)
    ? invoice.items.reduce((sum, item) => sum + (item.totalAmount || (item as any).amount || 0), 0)
    : (invoice.subtotal || 0);

  const isSameState = (storeInfo?.state?.toLowerCase() ?? '') === (invoice.customer?.state?.toLowerCase() ?? '');

  const taxByRate = (invoice.items ?? []).reduce((acc, item) => {
    const amt = item.totalAmount || (item as any).amount || 0;
    const taxAmount = (amt * item.taxRate) / 100;
    if (!acc[item.taxRate]) {
      acc[item.taxRate] = 0;
    }
    acc[item.taxRate] += taxAmount;
    return acc;
  }, {} as Record<number, number>);

  const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0);
  const calculatedGrandTotal = Math.round(subtotal + totalTax + (invoice.transportCharges ?? 0) - (invoice.discountTotal ?? 0));
  const total = invoice.grandTotal || calculatedGrandTotal;

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const n = Math.round(num);
    if (n === 0) return 'Zero';
    if (n < 0) return 'Minus ' + numberToWords(Math.abs(n));

    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
    if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
    if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
    return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
  };

  const amountInWords = `${numberToWords(total)} Only`;

  const fontFamilyMap: Record<string, string> = {
    inter: 'Inter, sans-serif',
    roboto: 'Roboto, sans-serif',
    lato: 'Lato, sans-serif',
    opensans: '"Open Sans", sans-serif',
    aptos: 'Aptos, sans-serif',
  };

  const logoSizeMap = {
    small: 'h-10 sm:h-14',
    medium: 'h-14 sm:h-20',
    large: 'h-20 sm:h-28',
  };

  const activeDomain = settings.domain || 'general';
  const brandColor = settings.primaryColor || '#0f172a';
  const accentColor = brandColor + '10'; // Light accent

  return (
    <div 
        className="min-h-[297mm] bg-white relative overflow-hidden font-sans"
        style={{ 
            fontFamily: fontFamilyMap[settings.fontFamily] || fontFamilyMap.inter,
            width: '210mm',
            margin: '0 auto',
            boxShadow: '0 0 40px rgba(0,0,0,0.05)'
        }}
    >
            {/* Background Geometric Accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-60 z-0"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 border-[12px] border-slate-100 rounded-full opacity-40 z-0"></div>
            <div 
                className="absolute top-20 right-20 w-8 h-8 rounded-full opacity-20 z-0"
                style={{ backgroundColor: brandColor }}
            ></div>

            <div className="relative z-10 p-12 flex flex-col min-h-full">
                {/* Header Section */}
                <div className="flex flex-row flex-wrap justify-between items-start gap-8 mb-16 relative">
                    <div className="flex-1 min-w-[300px]">
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" className={`${logoSizeMap[settings.logoSize] || 'h-16'} mb-6 object-contain`} />
                        ) : (
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: brandColor }}>
                                    <span className="text-xl font-black">{storeInfo?.name?.[0]?.toUpperCase() || 'B'}</span>
                                </div>
                                <span className="text-2xl font-black text-slate-800 tracking-tighter italic">
                                    {storeInfo?.name?.split(' ')[0]?.toUpperCase() || 'BILL'}
                                    <span className="text-slate-400 font-light">PRO</span>
                                </span>
                            </div>
                        )}
                        <h1 className="text-3xl font-black text-slate-900 mb-2 break-words">{storeInfo?.name?.toUpperCase() || 'YOUR BUSINESS'}</h1>
                        <p className="text-slate-500 text-sm max-w-sm leading-relaxed whitespace-pre-line break-words">{storeInfo?.address}</p>
                        <div className="mt-4 flex flex-wrap gap-4 text-[11px] font-bold text-slate-400">
                            {storeInfo?.phone && <span className="flex items-center gap-1"> {storeInfo.phone}</span>}
                            {storeInfo?.email && <span className="flex items-center gap-1"> {storeInfo.email}</span>}
                            {storeInfo?.gstin && <span className="text-slate-600">GST: {storeInfo.gstin}</span>}
                        </div>
                    </div>

                    <div className="relative pt-4 flex-shrink-0">
                        <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden min-w-[280px]">
                            {/* Accent within box */}
                            <div 
                                className="absolute top-0 right-0 w-16 h-16 opacity-30 rotate-45 translate-x-8 -translate-y-8"
                                style={{ backgroundColor: brandColor }}
                            ></div>
                            
                            <h2 className="text-5xl font-black tracking-tighter mb-8 italic">INVOICE</h2>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-white/10 pb-2 gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Number</span>
                                    <span className="font-mono text-lg font-bold break-all text-right">{invoice.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Date</span>
                                    <span className="font-bold text-right">{formatDateForDisplay(invoice.date)}</span>
                                </div>
                                {invoice.dueDate && (
                                    <div className="flex justify-between items-center text-rose-400 gap-4">
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 shrink-0">Due</span>
                                        <span className="font-bold text-right">{formatDateForDisplay(invoice.dueDate)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bill To Section */}
                <div className="mb-16">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="w-8 h-px bg-slate-200"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Billed To</span>
                    </div>
                    <div className="flex flex-row flex-wrap justify-between items-end gap-6 pl-10 border-l-2 border-slate-100">
                        <div className="flex-1 min-w-[250px]">
                            <h3 className="text-4xl font-black text-slate-900 leading-tight break-words">
                                {invoice.customer?.name || 'Walk-in Customer'}
                            </h3>
                            <div className="mt-4 flex flex-col gap-1 text-slate-500 font-medium break-words">
                                {invoice.customer?.phone && <p>{invoice.customer.phone}</p>}
                                {invoice.customer?.email && <p>{invoice.customer.email}</p>}
                                {invoice.customer?.address && <p className="max-w-md">{invoice.customer.address}</p>}
                            </div>
                        </div>
                        {invoice.customer?.gstin && (
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shrink-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Customer GST</span>
                                <span className="text-sm font-black text-slate-700">{invoice.customer.gstin}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-12 flex-1">
                    <table className="w-full">
                        <thead>
                            <tr className="text-white text-[11px] font-bold" style={{ backgroundColor: brandColor }}>
                                <th className="py-4 px-6 text-center rounded-l-full w-20">Qty</th>
                                <th className="py-4 px-6 text-left">Description</th>
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
                        <tbody className="divide-y divide-slate-100">
                            {(invoice.items || []).map((item, idx) => {
                                const amount = item.totalAmount || (item as any).amount || 0;
                                const taxAmount = (amount * item.taxRate) / 100;
                                const rowTotal = amount + taxAmount;

                                return (
                                    <tr key={item.id} className={idx % 2 !== 0 ? 'bg-slate-50/50' : ''}>
                                        <td className="py-6 px-6 text-center">
                                            <span className="font-bold text-slate-900">{item.quantity}</span>
                                        </td>
                                        <td className="py-6 px-6">
                                            <p className="font-black text-slate-900 text-lg leading-tight">{item.productName || (item as any).name}</p>
                                        </td>
                                        {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                                            <td className="py-6 px-2 text-center text-slate-500 font-bold border-l border-slate-100">{item.hsn || '-'}</td>
                                        )}
                                        {activeDomain === 'clothing' && (
                                            <>
                                                <td className="py-6 px-2 text-center text-slate-600 font-bold border-l border-slate-100">{(item as any).unit || (item as any).size || '-'}</td>
                                                <td className="py-6 px-2 text-center text-slate-600 font-bold border-l border-slate-100">{(item as any).color || '-'}</td>
                                            </>
                                        )}
                                        {activeDomain === 'furniture' && (
                                            <td className="py-6 px-2 text-center text-slate-600 font-bold border-l border-slate-100">{(item as any).material || '-'}</td>
                                        )}
                                        <td className="py-6 px-6 text-right border-l border-slate-100 font-bold text-slate-500 italic">
                                            ₹{(item.unitPrice || (item as any).rate || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-6 px-10 text-right font-black text-slate-900 text-xl italic">
                                            ₹{Math.round(rowTotal).toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 pt-8 border-t border-slate-100">
                    <div className="flex-1 space-y-8">
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">In Words</span>
                            <p className="text-xl font-black text-slate-800 italic leading-tight">{amountInWords}</p>
                        </div>
                        {invoice.notes && (
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notes</span>
                                <p className="text-sm text-slate-500 leading-relaxed italic">{invoice.notes}</p>
                            </div>
                        )}
                        {settings.termsAndConditions && (
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Terms</span>
                                <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tighter">{settings.termsAndConditions}</p>
                            </div>
                        )}
                    </div>

                    <div className="min-w-[320px] bg-slate-50 rounded-[2rem] p-10 space-y-6">
                        <div className="flex justify-between items-center text-slate-500 font-bold italic">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        {invoice.transportCharges > 0 && (
                            <div className="flex justify-between items-center text-slate-500 font-bold italic">
                                <span>Transport</span>
                                <span>₹{invoice.transportCharges.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-slate-500 font-bold italic">
                            <span>GST (Tax)</span>
                            <span>₹{Math.round(totalTax).toLocaleString('en-IN')}</span>
                        </div>
                        {invoice.discountTotal > 0 && (
                            <div className="flex justify-between items-center text-emerald-600 font-bold italic">
                                <span>Discount</span>
                                <span>- ₹{invoice.discountTotal.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="pt-6 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Total Due</span>
                                <span className="text-5xl font-black text-slate-900 tracking-tighter italic" style={{ color: brandColor }}>
                                    ₹{total.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-12 mt-auto pt-12 border-t border-slate-100">
                    <div className="flex gap-8">
                        <div className="bg-slate-50 p-6 rounded-3xl flex items-center justify-center w-32 h-32 shrink-0 border border-slate-100 opacity-60">
                            <div className="bg-white/60 p-2 rounded-xl">
                                {/* Shield icon as mock QR */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Contact Info</span>
                            <div className="space-y-2 text-sm font-bold text-slate-900">
                                <p>{storeInfo?.phone}</p>
                                <p>{storeInfo?.email}</p>
                                <p>{settings.website || (storeInfo?.name?.toLowerCase().replace(/\s+/g, '') + '.com')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                        <div className="mb-6">
                            {settings.signatureImage ? (
                                <img src={settings.signatureImage} alt="Signature" className="h-20 mb-3 object-contain" />
                            ) : (
                                <div className="text-5xl mb-3 text-slate-800 opacity-80" style={{ fontFamily: 'Homemade Apple, cursive' }}>
                                    {settings.signatureText || storeInfo?.name?.split(' ')[0] || 'Signature'}
                                </div>
                            )}
                            <div className="w-48 h-px bg-slate-900 ml-auto opacity-20"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-2">Authorized Signatory</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
                        Issued by {storeInfo?.name?.toUpperCase() || 'BILLPRO'} Platform
                    </p>
                </div>
            </div>
        </div>
    );
}