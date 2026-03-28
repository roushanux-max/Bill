import jsPDF from 'jspdf';
import { Invoice, StoreInfo } from '@/features/invoices/types/invoice';
import { BrandingSettings } from '@/shared/types/branding';
import { formatDateForDisplay } from '@/shared/utils/dateUtils';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

function numberToWords(num: number): string {
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
  if (n < 0) return 'Minus ' + numberToWords(Math.abs(n));

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
}

export function generateInvoicePDF(
  invoice: Invoice,
  storeInfo: StoreInfo,
  settings: BrandingSettings
): jsPDF {
  // Safety check for incomplete invoice data
  if (!invoice || !invoice.items || invoice.items.length === 0) {
    throw new Error('Incomplete invoice: Items are required to generate a PDF.');
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const activeDomain = settings.domain || 'general';
  const primary = hexToRgb(settings.primaryColor || '#6366f1');

  // Aesthetic Colors
  const textDark: [number, number, number] = [15, 23, 42]; // slate-900
  const textMid: [number, number, number] = [71, 85, 105]; // slate-600
  const textLight: [number, number, number] = [148, 163, 184]; // slate-400
  const borderLight: [number, number, number] = [226, 232, 240]; // slate-200
  const borderDark: [number, number, number] = [15, 23, 42]; // slate-900
  const accentColorRgb: [number, number, number] = hexToRgb(settings.primaryColor);
  // Create a light version (approx 8% opacity on white)
  const tanAccent: [number, number, number] = [
    Math.round(255 - (255 - accentColorRgb[0]) * 0.08),
    Math.round(255 - (255 - accentColorRgb[1]) * 0.08),
    Math.round(255 - (255 - accentColorRgb[2]) * 0.08),
  ];

  const activeFont = 'helvetica'; // Fallback for Aptos natively in jsPDF

  let y = margin + 5; // Top padding

  // Helpers
  const setFont = (
    style: 'normal' | 'bold' | 'italic',
    size: number,
    color: [number, number, number]
  ) => {
    pdf.setFont(activeFont, style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };

  // 3. INVOICE HEADER BOX
  const headerH = 35;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, headerH, 'F');
  pdf.setDrawColor(...primary);
  pdf.setLineWidth(1.5);
  pdf.line(0, headerH, 210, headerH);

  // Header Content
  let logoX = margin;
  const logoY = 8;
  if (settings.logo) {
    try {
      const imgProps = pdf.getImageProperties(settings.logo);
      const imgRatio = imgProps.width / imgProps.height;
      const finalH = 20;
      const finalW = finalH * imgRatio;
      pdf.addImage(settings.logo, 'PNG', logoX, logoY, finalW, finalH, undefined, 'FAST');
      logoX += finalW + 8;
    } catch (e) {
      console.warn('Failed to add logo image to PDF', e);
    }
  } else {
    pdf.setFillColor(...primary);
    pdf.roundedRect(logoX, logoY, 15, 15, 3, 3, 'F');
    setFont('bold', 14, [255, 255, 255]);
    pdf.text(storeInfo.name?.[0]?.toUpperCase() || 'C', logoX + 7.5, logoY + 10, {
      align: 'center',
    });
    logoX += 20;
  }

  setFont('bold', 20, textDark);
  pdf.text(storeInfo.name?.toUpperCase() || 'COMPANY', logoX, logoY + 10);
  if (storeInfo.gstin) {
    setFont('bold', 8, textMid);
    pdf.text(`GSTIN: ${storeInfo.gstin}`, logoX, logoY + 16);
  }

  // "INVOICE" Title aligned right
  setFont('bold', 34, primary);
  pdf.text('INVOICE', 210 - margin, logoY + 12, { align: 'right', charSpace: -1 });
  // Removed Invoice Date from header as requested

  y = headerH + 15;

  // 4. BOTTOM-LEFT ACCENT (Circle)
  pdf.setDrawColor(...primary);
  pdf.setLineWidth(3);
  pdf.circle(15, 282, 10, 'D');

  // Reset for content
  setFont('normal', 10, textDark);

  if (storeInfo.name) {
    setFont('bold', 18, textDark);
  }

  // Invoice Meta Info (Right side, below banner)
  const rightY = y + 12;

  // Ensure y is below both the left info and the right banner area
  y = Math.max(y + 12, rightY + 5);

  // ── Invoice Details Section ───────────────────────────────────
  pdf.text('INVOICE TO:', margin, y);
  y += 8;
  if (invoice.customer?.name) {
    setFont('bold', 20, textDark);
    const custNameLines = pdf.splitTextToSize(invoice.customer.name, contentW * 0.6);
    pdf.text(custNameLines, margin, y);
    y += custNameLines.length * 9;

    setFont('normal', 11, textMid);
    const contactDetails = [
      invoice.customer.phone,
      invoice.customer.email,
      invoice.customer.gstin ? `GSTIN: ${invoice.customer.gstin}` : null,
    ].filter(Boolean);

    contactDetails.forEach((detail) => {
      pdf.text(detail!, margin, y);
      y += 5;
    });

    if (invoice.customer.address) {
      y += 2;
      const addrLines = pdf.splitTextToSize(invoice.customer.address, contentW * 0.5);
      pdf.text(addrLines, margin, y);
      y += addrLines.length * 5;
    }
  }

  // Status Info Removed as requested

  y = Math.max(y, headerH + 15) + 10;

  // ── Items Table ───────────────────────────────────────────────

  const isSameState = storeInfo.state === invoice.customer?.state;
  const hasAnyHSN = (invoice.items || []).some(
    (item) => item.hsn && item.hsn.trim() !== '' && item.hsn !== '-'
  );
  const hasAnySize = (invoice.items || []).some(
    (item: any) => item.unit && item.unit.trim() !== '' && item.unit !== '-'
  );
  const hasAnyColor = (invoice.items || []).some(
    (item: any) => item.color && item.color.trim() !== '' && item.color !== '-'
  );
  const hasAnyMaterial = (invoice.items || []).some(
    (item: any) => item.material && item.material.trim() !== '' && item.material !== '-'
  );

  const qtyLabel =
    activeDomain === 'freelance'
      ? 'HOURS'
      : activeDomain === 'hotel'
        ? 'NIGHTS'
        : activeDomain === 'water'
          ? 'JARS'
          : activeDomain === 'barber'
            ? 'SVCS'
            : 'QTY';

  const priceLabel =
    activeDomain === 'freelance'
      ? 'RATE/HR'
      : activeDomain === 'hotel'
        ? 'RATE/NIGHT'
        : activeDomain === 'water'
          ? 'RATE/JAR'
          : 'PRICE';

  let cols = [
    { label: qtyLabel, w: 12, align: 'center', id: 'qty' },
    { label: 'ITEM DESCRIPTION', w: 60, align: 'left', id: 'desc' },
    { label: 'HSN', w: 15, align: 'center', id: 'hsn' },
    { label: priceLabel, w: 25, align: 'right', id: 'price' },
    { label: 'GST', w: 20, align: 'right', id: 'gst' },
    { label: 'TOTAL', w: 30, align: 'right', id: 'total' },
  ];

  const hasAnyWarranty = (invoice.items || []).some(
    (item: any) => item.warranty && item.warranty.trim() !== '' && item.warranty !== '-'
  );
  const hasAnySerial = (invoice.items || []).some(
    (item: any) => item.serialNo && item.serialNo.trim() !== '' && item.serialNo !== '-'
  );
  const hasAnyFoodType = (invoice.items || []).some(
    (item: any) => item.foodType && item.foodType.trim() !== '' && item.foodType !== '-'
  );
  const hasAnyBarcode = (invoice.items || []).some(
    (item: any) => item.barcode && item.barcode.trim() !== '' && item.barcode !== '-'
  );
  const hasAnyJarsDue = (invoice.items || []).some(
    (item: any) => item.jarsDue && item.jarsDue.trim() !== '' && item.jarsDue !== '-'
  );
  const hasAnyDeposit = (invoice.items || []).some(
    (item: any) => item.deposit && String(item.deposit).trim() !== '' && item.deposit !== '-'
  );
  const hasAnyStylist = (invoice.items || []).some(
    (item: any) => item.stylist && item.stylist.trim() !== '' && item.stylist !== '-'
  );
  const hasAnyApptTime = (invoice.items || []).some(
    (item: any) =>
      item.appointmentTime && item.appointmentTime.trim() !== '' && item.appointmentTime !== '-'
  );
  const hasAnyProject = (invoice.items || []).some(
    (item: any) => item.project && item.project.trim() !== '' && item.project !== '-'
  );
  const hasAnyPatient = (invoice.items || []).some(
    (item: any) => item.patient && item.patient.trim() !== '' && item.patient !== '-'
  );
  const hasAnyProcedure = (invoice.items || []).some(
    (item: any) => item.procedure && item.procedure.trim() !== '' && item.procedure !== '-'
  );
  const hasAnyRoom = (invoice.items || []).some(
    (item: any) => item.room && item.room.trim() !== '' && item.room !== '-'
  );

  if (hasAnySize) {
    cols.splice(2, 0, { label: 'SIZE', w: 12, align: 'center', id: 'size' });
  }
  if (hasAnyColor) {
    cols.splice(hasAnySize ? 4 : 3, 0, { label: 'COLOR', w: 12, align: 'center', id: 'color' });
  }
  if (hasAnyMaterial) {
    cols.splice(2, 0, { label: 'MATERIAL', w: 24, align: 'center', id: 'material' });
  }
  if (hasAnyWarranty) {
    cols.splice(2, 0, { label: 'WARRANTY', w: 20, align: 'center', id: 'warranty' });
  }
  if (hasAnySerial) {
    cols.splice(2, 0, { label: 'SERIAL NO', w: 24, align: 'center', id: 'serial' });
  }
  if (hasAnyFoodType) {
    cols.splice(2, 0, { label: 'TYPE', w: 20, align: 'center', id: 'foodType' });
  }
  if (hasAnyBarcode) {
    cols.splice(2, 0, { label: 'BARCODE', w: 24, align: 'center', id: 'barcode' });
  }
  if (hasAnyJarsDue) {
    cols.splice(2, 0, { label: 'JARS DUE', w: 18, align: 'center', id: 'jarsDue' });
  }
  if (hasAnyDeposit) {
    cols.splice(2, 0, { label: 'DEPOSIT', w: 18, align: 'center', id: 'deposit' });
  }
  if (hasAnyStylist) {
    cols.splice(2, 0, { label: 'STYLIST', w: 20, align: 'center', id: 'stylist' });
  }
  if (hasAnyApptTime) {
    cols.splice(2, 0, { label: 'TIME', w: 20, align: 'center', id: 'apptTime' });
  }
  if (hasAnyProject) {
    cols.splice(2, 0, { label: 'PROJECT', w: 24, align: 'center', id: 'project' });
  }
  if (hasAnyPatient) {
    cols.splice(2, 0, { label: 'PATIENT', w: 20, align: 'center', id: 'patient' });
  }
  if (hasAnyProcedure) {
    cols.splice(2, 0, { label: 'PROCEDURE', w: 20, align: 'center', id: 'procedure' });
  }
  if (hasAnyRoom) {
    cols.splice(2, 0, { label: 'ROOM', w: 15, align: 'center', id: 'room' });
  }

  if (!hasAnyHSN) {
    cols = cols.filter((c) => c.id !== 'hsn');
  }

  const totalColsW = cols.reduce((sum, c) => sum + c.w, 0);
  const scaleFactor = contentW / totalColsW;
  cols.forEach((c) => (c.w = c.w * scaleFactor));

  // Header Background
  pdf.setFillColor(...primary);
  pdf.roundedRect(margin, y, contentW, 10, 5, 5, 'F');

  setFont('bold', 8, [255, 255, 255]);
  let cx = margin;
  cols.forEach((col) => {
    const tx = cx + (col.align === 'center' ? col.w / 2 : col.align === 'right' ? col.w - 4 : 4);
    pdf.text(col.label, tx, y + 6.5, { align: col.align as any });
    cx += col.w;
  });
  y += 13;

  // Rows
  let cgstTotal = 0,
    sgstTotal = 0,
    igstTotal = 0,
    amountTotal = 0;
  (invoice.items || []).forEach((item, idx) => {
    const amount = item.totalAmount || (item as any).amount || 0;
    const taxAmount = (amount * item.taxRate) / 100;
    const rowTotal = amount + taxAmount;

    amountTotal += amount;
    cgstTotal += isSameState ? taxAmount / 2 : 0;
    sgstTotal += isSameState ? taxAmount / 2 : 0;
    igstTotal += !isSameState ? taxAmount : 0;

    const nameLines = pdf.splitTextToSize(item.productName || 'Item', cols[1].w - 8);
    const rowH = Math.max(10, nameLines.length * 5);

    if (y + rowH > 270) {
      pdf.addPage();
      y = margin + 10;
    }

    // Alternating Highlight
    if (idx % 2 !== 0) {
      pdf.setFillColor(...primary);
      pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
      pdf.roundedRect(margin, y - 2, contentW, rowH, 4, 4, 'F');
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    }

    setFont('bold', 9, textDark);
    let rcx = margin;

    cols.forEach((col) => {
      const tx = rcx + (col.align === 'center' ? col.w / 2 : col.align === 'right' ? col.w - 4 : 4);
      let val = '';

      if (col.id === 'qty') val = String(item.quantity);
      else if (col.id === 'desc')
        val = ''; // Handled separately for multi-line
      else if (col.id === 'hsn') val = item.hsn || '-';
      else if (col.id === 'size') val = item.unit || (item as any).size || '-';
      else if (col.id === 'color') val = (item as any).color || '-';
      else if (col.id === 'material') val = (item as any).material || '-';
      else if (col.id === 'serial') val = (item as any).serialNo || '-';
      else if (col.id === 'warranty') val = (item as any).warranty || '-';
      else if (col.id === 'foodType') val = (item as any).foodType || '-';
      else if (col.id === 'barcode') val = (item as any).barcode || '-';
      else if (col.id === 'jarsDue') val = (item as any).jarsDue || '-';
      else if (col.id === 'deposit')
        val = (item as any).deposit ? String((item as any).deposit) : '-';
      else if (col.id === 'stylist') val = (item as any).stylist || '-';
      else if (col.id === 'apptTime') val = (item as any).appointmentTime || '-';
      else if (col.id === 'project') val = (item as any).project || '-';
      else if (col.id === 'patient') val = (item as any).patient || '-';
      else if (col.id === 'procedure') val = (item as any).procedure || '-';
      else if (col.id === 'room') val = (item as any).room || '-';
      else if (col.id === 'price') val = (item.unitPrice || 0).toLocaleString('en-IN');
      else if (col.id === 'gst') val = Math.round(taxAmount).toLocaleString('en-IN');
      else if (col.id === 'total') val = Math.round(rowTotal).toLocaleString('en-IN');

      if (col.label === 'ITEM DESCRIPTION') {
        pdf.text(nameLines, tx, y + 4);
      } else {
        setFont(
          col.label === 'TOTAL' || col.label === 'QTY' ? 'bold' : 'normal',
          col.label === 'TOTAL' ? 10 : 8,
          col.label === 'TOTAL' ? textDark : textMid
        );
        pdf.text(val, tx, y + 4, { align: col.align as any });
      }
      rcx += col.w;
    });

    y += rowH;
  });

  // ── Summary & Footer ──────────────────────────────────────────
  y += 10;
  if (y > 220) {
    pdf.addPage();
    y = margin + 10;
  }

  const summX = margin + contentW - 70;
  const drawSum = (l: string, v: string, bold = false) => {
    setFont(bold ? 'bold' : 'normal', 9, bold ? textDark : textMid);
    pdf.text(l, summX, y);
    pdf.text(v, margin + contentW - 4, y, { align: 'right' });
    y += 6;
  };

  drawSum('Subtotal', amountTotal.toLocaleString('en-IN'));
  if (invoice.transportCharges > 0)
    drawSum('Transport', invoice.transportCharges.toLocaleString('en-IN'));

  if (isSameState) {
    drawSum('CGST', Math.round(cgstTotal).toLocaleString('en-IN'));
    drawSum('SGST', Math.round(sgstTotal).toLocaleString('en-IN'));
  } else {
    drawSum('IGST', Math.round(igstTotal).toLocaleString('en-IN'));
  }

  if (invoice.discountTotal > 0)
    drawSum('Discount', `- ${invoice.discountTotal.toLocaleString('en-IN')}`);

  y += 5;
  pdf.setDrawColor(...borderLight);
  pdf.setLineWidth(0.5);
  pdf.line(summX, y, margin + contentW, y);
  y += 12;

  setFont('bold', 10, textMid);
  const summLabelX = margin + contentW - 80;
  pdf.text('TOTAL AMOUNT', summLabelX, y);
  setFont('bold', 18, primary);
  pdf.text(
    `Rs. ${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    margin + contentW - 4,
    y + 2,
    { align: 'right' }
  );

  // Payment & Terms (Bottom Left)
  const midY = y + 15;
  let bottomL = midY;

  if (settings.paymentDetails) {
    setFont('bold', 8, textDark);
    pdf.text('PAYMENT DETAILS', margin, bottomL);
    bottomL += 5;
    setFont('normal', 7, textMid);
    const payLines = pdf.splitTextToSize(settings.paymentDetails, contentW * 0.45);
    pdf.text(payLines, margin, bottomL);
    bottomL += payLines.length * 4 + 5;
  }

  if (invoice.notes) {
    setFont('bold', 8, textDark);
    pdf.text('NOTES', margin, bottomL);
    bottomL += 5;
    setFont('normal', 7, textMid);
    const noteLines = pdf.splitTextToSize(invoice.notes, contentW * 0.45);
    pdf.text(noteLines, margin, bottomL);
    bottomL += noteLines.length * 4 + 5;
  }

  const terms = invoice.termsAndConditions || settings.termsAndConditions;
  if (terms) {
    setFont('bold', 8, textDark);
    pdf.text('TERMS & CONDITIONS', margin, bottomL);
    bottomL += 5;
    setFont('normal', 7, textMid);
    const termLines = pdf.splitTextToSize(terms, contentW * 0.45);
    pdf.text(termLines, margin, bottomL);
  }

  // Signature (Bottom Right)
  let sigY = midY + 10;
  const sigW = 50;
  const sigX = margin + contentW - sigW;

  if (settings.signatureImage) {
    try {
      pdf.addImage(settings.signatureImage, 'PNG', sigX + 5, sigY, 40, 15, undefined, 'FAST');
      sigY += 18;
    } catch (e) {
      sigY += 15;
    }
  } else {
    // Show signature text in a nice font if possible, else just space
    sigY += 15;
  }

  pdf.setDrawColor(...borderLight);
  pdf.setLineWidth(0.5);
  pdf.line(sigX, sigY, sigX + sigW, sigY);

  const sigText = settings.signatureText || '';
  if (sigText) {
    setFont('bold', 10, textDark);
    pdf.text(sigText, sigX + sigW / 2, sigY + 5, { align: 'center' });
  }

  // Use the custom signature title or default to 'Authorized Signatory'
  const finalTitle = settings.signatureTitle || 'Authorized Signatory';
  setFont('normal', 8, textMid);
  pdf.text(finalTitle, sigX + sigW / 2, sigY + 9, { align: 'center' });

  // ── ICON-BASED FOOTER ────────────────────────────────────────
  const footerH = 20;
  const footerY = 297 - footerH;

  // Footer Background (Very Light Slate)
  pdf.setFillColor(252, 252, 253);
  pdf.rect(0, footerY, 210, footerH, 'F');
  pdf.setDrawColor(...borderLight);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY, 210 - margin, footerY);

  const items = [];
  if (storeInfo.phone) items.push({ icon: 'P:', text: storeInfo.phone });
  if (storeInfo.email) items.push({ icon: 'E:', text: storeInfo.email });
  if (storeInfo.address) items.push({ icon: 'A:', text: storeInfo.address });

  const footerGap = 15;
  const iconSpace = 8;

  // Calculate total width for centering
  let totalW = 0;
  items.forEach((item, i) => {
    totalW += pdf.getTextWidth(item.text) + iconSpace;
    if (i < items.length - 1) totalW += footerGap;
  });

  let fx = (210 - totalW) / 2;
  const fy = footerY + 10;

  items.forEach((item) => {
    setFont('bold', 8, primary);
    pdf.text(item.icon, fx, fy);
    const labelW = pdf.getTextWidth(item.icon);

    setFont('normal', 8, textDark);
    pdf.text(item.text, fx + labelW + 2, fy);
    fx += labelW + 2 + pdf.getTextWidth(item.text) + footerGap;
  });

  // Removed Watermark/Invoice No as requested
  setFont('bold', 8, primary);
  const genByText = 'Generated by: roushani.vercel.app';
  const genByW = pdf.getTextWidth(genByText);
  pdf.text(genByText, 210 - margin, footerY + footerH - 7, { align: 'right' });
  pdf.link(210 - margin - genByW, footerY + footerH - 10, genByW, 5, {
    url: 'https://roushani.vercel.app',
  });

  return pdf;
}

export function getInvoiceFilename(invoice: Invoice): string {
  const safeNum = (invoice.invoiceNumber || 'Invoice').replace(/[^a-zA-Z0-9]/g, '');
  const safeName = (invoice.customer?.name || 'Customer')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `Invoice-${safeNum}-${safeName}.pdf`;
}
