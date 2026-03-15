import { BrandingSettings } from '../types/branding';
import { Invoice as InvoiceType, StoreInfo } from '../types/invoice';

import { getContrastColor } from '../../utils/colorUtils';
import { formatDateForDisplay } from '../utils/dateUtils';

interface InvoiceTemplateProps {
  invoice: InvoiceType;
  settings: BrandingSettings;
  storeInfo: StoreInfo | null;
}

export default function InvoiceTemplate({ invoice, settings, storeInfo }: InvoiceTemplateProps) {
  const subtotal = invoice.items?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  const isSameState = (storeInfo?.state ?? '') === (invoice.customer?.state ?? '');

  const taxByRate = (invoice.items ?? []).reduce((acc, item) => {
    const taxAmount = (item.amount * item.taxRate) / 100;
    if (!acc[item.taxRate]) {
      acc[item.taxRate] = 0;
    }
    acc[item.taxRate] += taxAmount;
    return acc;
  }, {} as Record<number, number>);

  const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0);
  const totalBeforeRoundOff = subtotal + totalTax + (invoice.transportCharges ?? 0) - (invoice.discount ?? 0);
  const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
  const total = Math.round(totalBeforeRoundOff);

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return 'Amount too large';
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
    small: 'h-8 sm:h-12',
    medium: 'h-10 sm:h-16',
    large: 'h-14 sm:h-20',
  };

  const getContrastColor = (hexColor: string) => {
    // Remove the hash if it exists
    const hex = hexColor.replace('#', '');
    // Parse RGB values
    if (hex.length < 6) return '#111827';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate YIQ brightness
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    // Return white for dark backgrounds, dark gray for light backgrounds
    return yiq >= 128 ? '#111827' : '#ffffff';
  };

  const headerTextColor = getContrastColor(settings.primaryColor);

  return (
    <div
      className="bg-white"
      style={{
        fontFamily: fontFamilyMap[settings.fontFamily] || fontFamilyMap.inter,
        color: '#1e293b',
        width: '210mm',
        minHeight: '297mm',
        padding: '10mm',
        margin: '0 auto',
        fontSize: '10pt',
      }}
    >
      <div>
        {/* Top Info Bar */}
        <div className="flex items-stretch border-b" style={{ borderColor: '#e2e8f0' }}>
          {settings.logo && (
            <div className="border-r p-2 flex items-center justify-center" style={{ borderColor: '#e2e8f0', minWidth: '30mm' }}>
              <img
                src={settings.logo}
                alt="Logo"
                className={`object-contain ${logoSizeMap[settings.logoSize] || 'h-12'}`}
                style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          )}
          <div className="flex-1 grid grid-cols-3">
            <div className="border-r p-2 flex items-center" style={{ borderColor: '#e2e8f0' }}>
              {storeInfo?.gstin && <div className="font-semibold">GSTIN No: {storeInfo.gstin}</div>}
            </div>
            <div className="border-r p-2 text-center flex items-center justify-center" style={{ borderColor: '#e2e8f0' }}>
              <div className="font-bold">{storeInfo?.gstin ? 'TAX INVOICE' : 'BILL OF SUPPLY'}</div>
            </div>
            <div className="p-2 text-right flex items-center justify-end">
              {storeInfo?.phone && <div className="font-semibold">Mob:- {storeInfo.phone}</div>}
            </div>
          </div>
        </div>

        {/* Company Name Banner */}
        <div
          className="flex items-center justify-center py-4 px-4 min-h-[14mm]"
          style={{
            backgroundColor: settings.primaryColor,
            color: getContrastColor(settings.primaryColor),
          }}
        >
          <style>{`
            .company-name-banner { color: ${getContrastColor(settings.primaryColor)} !important; }
          `}</style>
          <h1 className="text-2xl font-bold tracking-wide company-name-banner text-center leading-none">
            {storeInfo?.name}
          </h1>
        </div>

        {/* Address and Auth Info */}
        <div className="border-b text-center py-2 px-2" style={{ borderColor: '#e2e8f0' }}>
          <div className="font-medium leading-tight">{storeInfo?.address || 'Address not provided'}</div>
        </div>
        {storeInfo?.authDistributors && (
          <div className="border-b text-center py-2 px-2" style={{ borderColor: '#e2e8f0' }}>
            <div className="leading-tight">{storeInfo.authDistributors}</div>
          </div>
        )}

        {/* Customer and Invoice Details */}
        <div className="grid grid-cols-2 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="border-r p-3" style={{ borderColor: '#e2e8f0' }}>
            <div className="font-semibold mb-2">Party Name & Address:-</div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600 font-medium">Name:</div>
                <div className="font-medium">{invoice.customer?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 font-medium">Address:</div>
                <div className="text-sm leading-tight">{invoice.customer?.address || '—'}</div>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-between mb-2">
              <div>
                <div className="font-semibold mb-1">GSTIN No. {invoice.customer?.gstin}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold mb-1">INVOICE NO:- {invoice.invoiceNumber}</div>
              </div>
            </div>
            <div className="flex justify-between text-right">
              <div className="font-semibold">Invoice Date: -</div>
              <div className="font-medium">{formatDateForDisplay(invoice.date)}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <table className="w-full" style={{ borderColor: '#e2e8f0', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: settings.primaryColor, color: headerTextColor }}>
                <th className="border px-2 py-2 text-left" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '40px' }}>S. No</th>
                <th className="border px-2 py-2 text-left" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', minWidth: '200px' }}>Particulars</th>
                <th className="border px-2 py-2 text-center" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '80px' }}>HSN Code</th>
                <th className="border px-2 py-2 text-center" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '50px' }}>Qty</th>
                <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '80px' }}>Rate</th>
                <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '90px' }}>Amount</th>
                {!isSameState && (
                  <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '80px' }}>
                    IGST{invoice.items[0]?.taxRate || 18}%
                  </th>
                )}
                {isSameState && (
                  <>
                    <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '80px' }}>
                      CGST{(invoice.items[0]?.taxRate || 18) / 2}%
                    </th>
                    <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '80px' }}>
                      SGST{(invoice.items[0]?.taxRate || 18) / 2}%
                    </th>
                  </>
                )}
                <th className="border px-2 py-2 text-right" style={{ borderColor: headerTextColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)', width: '100px' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => {
                const taxAmount = (item.amount * item.taxRate) / 100;
                const cgst = isSameState ? taxAmount / 2 : 0;
                const sgst = isSameState ? taxAmount / 2 : 0;
                const igst = !isSameState ? taxAmount : 0;
                const totalAmount = item.amount + taxAmount;

                return (
                  <tr key={item.id} style={{ borderColor: '#e2e8f0' }}>
                    <td className="border px-2 py-2 align-top" style={{ borderColor: '#e2e8f0' }}>{index + 1}</td>
                    <td className="border px-2 py-2 align-top leading-tight" style={{ borderColor: '#e2e8f0' }}>
                      {item.name}
                    </td>
                    <td className="border px-2 py-2 text-center align-top" style={{ borderColor: '#e2e8f0' }}>{item.hsn}</td>
                    <td className="border px-2 py-2 text-center align-top" style={{ borderColor: '#e2e8f0' }}>
                      {item.quantity}
                    </td>
                    <td className="border px-2 py-2 text-right align-top" style={{ borderColor: '#e2e8f0' }}>
                      {item.rate.toLocaleString('en-IN')}
                    </td>
                    <td className="border px-2 py-2 text-right align-top" style={{ borderColor: '#e2e8f0' }}>
                      {item.amount.toLocaleString('en-IN')}
                    </td>
                    {!isSameState && (
                      <td className="border px-2 py-2 text-right align-top" style={{ borderColor: '#e2e8f0' }}>
                        {Math.round(igst).toLocaleString('en-IN')}
                      </td>
                    )}
                    {isSameState && (
                      <>
                        <td className="border px-2 py-2 text-right align-top" style={{ borderColor: '#e2e8f0' }}>
                          {Math.round(cgst).toLocaleString('en-IN')}
                        </td>
                        <td className="border px-2 py-2 text-right align-top" style={{ borderColor: '#e2e8f0' }}>
                          {Math.round(sgst).toLocaleString('en-IN')}
                        </td>
                      </>
                    )}
                    <td className="border px-2 py-2 text-right align-top font-semibold" style={{ borderColor: '#e2e8f0' }}>
                      {Math.round(totalAmount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}

              {/* Transport Charges Row */}
              <tr style={{ borderColor: '#e2e8f0' }}>
                <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                <td className="border px-2 py-2 font-medium text-left" colSpan={5} style={{ borderColor: '#e2e8f0' }}>
                  Transportation Charges
                </td>
                {!isSameState && (
                  <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                )}
                {isSameState && (
                  <>
                    <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                    <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                  </>
                )}
                <td className="border px-2 py-2 text-right font-semibold" style={{ borderColor: '#e2e8f0' }}>
                  {(invoice.transportCharges || 0).toLocaleString('en-IN')}
                </td>
              </tr>

              {/* Total Row */}
              <tr style={{ borderColor: '#e2e8f0', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                <td className="border px-2 py-2 font-bold" colSpan={5} style={{ borderColor: '#e2e8f0' }}>
                  Total Amount
                </td>
                {!isSameState && (
                  <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                )}
                {isSameState && (
                  <>
                    <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                    <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                  </>
                )}
                <td className="border px-2 py-2 text-right font-bold" style={{ borderColor: '#e2e8f0' }}>
                  {(subtotal + totalTax + (invoice.transportCharges || 0)).toLocaleString('en-IN')}
                </td>
              </tr>



              {/* Overall Discount Row */}
              {invoice.discount > 0 && (
                <tr style={{ borderColor: '#e2e8f0' }}>
                  <td className="border px-2 py-2" style={{ borderColor: '#e2e8f0' }}></td>
                  <td className="border px-2 py-2 font-medium" colSpan={isSameState ? 7 : 6} style={{ borderColor: '#e2e8f0' }}>
                    Overall Discount
                  </td>
                  <td className="border px-2 py-2 text-right text-red-600 font-semibold" style={{ borderColor: '#e2e8f0' }}>
                    - {(invoice.discount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              {/* Amount in Words */}
              <tr style={{ borderColor: '#e2e8f0' }}>
                <td className="border px-2 py-2 font-semibold" colSpan={isSameState ? 8 : 7} style={{ borderColor: '#e2e8f0' }}>
                  {amountInWords}
                </td>
                <td className="border px-2 py-2 text-right font-bold" style={{ borderColor: '#e2e8f0', color: settings.primaryColor, fontSize: '12pt' }}>
                  {total.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and Footer */}
        <div className="grid grid-cols-2 border-t" style={{ borderColor: '#e2e8f0' }}>
          <div className="border-r p-3 space-y-1" style={{ borderColor: '#e2e8f0' }}>
            <div className="font-bold mb-1">Terms and Conditions E. & O. E.</div>
            {(invoice?.notes || settings?.invoiceNotes || '').split('\n').map((line, index) => (
              <div key={index} className="leading-tight">{line}</div>
            ))}
          </div>
          <div className="p-3" style={{ borderColor: '#e2e8f0' }}>
            <div className="mb-12">
              <div className="font-semibold">Receiver's Signature</div>
            </div>
            <div className="text-right mt-12">
              <div className="font-semibold">For:- {storeInfo?.name}</div>
              {settings.showSignature && (
                <>
                  {settings.signatureImage ? (
                    <img
                      src={settings.signatureImage}
                      alt="Signature"
                      className="ml-auto my-2"
                      style={{ height: '50px', maxWidth: '150px', objectFit: 'contain' }}
                    />
                  ) : (
                    <div className="h-[50px] my-2"></div>
                  )}
                  <div className="mt-2 pt-2 border-t inline-block ml-auto" style={{ borderColor: '#e2e8f0', minWidth: '120px' }}>
                    {settings.signatureText || 'Authorised Signatory'}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {settings.showFooter && (
          <div
            className="text-center py-2 border-t"
            style={{ borderColor: '#e2e8f0', color: '#475569' }}
          >
            <div className="leading-tight font-medium">{settings.footerText || 'Thank you for your business!'}</div>
          </div>
        )}
      </div>
    </div>
  );
}