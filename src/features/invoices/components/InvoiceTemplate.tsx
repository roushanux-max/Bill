import React from 'react';
import { BrandingSettings } from '@/shared/types/branding';
import { Invoice as InvoiceType, StoreInfo } from '@/features/invoices/types/invoice';
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

  const totalTax = (invoice.items ?? []).reduce((sum, item) => {
    const amt = item.totalAmount || (item as any).amount || 0;
    return sum + (amt * item.taxRate) / 100;
  }, 0);

  const discount = invoice.discountTotal || 0;
  const calculatedGrandTotal = subtotal + totalTax + (invoice.transportCharges ?? 0) - discount;
  const total = invoice.grandTotal || calculatedGrandTotal;

  const fontFamilyMap: Record<string, string> = {
    inter: 'Inter, sans-serif',
    roboto: 'Roboto, sans-serif',
    lato: 'Lato, sans-serif',
    opensans: '"Open Sans", sans-serif',
    aptos: 'Aptos, sans-serif',
  };

  const activeDomain = settings.domain || 'general';
  const brandColor = settings.primaryColor || '#e53e3e';

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const n = Math.round(num);
    if (n === 0) return 'Zero';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '');
    if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
    if (n < 10000000) return numberToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWords(n % 100000) : '');
    return numberToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '');
  };

  const logoSizeMap = { small: 'h-10', medium: 'h-14', large: 'h-18' };

  return (
    <div
      style={{
        fontFamily: fontFamilyMap[settings.fontFamily] || fontFamilyMap.inter,
        width: '210mm',
        margin: '0 auto',
        backgroundColor: '#fff',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── TOP HEADER BAR ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', padding: '16px 28px', position: 'relative', overflow: 'hidden' }}>
        {/* Dark red arc accent top-right */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', backgroundColor: brandColor, opacity: 0.85 }} />

        {/* Logo + Company Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '18px' }}>{storeInfo?.name?.[0]?.toUpperCase() || 'C'}</span>
            </div>
          )}
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', lineHeight: 1 }}>
              {storeInfo?.name?.toUpperCase() || 'COMPANY'}
            </div>
            {settings.tagline && (
              <div style={{ color: '#aaa', fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
                {settings.tagline}
              </div>
            )}
          </div>
        </div>

        {/* Contact Info Strip */}
        <div style={{ display: 'flex', gap: '20px', zIndex: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {storeInfo?.phone && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#aaa', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Phone</span>
              <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>{storeInfo.phone}</span>
            </div>
          )}
          {storeInfo?.email && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#aaa', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Email</span>
              <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>{storeInfo.email}</span>
            </div>
          )}
          {storeInfo?.address && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '160px' }}>
              <span style={{ color: '#aaa', fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Address</span>
              <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, textAlign: 'right', lineHeight: 1.3 }}>{storeInfo.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── INVOICE TITLE ROW ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '24px 28px 0 28px' }}>
        <div>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#1a1a2e', letterSpacing: '-2px', lineHeight: 1, marginBottom: '12px' }}>INVOICE</h1>
          <table style={{ fontSize: '11px', borderCollapse: 'collapse', minWidth: '220px' }}>
            <tbody>
              <tr>
                <td style={{ color: '#666', fontWeight: 600, paddingBottom: '4px', paddingRight: '16px' }}>Invoice No:</td>
                <td style={{ fontWeight: 700, color: '#1a1a2e' }}>{invoice.invoiceNumber || 'INV-0001'}</td>
              </tr>
              {invoice.dueDate && (
                <tr>
                  <td style={{ color: '#666', fontWeight: 600, paddingBottom: '4px', paddingRight: '16px' }}>Due Date:</td>
                  <td style={{ fontWeight: 700, color: '#1a1a2e' }}>{formatDateForDisplay(invoice.dueDate)}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#666', fontWeight: 600, paddingRight: '16px' }}>Invoice Date:</td>
                <td style={{ fontWeight: 700, color: '#1a1a2e' }}>{formatDateForDisplay(invoice.date)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BILL TO + PAYMENT METHOD ───────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 28px', gap: '32px' }}>
        {/* Bill To */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Invoice To:</p>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1a1a2e', marginBottom: '4px', lineHeight: 1.2 }}>
            {invoice.customer?.name || 'Customer Name'}
          </h2>
          {invoice.customer?.gstin && (
            <p style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>GSTIN: {invoice.customer.gstin}</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: '#555' }}>
            {invoice.customer?.phone && <span>Phone: {invoice.customer.phone}</span>}
            {invoice.customer?.email && <span>Email: {invoice.customer.email}</span>}
            {invoice.customer?.address && <span>Address: {invoice.customer.address}</span>}
          </div>
        </div>

        {/* Payment Method / Store GST */}
        <div style={{ minWidth: '200px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            {settings.paymentDetails ? 'Payment Method' : 'Business Details'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#444' }}>
            {settings.paymentDetails ? (
              <p style={{ lineHeight: 1.5 }}>{settings.paymentDetails}</p>
            ) : (
              <>
                {storeInfo?.gstin && (
                  <>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#777', minWidth: '90px' }}>GST No:</span><span style={{ fontWeight: 700 }}>{storeInfo.gstin}</span></div>
                  </>
                )}
                {settings.website && (
                  <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#777', minWidth: '90px' }}>Website:</span><span style={{ fontWeight: 700 }}>{settings.website}</span></div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ────────────────────────────────────── */}
      <div style={{ padding: '0 28px', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ backgroundColor: brandColor, color: '#fff' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: '36px', fontWeight: 800, letterSpacing: '0.5px' }}>NO.</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 800, letterSpacing: '0.5px' }}>ITEM DESCRIPTION</th>
              {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '60px', fontWeight: 800 }}>HSN</th>
              )}
              {activeDomain === 'clothing' && (
                <>
                  <th style={{ padding: '9px 8px', textAlign: 'center', width: '50px', fontWeight: 800 }}>SIZE</th>
                  <th style={{ padding: '9px 8px', textAlign: 'center', width: '60px', fontWeight: 800 }}>COLOR</th>
                </>
              )}
              {activeDomain === 'furniture' && (
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '70px', fontWeight: 800 }}>MATERIAL</th>
              )}
              <th style={{ padding: '9px 10px', textAlign: 'right', width: '70px', fontWeight: 800, letterSpacing: '0.5px' }}>PRICE</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', width: '40px', fontWeight: 800, letterSpacing: '0.5px' }}>QTY.</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', width: '80px', fontWeight: 800, letterSpacing: '0.5px' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((item, idx) => {
              const amt = item.totalAmount || (item as any).amount || 0;
              const taxAmt = (amt * item.taxRate) / 100;
              const rowTotal = amt + taxAmt;
              return (
                <tr key={item.id} style={{ backgroundColor: idx % 2 === 1 ? '#fafafa' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#555', fontWeight: 600 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '10px', color: '#222', fontWeight: 600 }}>
                    {item.productName || (item as any).name}
                    {item.taxRate > 0 && (
                      <span style={{ color: '#999', fontSize: '10px', marginLeft: '6px' }}>({item.taxRate}% GST)</span>
                    )}
                  </td>
                  {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                    <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{item.hsn || '-'}</td>
                  )}
                  {activeDomain === 'clothing' && (
                    <>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{(item as any).unit || (item as any).size || '-'}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{(item as any).color || '-'}</td>
                    </>
                  )}
                  {activeDomain === 'furniture' && (
                    <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{(item as any).material || '-'}</td>
                  )}
                  <td style={{ padding: '10px', textAlign: 'right', color: '#555', fontWeight: 600 }}>
                    ₹{(item.unitPrice || (item as any).rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#222', fontWeight: 700 }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#1a1a2e', fontSize: '12px' }}>
                    ₹{Math.round(rowTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER: THANKS + TERMS (LEFT) / TOTALS (RIGHT) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 28px', gap: '32px', marginTop: '8px' }}>
        {/* Left: Thank you + Notes + Terms */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 900, fontSize: '14px', color: '#1a1a2e', marginBottom: '10px' }}>Thank you for business with us.</p>
          {invoice.notes && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, color: '#444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Notes</p>
              <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.5 }}>{invoice.notes}</p>
            </div>
          )}
          {settings.termsAndConditions && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, color: brandColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Terms & Conditions:</p>
              <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.5 }}>{settings.termsAndConditions}</p>
            </div>
          )}
        </div>

        {/* Right: Totals Box */}
        <div style={{ minWidth: '200px' }}>
          <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
              <span style={{ color: '#666', fontWeight: 600 }}>Subtotal:</span>
              <span style={{ fontWeight: 700, color: '#1a1a2e' }}>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>Discount:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>- ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {invoice.transportCharges > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>Transport:</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>₹{invoice.transportCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {totalTax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px' }}>
                <span style={{ color: '#666', fontWeight: 600 }}>Tax (GST):</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>₹{Math.round(totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: brandColor, padding: '10px 12px', borderRadius: '4px' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px' }}>Total:</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIGNATURE ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '16px 28px 24px' }}>
        <div>
          {settings.signatureImage ? (
            <img src={settings.signatureImage} alt="Signature" style={{ height: '50px', marginBottom: '6px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontFamily: 'Homemade Apple, cursive', fontSize: '28px', color: '#1a1a2e', opacity: 0.8, marginBottom: '4px' }}>
              {settings.signatureText || storeInfo?.name?.split(' ')[0] || 'Signature'}
            </div>
          )}
          <div style={{ width: '160px', height: '1px', backgroundColor: '#ccc', marginBottom: '5px' }} />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#1a1a2e' }}>{settings.signatureText || storeInfo?.name || 'Your Name & Signature'}</p>
          <p style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>Account Manager</p>
        </div>

        {/* Amount in words */}
        <div style={{ textAlign: 'right', maxWidth: '250px' }}>
          <p style={{ fontSize: '9px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Amount in Words</p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a1a2e', fontStyle: 'italic' }}>{numberToWords(total)} Only</p>
        </div>
      </div>

      {/* ── DARK BOTTOM BAR ────────────────────────────────── */}
      <div style={{ marginTop: 'auto', backgroundColor: '#1a1a2e', padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: brandColor, opacity: 0.8 }} />
        <span style={{ color: '#888', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', zIndex: 1 }}>
          Generated by {storeInfo?.name || 'BillPro'}
        </span>
        <span style={{ color: '#555', fontSize: '9px', fontWeight: 600, zIndex: 1 }}>
          {storeInfo?.phone && `${storeInfo.phone}  •  `}{storeInfo?.email}
        </span>
      </div>
    </div>
  );
}