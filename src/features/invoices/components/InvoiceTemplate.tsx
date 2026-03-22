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

  return (
    <div
      className="bg-white"
      style={{
        fontFamily: fontFamilyMap[settings.fontFamily] || fontFamilyMap.inter,
        color: '#1e293b',
        width: '210mm',
        minHeight: '297mm',
        padding: '12mm 15mm',
        margin: '0 auto',
        fontSize: '10pt',
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex-1 pr-6">
            <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2 tracking-wide" style={{ color: settings.primaryColor }}>
              {storeInfo?.name?.toUpperCase() || 'YOUR COMPANY'}
            </h1>
            <div className="text-slate-600 text-sm space-y-1">
              <p className="whitespace-pre-line">{storeInfo?.address || 'Company Address'}</p>
              {storeInfo?.phone && <p>Phone: {storeInfo.phone}</p>}
              {storeInfo?.email && <p>Email: {storeInfo.email}</p>}
              {storeInfo?.gstin && <p className="font-semibold mt-1 text-slate-800">GSTIN: {storeInfo.gstin}</p>}
              {storeInfo?.authDistributors && <p className="text-xs italic mt-2">{storeInfo.authDistributors}</p>}
            </div>
          </div>
          
          <div className="flex flex-col items-end text-right">
            <h2 className="text-4xl font-light text-slate-300 tracking-widest uppercase mb-4">
              {storeInfo?.gstin ? 'TAX INVOICE' : 'INVOICE'}
            </h2>
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Company Logo"
                className={`object-contain mb-4 ${logoSizeMap[settings.logoSize] || 'h-16'}`}
                style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
              />
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-auto">
              <div className="text-slate-500 font-medium">Invoice No:</div>
              <div className="font-semibold text-slate-900">{invoice.invoiceNumber || 'NEW'}</div>
              <div className="text-slate-500 font-medium">Date:</div>
              <div className="font-semibold text-slate-900">{formatDateForDisplay(invoice.date) || '-'}</div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 mb-8"></div>

        {/* Bill To Section */}
        <div className="mb-10">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-3">Bill To</h3>
          <div className="text-sm space-y-1">
            <p className="font-bold text-lg text-slate-900">{invoice.customer?.name || 'Walk-in Customer'}</p>
            {invoice.customer?.address && <p className="text-slate-600 max-w-sm">{invoice.customer.address}</p>}
            {invoice.customer?.phone && <p className="text-slate-600">Phone: {invoice.customer.phone}</p>}
            {invoice.customer?.gstin && <p className="font-semibold text-slate-800 mt-1">GSTIN: {invoice.customer.gstin}</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900">
                <th className="py-3 px-1 font-semibold w-12 text-center">#</th>
                <th className="py-3 px-2 font-semibold">Item Description</th>
                <th className="py-3 px-2 font-semibold text-center w-20">HSN</th>
                <th className="py-3 px-2 font-semibold text-center w-16">Qty</th>
                <th className="py-3 px-2 font-semibold text-right w-24">Rate</th>
                {isSameState ? (
                  <th className="py-3 px-2 font-semibold text-right w-24">GST</th>
                ) : (
                  <th className="py-3 px-2 font-semibold text-right w-24">IGST</th>
                )}
                <th className="py-3 px-2 font-semibold text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((item, index) => {
                const amount = item.totalAmount || (item as any).amount || 0;
                const taxAmount = (amount * item.taxRate) / 100;
                const cgst = isSameState ? taxAmount / 2 : 0;
                const sgst = isSameState ? taxAmount / 2 : 0;
                const igst = !isSameState ? taxAmount : 0;
                const totalAmount = amount + taxAmount;

                return (
                  <tr key={item.id} className="text-slate-700">
                    <td className="py-4 px-1 text-center align-top text-slate-400">{index + 1}</td>
                    <td className="py-4 px-2 align-top">
                      <p className="font-medium text-slate-900">{item.productName || (item as any).name}</p>
                    </td>
                    <td className="py-4 px-2 text-center align-top">{item.hsn || '-'}</td>
                    <td className="py-4 px-2 text-center align-top">{item.quantity}</td>
                    <td className="py-4 px-2 text-right align-top">{(item.unitPrice || (item as any).rate || 0).toLocaleString('en-IN')}</td>
                    {isSameState ? (
                      <td className="py-4 px-2 text-right align-top">
                        {Math.round(taxAmount).toLocaleString('en-IN')} <span className="text-xs text-slate-400 block">{item.taxRate || 18}%</span>
                      </td>
                    ) : (
                      <td className="py-4 px-2 text-right align-top">
                        {Math.round(igst).toLocaleString('en-IN')} <span className="text-xs text-slate-400 block">{item.taxRate || 18}%</span>
                      </td>
                    )}
                    <td className="py-4 px-2 text-right align-top font-semibold text-slate-900">
                      {Math.round(totalAmount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="flex justify-end mb-12">
          <div className="w-1/2">
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex justify-between py-1">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{(invoice.subtotal || subtotal).toLocaleString('en-IN')}</span>
              </div>
              
              {invoice.transportCharges > 0 && (
                <div className="flex justify-between py-1">
                  <span>Transportation Charges</span>
                  <span className="font-medium text-slate-900">{invoice.transportCharges.toLocaleString('en-IN')}</span>
                </div>
              )}

              {Object.keys(taxByRate).length > 0 ? (
                Object.entries(taxByRate).map(([rate, amount]) => (
                  <React.Fragment key={rate}>
                    {isSameState ? (
                      <div className="flex justify-between py-1">
                        <span>GST ({rate}%)</span>
                        <span className="font-medium text-slate-900">{Math.round(amount).toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between py-1">
                        <span>IGST ({rate}%)</span>
                        <span className="font-medium text-slate-900">{Math.round(amount).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </React.Fragment>
                ))
              ) : (
                // Legacy Fallback: If no items, but grandTotal is higher than subtotal, show balance as GST
                (invoice.grandTotal || total) > (subtotal + (invoice.transportCharges || 0) - (invoice.discountTotal || 0)) && (
                   <div className="flex justify-between py-1">
                     <span>GST (Estimated)</span>
                     <span className="font-medium text-slate-900">
                       {Math.round((invoice.grandTotal || total) - (subtotal + (invoice.transportCharges || 0) - (invoice.discountTotal || 0))).toLocaleString('en-IN')}
                     </span>
                   </div>
                )
              )}

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between py-1 text-emerald-600">
                  <span>Discount</span>
                  <span className="font-medium">- {invoice.discountTotal.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between items-end">
                <div className="text-xs text-slate-500 max-w-[150px] uppercase tracking-wide leading-tight">
                  Total Amount <br/>(INR)
                </div>
                <div className="text-2xl font-bold text-slate-900" style={{ color: settings.primaryColor }}>
                  ₹ {(invoice.grandTotal || total).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Formatting Footer */}
        <div className="mt-auto">
          <div className="mb-8">
            <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Amount in Words</h4>
            <p className="text-sm font-medium text-slate-700">{amountInWords}</p>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-8 gap-8">
            <div className="flex-1 space-y-6">
              {(invoice?.notes || settings?.invoiceNotes) && (
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Invoice Notes</h4>
                  <div className="text-xs text-slate-500 space-y-1">
                    {(invoice?.notes || settings.invoiceNotes)?.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              {settings.termsAndConditions && (
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Terms & Conditions</h4>
                  <div className="text-xs text-slate-500 space-y-1">
                    {settings.termsAndConditions.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="text-center min-w-[200px]">
              {settings.showSignature && (
                <div className="flex flex-col items-center">
                  {settings.signatureImage ? (
                     <img
                       src={settings.signatureImage}
                       alt="Signature"
                       className="h-16 mb-2 object-contain"
                       style={{ maxWidth: '160px' }}
                     />
                  ) : (
                    <div className="h-16 mb-2"></div>
                  )}
                  <div className="w-full border-t border-slate-300 pt-2 text-xs font-semibold text-slate-700">
                    {settings.signatureText || `For ${storeInfo?.name || 'Company'}`}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Authorized Signatory</div>
                </div>
              )}
            </div>
          </div>

          {settings.showFooter && (
            <div className="mt-8 text-center text-xs text-slate-400 font-medium">
              {settings.footerText || 'Thank you for your business!'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}