import React from 'react';
import { BrandingSettings } from '@/shared/types/branding';
import { Invoice as InvoiceType, StoreInfo, InvoiceItem } from '@/features/invoices/types/invoice';
import { formatDateForDisplay } from '@/shared/utils/dateUtils';

interface ExtendedInvoiceItem extends InvoiceItem {
  color?: string;
  material?: string;
  size?: string;
}

interface InvoiceTemplateProps {
  invoice: InvoiceType & { templateId?: string };
  settings: BrandingSettings;
  storeInfo: StoreInfo | null;
}

export default function InvoiceTemplate({ invoice, settings, storeInfo }: InvoiceTemplateProps) {
  // --- Robustness & Fallback ---
  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 rounded-3xl text-slate-400">
        <p className="font-bold">No invoice data currently available.</p>
        <p className="text-xs mt-2">Check your connection or selected invoice.</p>
      </div>
    );
  }

  const safeNum = (val: any): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  };

  const calculateItemTotals = (item: InvoiceItem) => {
    const qty = safeNum(item.quantity);
    const price = safeNum(item.unitPrice);
    const taxRate = safeNum(item.taxRate);
    const rawSubtotal = qty * price;
    const taxAmount = (rawSubtotal * taxRate) / 100;
    const totalAmount = rawSubtotal + taxAmount;
    return { rawSubtotal, taxAmount, totalAmount };
  };

  const items = (invoice.items || []) as ExtendedInvoiceItem[];
  const subtotal =
    items.length > 0
      ? items.reduce((sum, item) => sum + safeNum(item.unitPrice) * safeNum(item.quantity), 0)
      : safeNum(invoice.subtotal);

  const totalTax = items.reduce((sum, item) => {
    const { taxAmount } = calculateItemTotals(item);
    return sum + taxAmount;
  }, 0);

  const discount = safeNum(invoice.discountTotal);
  const transport = safeNum(invoice.transportCharges);
  const calculatedGrandTotal = subtotal + totalTax + transport - discount;
  const total = safeNum(invoice.grandTotal) || calculatedGrandTotal;

  const activeDomain = settings.domain || 'general';
  const brandColor = settings.primaryColor || '#e53e3e';

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = [
      '',
      '',
      'Twenty',
      'Thirty',
      'Forty',
      'Fifty',
      'Sixty',
      'Seventy',
      'Eighty',
      'Ninety',
    ];
    const teens = [
      'Ten',
      'Eleven',
      'Twelve',
      'Thirteen',
      'Fourteen',
      'Fifteen',
      'Sixteen',
      'Seventeen',
      'Eighteen',
      'Nineteen',
    ];
    const n = Math.round(num);
    if (n === 0) return 'Zero';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + numberToWords(n % 100) : '')
      );
    if (n < 100000)
      return (
        numberToWords(Math.floor(n / 1000)) +
        ' Thousand' +
        (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
      );
    if (n < 10000000)
      return (
        numberToWords(Math.floor(n / 100000)) +
        ' Lakh' +
        (n % 100000 ? ' ' + numberToWords(n % 100000) : '')
      );
    return (
      numberToWords(Math.floor(n / 10000000)) +
      ' Crore' +
      (n % 10000000 ? ' ' + numberToWords(n % 10000000) : '')
    );
  };

  const logoSizeMap = { small: 'h-10', medium: 'h-14', large: 'h-18' };

  const templateType = invoice.templateId || 'standard';

  const qtyLabel =
    activeDomain === 'freelance' ? 'HOURS' : activeDomain === 'hotel' ? 'NIGHTS' : 'QTY';
  const priceLabel =
    activeDomain === 'freelance' ? 'RATE/HR' : activeDomain === 'hotel' ? 'RATE/NIGHT' : 'PRICE';

  // --- MINIMALIST TEMPLATE ---
  if (templateType === 'minimalist') {
    return (
        <div
          style={{
            width: '210mm',
            margin: '0 auto',
            backgroundColor: '#fff',
            minHeight: '297mm',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            fontFamily: '"Aptos", sans-serif',
          }}
        >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: `2px solid #eaeaea`,
            paddingBottom: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: 900, color: '#111', marginBottom: '8px' }}>
              INVOICE
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
              <strong>No:</strong> {invoice.invoiceNumber || 'INV-0001'}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
              <strong>Date:</strong> {formatDateForDisplay(invoice.date)}
            </div>
          </div>

          <div
            style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Logo"
                style={{ height: '44px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: '#111', fontWeight: 900, fontSize: '22px' }}>
                {storeInfo?.name?.toUpperCase() || 'COMPANY'}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                fontSize: '11px',
                color: '#666',
                fontWeight: 500,
              }}
            >
              {/* Store contact info moved to footer */}
            </div>
          </div>

          <div style={{ flex: 1, textAlign: 'right' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                lineHeight: 1.5,
                maxWidth: '180px',
                marginLeft: 'auto',
              }}
            >
              {/* Store address moved to footer */}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div>
            <p
              style={{
                fontSize: '10px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              Invoice To
            </p>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#111', marginBottom: '4px' }}>
              {invoice.customer?.name || 'Customer Name'}
            </h2>
            <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.5 }}>
              {invoice.customer?.address && <div>{invoice.customer.address}</div>}
              {invoice.customer?.phone && <div>{invoice.customer.phone}</div>}
              {invoice.customer?.email && <div>{invoice.customer.email}</div>}
              {invoice.customer?.gstin && <div>GSTIN: {invoice.customer.gstin}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {settings.website && (
              <>
                <p
                  style={{
                    fontSize: '10px',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '8px',
                  }}
                >
                  Website
                </p>
                <div style={{ fontSize: '11px', color: '#555', fontWeight: 600 }}>
                  {settings.website}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
              marginBottom: '24px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th
                  style={{
                    padding: '12px 0',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                  }}
                >
                  Item Description
                </th>
                <th
                  style={{
                    padding: '12px 0',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    width: '60px',
                  }}
                >
                  {qtyLabel}
                </th>
                <th
                  style={{
                    padding: '12px 0',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    width: '80px',
                  }}
                >
                  {priceLabel}
                </th>
                <th
                  style={{
                    padding: '12px 0',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    width: '90px',
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const { rawSubtotal, taxAmount, totalAmount } = calculateItemTotals(item);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '14px 0', color: '#111' }}>
                      <div style={{ fontWeight: 500 }}>{item.productName}</div>
                      {item.taxRate > 0 && (
                        <div style={{ color: '#999', fontSize: '9px', marginTop: '2px' }}>
                          Includes {item.taxRate}% GST
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'center', color: '#444' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '14px 0', textAlign: 'right', color: '#444' }}>
                      ₹
                      {safeNum(item.unitPrice).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td
                      style={{
                        padding: '14px 0',
                        textAlign: 'right',
                        color: '#111',
                        fontWeight: 600,
                      }}
                    >
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '250px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  fontSize: '11px',
                  color: '#555',
                }}
              >
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {discount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    fontSize: '11px',
                    color: '#16a34a',
                  }}
                >
                  <span>Discount</span>
                  <span>- ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {transport > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    fontSize: '11px',
                    color: '#555',
                  }}
                >
                  <span>Transport</span>
                  <span>₹{transport.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    fontSize: '11px',
                    color: '#555',
                  }}
                >
                  <span>Tax (GST)</span>
                  <span>
                    ₹{Math.round(totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#111',
                  borderTop: '2px solid #111',
                  marginTop: '4px',
                }}
              >
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '40px',
            borderTop: '1px solid #eaeaea',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ maxWidth: '60%' }}>
            {invoice.notes && (
              <p style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>
                <strong>Notes:</strong> {invoice.notes}
              </p>
            )}
            {settings.termsAndConditions && (
              <p style={{ fontSize: '10px', color: '#888' }}>
                <strong>Terms:</strong> {settings.termsAndConditions}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {settings.signatureImage ? (
              <img
                src={settings.signatureImage}
                alt="Signature"
                style={{ height: '40px', marginBottom: '4px', objectFit: 'contain' }}
              />
            ) : (
              /* Blank signing space */
              <div style={{ height: '40px', marginBottom: '4px' }} />
            )}
            {settings.signatureText && (
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#111', marginBottom: '2px' }}>
                {settings.signatureText}
              </div>
            )}
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#555' }}>
              {settings.signatureTitle || 'Authorized Signatory'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MODERN TEMPLATE ---
  if (templateType === 'modern') {
    return (
      <div
        style={{
          width: '210mm',
          margin: '0 auto',
          backgroundColor: '#f8fafc',
          minHeight: '297mm',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Aptos", sans-serif',
        }}
      >
        <div style={{ display: 'flex', height: '100%', flex: 1 }}>
          {/* Sidebar Left */}
          <div
            style={{
              width: '35%',
              backgroundColor: brandColor,
              color: '#ffffff',
              padding: '40px 30px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Logo"
                style={{
                  height: '50px',
                  objectFit: 'contain',
                  marginBottom: '40px',
                  filter: 'brightness(0) invert(1)',
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  marginBottom: '40px',
                  letterSpacing: '1px',
                }}
              >
                {storeInfo?.name?.toUpperCase() || 'COMPANY'}
              </div>
            )}

            <div style={{ marginBottom: '40px' }}>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                }}
              >
                From
              </p>
              <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                {storeInfo?.ownerName || storeInfo?.name}
              </p>
              {/* Store contact info moved to footer */}
            </div>

            <div style={{ marginBottom: '40px' }}>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                }}
              >
                Invoice To
              </p>
              <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>
                {invoice.customer?.name || 'Customer Name'}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                {invoice.customer?.address}
                <br />
                {invoice.customer?.phone}
                <br />
                {invoice.customer?.email}
                <br />
                {invoice.customer?.gstin && `GSTIN: ${invoice.customer.gstin}`}
              </p>
            </div>

            <div style={{ marginTop: 'auto' }}>
              {settings.website && (
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                  {settings.website}
                </p>
              )}
            </div>
          </div>

          {/* Main Content Right */}
          <div
            style={{
              width: '65%',
              padding: '40px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                marginBottom: '30px',
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '4px',
                  }}
                >
                  Invoice #{invoice.invoiceNumber || 'INV-0001'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Date: {formatDateForDisplay(invoice.date)}
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11px',
                  marginBottom: '30px',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                    <th
                      style={{
                        padding: '12px 0',
                        textAlign: 'left',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      DESCRIPTION
                    </th>
                    <th
                      style={{
                        padding: '12px 0',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {qtyLabel}
                    </th>
                    <th
                      style={{
                        padding: '12px 0',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      {priceLabel}
                    </th>
                    <th
                      style={{
                        padding: '12px 0',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const { rawSubtotal, taxAmount, totalAmount } = calculateItemTotals(item);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 0', color: '#334155' }}>
                          <div style={{ fontWeight: 600 }}>{item.productName}</div>
                          {item.taxRate > 0 && (
                            <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '4px' }}>
                              GST: {item.taxRate}%
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '16px 0',
                            textAlign: 'center',
                            color: '#475569',
                            fontWeight: 500,
                          }}
                        >
                          {item.quantity}
                        </td>
                        <td
                          style={{
                            padding: '16px 0',
                            textAlign: 'right',
                            color: '#475569',
                            fontWeight: 500,
                          }}
                        >
                          ₹
                          {safeNum(item.unitPrice).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          style={{
                            padding: '16px 0',
                            textAlign: 'right',
                            color: '#0f172a',
                            fontWeight: 700,
                          }}
                        >
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div
                style={{
                  marginLeft: 'auto',
                  width: '220px',
                  backgroundColor: '#f8fafc',
                  padding: '20px',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    fontSize: '11px',
                    color: '#475569',
                  }}
                >
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {discount > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      fontSize: '11px',
                      color: '#10b981',
                    }}
                  >
                    <span>Discount</span>
                    <span style={{ fontWeight: 600 }}>
                      - ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {transport > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                      fontSize: '11px',
                      color: '#475569',
                    }}
                  >
                    <span>Transport</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      ₹{transport.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {totalTax > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      fontSize: '11px',
                      color: '#475569',
                    }}
                  >
                    <span>Tax</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      ₹{Math.round(totalTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                    borderTop: '2px solid #e2e8f0',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: brandColor,
                  }}
                >
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: '30px',
              }}
            >
              <div style={{ maxWidth: '60%' }}>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '6px',
                  }}
                >
                  Thank you!
                </p>
                {invoice.notes && (
                  <p style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>
                    {invoice.notes}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                {settings.signatureImage ? (
                  <img
                    src={settings.signatureImage}
                    alt="Signature"
                    style={{ height: '40px', objectFit: 'contain' }}
                  />
                ) : (
                  /* Blank signing space */
                  <div style={{ height: '40px' }} />
                )}
                <div
                  style={{
                    width: '100px',
                    height: '1px',
                    backgroundColor: '#cbd5e1',
                    margin: '4px auto',
                  }}
                />
                {settings.signatureText && (
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                    {settings.signatureText}
                  </div>
                )}
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                  {settings.signatureTitle || 'Authorized Signatory'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD TEMPLATE ---
  return (
    <div
      style={{
        width: '210mm',
        margin: '0 auto',
        backgroundColor: '#fff',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Aptos", sans-serif',
      }}
    >
      {/* ── TOP HEADER BAR ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '32px 28px',
          borderBottom: `4px solid ${brandColor}`,
        }}
      >
        {/* Logo Section */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" style={{ height: '64px', objectFit: 'contain' }} />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: brandColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '28px' }}>
                {storeInfo?.name?.[0]?.toUpperCase() || 'C'}
              </span>
            </div>
          )}
          <div>
            <div
              style={{ color: '#1e293b', fontWeight: 900, fontSize: '28px', letterSpacing: '-1px' }}
            >
              {storeInfo?.name?.toUpperCase() || 'COMPANY'}
            </div>
            {storeInfo?.gstin && (
              <div
                style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}
              >
                GSTIN: {storeInfo.gstin}
              </div>
            )}
          </div>
        </div>

        {/* Invoice Title aligned to right */}
        <div style={{ textAlign: 'right' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 900,
              color: brandColor,
              margin: 0,
              lineHeight: 1,
              letterSpacing: '-2px',
            }}
          >
            INVOICE
          </h1>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#64748b', marginTop: '4px' }}>
            #{invoice.invoiceNumber || 'INV-0001'}
          </div>
        </div>
      </div>

      {/* ── INVOICE TO + INVOICE INFO ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '24px 28px 20px 28px',
          gap: '32px',
        }}
      >
        {/* Invoice To */}
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: brandColor,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '6px',
            }}
          >
            Invoice To:
          </p>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 900,
              color: '#1a1a2e',
              marginBottom: '4px',
              lineHeight: 1.2,
            }}
          >
            {invoice.customer?.name || 'Customer Name'}
          </h2>
          {invoice.customer?.gstin && (
            <p style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
              GSTIN: {invoice.customer.gstin}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              fontSize: '11px',
              color: '#555',
              lineHeight: '1.5',
            }}
          >
            {invoice.customer?.phone && <span>Phone: {invoice.customer.phone}</span>}
            {invoice.customer?.email && <span>Email: {invoice.customer.email}</span>}
            {invoice.customer?.address && <span>Address: {invoice.customer.address}</span>}
          </div>

          {settings.paymentDetails && (
            <div style={{ marginTop: '16px' }}>
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--brand-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}
              >
                Payment Method
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '11px',
                  color: '#444',
                  lineHeight: '1.5',
                }}
              >
                <p style={{ whiteSpace: 'pre-wrap' }}>{settings.paymentDetails}</p>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Info Right aligned */}
        <div>
          <table style={{ fontSize: '11px', borderCollapse: 'collapse', minWidth: '220px' }}>
            <tbody>
              <tr>
                <td
                  style={{
                    color: '#666',
                    fontWeight: 600,
                    paddingBottom: '4px',
                    paddingRight: '16px',
                    textAlign: 'right',
                  }}
                >
                  Invoice No:
                </td>
                <td style={{ fontWeight: 700, color: '#1a1a2e', textAlign: 'right' }}>
                  {invoice.invoiceNumber || 'INV-0001'}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    color: '#666',
                    fontWeight: 600,
                    paddingRight: '16px',
                    textAlign: 'right',
                  }}
                >
                  Invoice Date:
                </td>
                <td style={{ fontWeight: 700, color: '#1a1a2e', textAlign: 'right' }}>
                  {formatDateForDisplay(invoice.date)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ITEMS TABLE ────────────────────────────────────── */}
      <div style={{ padding: '0 28px', flex: 1 }}>
        <table
          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', lineHeight: '1.4' }}
        >
          <thead>
            <tr style={{ backgroundColor: brandColor, color: '#ffffff' }}>
              <th
                style={{
                  padding: '12px 10px',
                  textAlign: 'center',
                  width: '36px',
                  fontWeight: 900,
                }}
              >
                NO.
              </th>
              <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 900 }}>
                ITEM DESCRIPTION
              </th>
              {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                <th
                  style={{
                    padding: '9px 8px',
                    textAlign: 'center',
                    width: '60px',
                    fontWeight: 800,
                  }}
                >
                  HSN
                </th>
              )}
              {activeDomain === 'clothing' && (
                <>
                  <th
                    style={{
                      padding: '9px 8px',
                      textAlign: 'center',
                      width: '50px',
                      fontWeight: 800,
                    }}
                  >
                    SIZE
                  </th>
                  <th
                    style={{
                      padding: '9px 8px',
                      textAlign: 'center',
                      width: '60px',
                      fontWeight: 800,
                    }}
                  >
                    COLOR
                  </th>
                </>
              )}
              {activeDomain === 'furniture' && (
                <th
                  style={{
                    padding: '9px 8px',
                    textAlign: 'center',
                    width: '70px',
                    fontWeight: 800,
                  }}
                >
                  MATERIAL
                </th>
              )}
              <th
                style={{
                  padding: '9px 10px',
                  textAlign: 'right',
                  width: '70px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                {priceLabel}
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  textAlign: 'center',
                  width: '40px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                {qtyLabel}
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  textAlign: 'right',
                  width: '80px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                }}
              >
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const { totalAmount } = calculateItemTotals(item);
              return (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: idx % 2 === 1 ? '#fafafa' : '#fff',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <td
                    style={{ padding: '10px', textAlign: 'center', color: '#555', fontWeight: 600 }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '10px', color: '#222', fontWeight: 600 }}>
                    {item.productName}
                    {item.taxRate > 0 && (
                      <span style={{ color: '#999', fontSize: '10px', marginLeft: '6px' }}>
                        ({item.taxRate}% GST)
                      </span>
                    )}
                  </td>
                  {(activeDomain === 'furniture' || activeDomain === 'clothing') && (
                    <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      {item.hsn || '-'}
                    </td>
                  )}
                  {activeDomain === 'clothing' && (
                    <>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                        {item.unit || '-'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                        {item.color || '-'}
                      </td>
                    </>
                  )}
                  {activeDomain === 'furniture' && (
                    <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                      {item.material || '-'}
                    </td>
                  )}
                  <td
                    style={{ padding: '10px', textAlign: 'right', color: '#555', fontWeight: 600 }}
                  >
                    ₹{safeNum(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    style={{ padding: '10px', textAlign: 'center', color: '#222', fontWeight: 700 }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: '10px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#1a1a2e',
                      fontSize: '12px',
                    }}
                  >
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── FOOTER: THANKS + TERMS (LEFT) / TOTALS (RIGHT) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '16px 28px',
          gap: '32px',
          marginTop: '8px',
        }}
      >
        {/* Left: Thank you + Notes + Terms */}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 900, fontSize: '14px', color: '#1a1a2e', marginBottom: '10px' }}>
            Thank you for business with us.
          </p>
          {invoice.notes && (
            <div style={{ marginBottom: '8px' }}>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '3px',
                }}
              >
                Notes
              </p>
              <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.5 }}>{invoice.notes}</p>
            </div>
          )}
          {settings.termsAndConditions && (
            <div>
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: brandColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '3px',
                }}
              >
                Terms & Conditions:
              </p>
              <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.5 }}>
                {settings.termsAndConditions}
              </p>
            </div>
          )}
        </div>

        {/* Right: Totals Box */}
        <div style={{ minWidth: '200px' }}>
          <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#666', fontWeight: 600 }}>Subtotal:</span>
              <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {discount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#666', fontWeight: 600 }}>Discount:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>
                  - ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {transport > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#666', fontWeight: 600 }}>Transport:</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  ₹{transport.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {totalTax > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: '#666', fontWeight: 600 }}>Tax (GST):</span>
                <span style={{ fontWeight: 700, color: '#1a1a2e' }}>
                  ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: brandColor,
                padding: '14px 16px',
                borderRadius: '12px',
                marginTop: '8px',
              }}
            >
              <span
                style={{
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '14px',
                  textTransform: 'uppercase',
                }}
              >
                Total Amount
              </span>
              <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '20px' }}>
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIGNATURE ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '16px 28px 24px',
        }}
      >
        <div>
          {settings.signatureImage ? (
            <img
              src={settings.signatureImage}
              alt="Signature"
              style={{ height: '50px', marginBottom: '6px', objectFit: 'contain' }}
            />
          ) : (
            /* Blank space for physical signature — intentionally left empty */
            <div style={{ height: '48px', marginBottom: '4px' }} />
          )}
          <div
            style={{ width: '160px', height: '1px', backgroundColor: '#ccc', marginBottom: '5px' }}
          />
          {settings.signatureText && (
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#1a1a2e', marginBottom: '2px' }}>
              {settings.signatureText}
            </p>
          )}
          <p style={{ fontSize: '10px', color: '#888', fontWeight: 600 }}>
            {settings.signatureTitle || 'Authorized Signatory'}
          </p>
        </div>

        {/* Amount in words */}
        <div style={{ textAlign: 'right', maxWidth: '250px' }}>
          <p
            style={{
              fontSize: '9px',
              fontWeight: 800,
              color: '#aaa',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '3px',
            }}
          >
            Amount in Words
          </p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a1a2e', fontStyle: 'italic' }}>
            {numberToWords(total)} Only
          </p>
        </div>
      </div>

      {/* ── REDESIGNED FOOTER: ICON BASED ────────────────────── */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: `2px solid #eee`,
          padding: '24px 28px',
          backgroundColor: '#fcfcfd',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {storeInfo?.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>📞</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {storeInfo.phone}
              </span>
            </div>
          )}
          {storeInfo?.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>✉</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {storeInfo.email}
              </span>
            </div>
          )}
          {storeInfo?.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>📍</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e' }}>
                {storeInfo.address}
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 0.5,
            fontSize: '12px',
          }}
        >
          <span>Generated by {storeInfo?.name || 'InvoicePro'}</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
