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
}

export function generateInvoicePDF(
    invoice: Invoice,
    storeInfo: StoreInfo,
    settings: BrandingSettings
): jsPDF {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    const primary = hexToRgb(settings.primaryColor);
    
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
        Math.round(255 - (255 - accentColorRgb[2]) * 0.08)
    ];

    const fontMap: Record<string, string> = {
        inter: 'helvetica',
        roboto: 'helvetica',
        lato: 'helvetica',
        opensans: 'helvetica'
    };
    const activeFont = fontMap[settings.fontFamily] || 'helvetica';

    let y = margin + 5; // Top padding

    // Helpers
    const setFont = (style: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number]) => {
        pdf.setFont(activeFont, style);
        pdf.setFontSize(size);
        pdf.setTextColor(...color);
    };

    // ── Header Section ──────────────────────────────────────────────
    
    // Modern Dark Header Banner for "INVOICE"
    const bannerW = 100;
    const bannerH = 25;
    pdf.setFillColor(...primary);
    pdf.roundedRect(margin + contentW - bannerW + 10, y, bannerW, bannerH, 10, 10, 'F');
    
    setFont('bold', 34, [255, 255, 255]);
    // 2. HEADER BANNER - DARK & ASYMMETRICAL
    // Draw main dark blue banner
    pdf.setFillColor(...primary);
    // Main rectangle - stretched left
    pdf.rect(120, 0, 95, 40, 'F');
    // Simulate asymmetrical rounded corner (bottom-left)
    pdf.setFillColor(...primary);
    pdf.roundedRect(110, 0, 105, 35, 15, 15, 'F'); // More rounded
    
    // Header Text
    setFont('bold', 28, [255, 255, 255]);
    pdf.text('INVOICE', 135, 22, { charSpace: 2 });
    
    // Corner Accent (The Tan Triangle from the UI)
    pdf.setFillColor(...tanAccent);
    pdf.triangle(210, 0, 210, 15, 195, 0, 'F');

    // 3. INVOICE META (Number, Dates)
    setFont('bold', 8, [255, 255, 255]);
    const metaX = 135;
    pdf.text(`No: ${invoice.invoiceNumber}`, metaX, 32);
    pdf.text(`Date: ${formatDateForDisplay(invoice.date)}`, metaX + 35, 32);

    // 4. BOTTOM-LEFT ACCENT (Circle)
    pdf.setDrawColor(...primary);
    pdf.setLineWidth(3);
    pdf.circle(15, 282, 10, 'D'); 

    // Reset for content
    setFont('normal', 10, textDark);
    
    // Logo and Store Info (Left Side)
    let leftY = y + 2; 
    const maxLogoH = settings.logoSize === 'large' ? 28 : settings.logoSize === 'medium' ? 20 : 15;
    if (settings.logo) {
        try {
            const imgProps = pdf.getImageProperties(settings.logo);
            const imgRatio = imgProps.width / imgProps.height;
            const maxLogoW = 40;
            let finalH = maxLogoH;
            let finalW = finalH * imgRatio;
            if (finalW > maxLogoW) {
                finalW = maxLogoW;
                finalH = finalW / imgRatio;
            }
            pdf.addImage(settings.logo, 'PNG', margin, leftY, finalW, finalH, undefined, 'FAST');
            leftY += finalH + 6;
        } catch (e) {}
    }

    if (storeInfo.name) {
        setFont('bold', 18, textDark);
        pdf.text(storeInfo.name.toUpperCase(), margin, leftY + 2);
        leftY += 8;
    }
    
    if (settings.tagline) {
        setFont('normal', 8, textLight);
        pdf.text((settings.tagline || '').toUpperCase(), margin, leftY);
        leftY += 5;
    }

    // Invoice Meta Info (Right side, below banner)
    let rightY = y + bannerH + 12;
    setFont('bold', 7, textLight);
    pdf.text('BILL TO.', margin, rightY + 12); // Re-labeling or spacing
    
    y = Math.max(leftY + 15, rightY + 15);

    // ── Bill To Section ───────────────────────────────────────────
    if (invoice.customer?.name) {
        setFont('bold', 24, textDark);
        const custNameLines = pdf.splitTextToSize(invoice.customer.name, contentW * 0.7);
        pdf.text(custNameLines, margin, y + 2);
        y += custNameLines.length * 10;

        setFont('normal', 10, textMid);
        const contactInfo = [invoice.customer.phone, (invoice.customer as any).email].filter(Boolean).join('  •  ');
        if (contactInfo) {
            pdf.text(contactInfo, margin, y);
            y += 6;
        }
        
        if (invoice.customer.address) {
            const addrLines = pdf.splitTextToSize(invoice.customer.address, contentW * 0.6);
            pdf.text(addrLines, margin, y);
            y += addrLines.length * 5;
        }
        y += 12;
    }

    // ── Items Table ───────────────────────────────────────────────
    const activeDomain = settings.domain || 'general';
    const isSameState = storeInfo.state === invoice.customer?.state;
    const hasAnyHSN = (invoice.items || []).some(item => item.hsn && item.hsn.trim() !== '' && item.hsn !== '-');
    
    let cols = [
        { label: 'QTY', w: 12, align: 'center' },
        { label: 'ITEM DESCRIPTION', w: 60, align: 'left', id: 'desc' },
        { label: 'HSN', w: 15, align: 'center', id: 'hsn' },
        { label: 'PRICE', w: 25, align: 'right' },
        { label: 'TOTAL', w: 30, align: 'right' },
    ];

    if (activeDomain === 'clothing') {
        cols.splice(2, 0, { label: 'SIZE', w: 12, align: 'center', id: 'size' });
        cols.splice(3, 0, { label: 'COLOR', w: 12, align: 'center', id: 'color' });
    } else if (activeDomain === 'furniture') {
        cols.splice(2, 0, { label: 'MATERIAL', w: 24, align: 'center', id: 'material' });
    }

    if (!hasAnyHSN) {
        cols = cols.filter(c => c.id !== 'hsn');
    }

    const totalColsW = cols.reduce((sum, c) => sum + c.w, 0);
    const scaleFactor = contentW / totalColsW;
    cols.forEach(c => c.w = c.w * scaleFactor);

    // Header Background
    pdf.setFillColor(...primary);
    pdf.roundedRect(margin, y, contentW, 10, 5, 5, 'F');
    
    setFont('bold', 8, [255, 255, 255]);
    let cx = margin;
    cols.forEach(col => {
        let tx = cx + (col.align === 'center' ? col.w/2 : (col.align === 'right' ? col.w - 4 : 4));
        pdf.text(col.label, tx, y + 6.5, { align: col.align as any });
        cx += col.w;
    });
    y += 13;

    // Rows
    let cgstTotal = 0, sgstTotal = 0, igstTotal = 0, amountTotal = 0;
    (invoice.items || []).forEach((item, idx) => {
        const amount = item.totalAmount || (item as any).amount || 0;
        const taxAmount = (amount * item.taxRate) / 100;
        const rowTotal = amount + taxAmount;
        
        amountTotal += amount;
        cgstTotal += isSameState ? taxAmount/2 : 0;
        sgstTotal += isSameState ? taxAmount/2 : 0;
        igstTotal += !isSameState ? taxAmount : 0;

        const nameLines = pdf.splitTextToSize(item.productName || 'Item', cols[1].w - 8);
        const rowH = Math.max(10, nameLines.length * 5);

        if (y + rowH > 270) { pdf.addPage(); y = margin + 10; }

        // Alternating Highlight
        if (idx % 2 !== 0) {
            pdf.setFillColor(...primary);
            pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
            pdf.roundedRect(margin, y - 2, contentW, rowH, 4, 4, 'F');
            pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        }

        setFont('bold', 9, textDark);
        let rcx = margin;
        
        cols.forEach(col => {
            let tx = rcx + (col.align === 'center' ? col.w/2 : (col.align === 'right' ? col.w - 4 : 4));
            let val = '';
            
            if (col.label === 'QTY') val = String(item.quantity);
            else if (col.label === 'ITEM DESCRIPTION') val = ''; // Handled separately for multi-line
            else if (col.label === 'HSN') val = item.hsn || '-';
            else if (col.label === 'SIZE') val = item.unit || (item as any).size || '-';
            else if (col.label === 'COLOR') val = (item as any).color || '-';
            else if (col.label === 'MATERIAL') val = (item as any).material || '-';
            else if (col.label === 'PRICE') val = (item.unitPrice || 0).toLocaleString('en-IN');
            else if (col.label === 'TOTAL') val = Math.round(rowTotal).toLocaleString('en-IN');

            if (col.label === 'ITEM DESCRIPTION') {
                pdf.text(nameLines, tx, y + 4);
            } else {
                setFont(col.label === 'TOTAL' || col.label === 'QTY' ? 'bold' : 'normal', col.label === 'TOTAL' ? 10 : 8, col.label === 'TOTAL' ? textDark : textMid);
                pdf.text(val, tx, y + 4, { align: col.align as any });
            }
            rcx += col.w;
        });
        
        y += rowH;
    });

    // ── Summary & Footer ──────────────────────────────────────────
    y += 10;
    if (y > 220) { pdf.addPage(); y = margin + 10; }

    const summX = margin + contentW - 70;
    const drawSum = (l: string, v: string, bold = false) => {
        setFont(bold ? 'bold' : 'normal', 9, bold ? textDark : textMid);
        pdf.text(l, summX, y);
        pdf.text(v, margin + contentW - 4, y, { align: 'right' });
        y += 6;
    };

    drawSum('Subtotal', amountTotal.toLocaleString('en-IN'));
    if (invoice.transportCharges > 0) drawSum('Transport', invoice.transportCharges.toLocaleString('en-IN'));
    
    if (isSameState) {
        drawSum('CGST', Math.round(cgstTotal).toLocaleString('en-IN'));
        drawSum('SGST', Math.round(sgstTotal).toLocaleString('en-IN'));
    } else {
        drawSum('IGST', Math.round(igstTotal).toLocaleString('en-IN'));
    }
    
    if (invoice.discountTotal > 0) drawSum('Discount', `- ${invoice.discountTotal.toLocaleString('en-IN')}`);

    y += 2;
    pdf.setDrawColor(...textDark);
    pdf.setLineWidth(1);
    pdf.line(summX, y, margin + contentW, y);
    y += 8;

    setFont('bold', 10, textLight);
    pdf.text('TOTAL AMOUNT', summX, y);
    setFont('bold', 18, primary);
    pdf.text(`RS. ${invoice.grandTotal.toLocaleString('en-IN')}`, margin + contentW - 4, y + 1, { align: 'right' });

    // Payment & Terms (Bottom Left)
    const midY = y + 15;
    let bottomL = midY;
    
    if (settings.paymentDetails) {
        setFont('bold', 8, textDark);
        pdf.text('PAYMENT DETAILS', margin, bottomL);
        bottomL += 5;
        setFont('normal', 8, textMid);
        const payLines = pdf.splitTextToSize(settings.paymentDetails, contentW * 0.5);
        pdf.text(payLines, margin, bottomL);
        bottomL += payLines.length * 4 + 5;
    }
    
    if (invoice.notes) {
        setFont('bold', 8, textDark);
        pdf.text('NOTES', margin, bottomL);
        bottomL += 5;
        setFont('normal', 7, textMid);
        const noteLines = pdf.splitTextToSize(invoice.notes, contentW * 0.5);
        pdf.text(noteLines, margin, bottomL);
    }

    // Signature (Bottom Right)
    let sigY = midY + 10;
    const sigW = 50;
    const sigX = margin + contentW - sigW;

    if (settings.signatureImage) {
        try {
            pdf.addImage(settings.signatureImage, 'PNG', sigX + 5, sigY, 40, 15, undefined, 'FAST');
            sigY += 18;
        } catch (e) { sigY += 15; }
    } else { sigY += 15; }

    pdf.setDrawColor(...borderLight);
    pdf.setLineWidth(0.5);
    pdf.line(sigX, sigY, sigX + sigW, sigY);
    setFont('bold', 9, textDark);
    pdf.text(settings.signatureText || 'Authorized Signatory', sigX + sigW/2, sigY + 5, { align: 'center' });
    setFont('normal', 7, textLight);
    pdf.text('Authorized Signatory', sigX + sigW/2, sigY + 8, { align: 'center' });

    // ── DARK FOOTER BANNER ────────────────────────────────────────
    const footerH = 30;
    const footerY = 297 - footerH;
    pdf.setFillColor(...primary);
    pdf.rect(0, footerY, 210, footerH, 'F');
    
    setFont('bold', 8, [255, 255, 255]);
    const footX1 = margin;
    const footX2 = margin + 50;
    const footX3 = margin + 100;
    
    pdf.text(`📞  ${storeInfo.phone || '-'}`, footX1, footerY + 12);
    pdf.text(`✉️  ${storeInfo.email || '-'}`, footX1, footerY + 18);
    pdf.text(`🌐  ${settings.website || '-'}`, footX2, footerY + 12);
    pdf.text(`🆔  GST: ${storeInfo.gstin || '-'}`, footX2, footerY + 18);
    
    const addrLines = pdf.splitTextToSize(storeInfo.address || '-', 60);
    pdf.text(`📍  `, footX3, footerY + 12);
    pdf.text(addrLines, footX3 + 6, footerY + 12);

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
