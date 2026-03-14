import jsPDF from 'jspdf';
import { Invoice, StoreInfo } from '../types/invoice';
import { BrandingSettings } from '../types/branding';
import { formatDateForDisplay } from './dateUtils';

function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0];
}

function getContrastColor(hex: string): [number, number, number] {
    const [r, g, b] = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? [17, 24, 39] : [255, 255, 255];
}

function numberToWords(num: number): string {
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
}

export function generateInvoicePDF(
    invoice: Invoice,
    storeInfo: StoreInfo,
    settings: BrandingSettings
): jsPDF {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 10;
    const contentW = pageW - margin * 2;
    const primary = hexToRgb(settings.primaryColor);
    const primaryText = getContrastColor(settings.primaryColor);
    const borderColor: [number, number, number] = [226, 232, 240];
    const textDark: [number, number, number] = [30, 41, 59];
    const textMid: [number, number, number] = [100, 116, 139];

    // Font mapping - jsPDF standard fonts fallback
    const fontMap: Record<string, string> = {
        inter: 'helvetica',
        roboto: 'helvetica',
        lato: 'helvetica',
        opensans: 'helvetica'
    };
    const activeFont = fontMap[settings.fontFamily] || 'helvetica';

    let y = margin;
    const midX = margin + contentW / 2;

    const setBorderColor = () => pdf.setDrawColor(...borderColor);
    const setTextDark = () => pdf.setTextColor(...textDark);
    const setTextMid = () => pdf.setTextColor(...textMid);

    // ── Top info bar ──────────────────────────────────────────────
    setBorderColor();
    pdf.setLineWidth(0.3);
    const barH = 10; // Slightly taller bar for logo

    // Calculate columns based on logo presence
    // Calculate logo width based on settings
    const logoSizeMap: Record<string, number> = {
        small: 20,
        medium: 30,
        large: 45
    };
    const logoW = settings.logo ? (logoSizeMap[settings.logoSize] || 30) : 0;
    const infoColsW = (contentW - logoW) / 3;

    if (settings.logo) {
        try {
            // Need to calculate aspect ratio properly so it doesn't stretch
            const imgProps = pdf.getImageProperties(settings.logo);
            const imgRatio = imgProps.width / imgProps.height;
            const maxW = logoW - 4;
            const maxH = barH - 2;
            const boxRatio = maxW / maxH;

            let finalW = maxW;
            let finalH = maxH;
            
            if (imgRatio > boxRatio) {
                // Image is wider than box
                finalH = finalW / imgRatio;
            } else {
                // Image is taller than box
                finalW = finalH * imgRatio;
            }
            
            // Center the image in the allocated logo box
            const offsetX = margin + 2 + ((maxW - finalW) / 2);
            const offsetY = y + 1 + ((maxH - finalH) / 2);

            pdf.addImage(settings.logo, 'PNG', offsetX, offsetY, finalW, finalH, undefined, 'FAST');
        } catch (e) {
            console.error('Error adding logo to PDF:', e);
        }
        pdf.line(margin + logoW, y, margin + logoW, y + barH);
    }

    pdf.setFontSize(8);
    setTextDark();
    pdf.setFont(activeFont, 'bold');

    // GSTIN Column
    pdf.text(`GSTIN No: ${storeInfo.gstin}`, margin + logoW + 2, y + (barH / 2) + 1);
    pdf.line(margin + logoW + infoColsW, y, margin + logoW + infoColsW, y + barH);

    // Title Column
    pdf.text(storeInfo.gstin ? 'TAX INVOICE' : 'BILL OF SUPPLY', margin + logoW + infoColsW + (infoColsW / 2), y + (barH / 2) + 1, { align: 'center' });
    pdf.line(margin + logoW + infoColsW * 2, y, margin + logoW + infoColsW * 2, y + barH);

    // Phone Column
    pdf.text(`Mob:- ${storeInfo.phone}`, margin + contentW - 2, y + (barH / 2) + 1, { align: 'right' });

    pdf.rect(margin, y, contentW, barH);
    y += barH;

    // ── Company name banner ───────────────────────────────────────
    pdf.setFillColor(...primary);
    const bannerH = 12; // Increased height for better centering
    pdf.rect(margin, y, contentW, bannerH, 'F');
    pdf.setTextColor(...primaryText);
    pdf.setFontSize(16); // Slightly larger
    pdf.setFont('helvetica', 'bold');
    // Center text both horizontally and vertically
    pdf.text(storeInfo.name.toUpperCase(), pageW / 2, y + (bannerH / 2) + 1.5, { align: 'center' });
    y += bannerH;

    // ── Address ───────────────────────────────────────────────────
    setBorderColor();
    setTextDark();
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');

    // Split address if it's too long
    const storeAddrLines = pdf.splitTextToSize(storeInfo.address, contentW - 4);
    const addrBoxH = Math.max(8, storeAddrLines.length * 4 + 2);
    pdf.text(storeAddrLines, pageW / 2, y + (addrBoxH / 2) + 1, { align: 'center' });
    pdf.rect(margin, y, contentW, addrBoxH);
    y += addrBoxH;

    if (storeInfo.authDistributors) {
        const authLines = pdf.splitTextToSize(storeInfo.authDistributors, contentW - 4);
        const authBoxH = Math.max(8, authLines.length * 4 + 2);
        pdf.text(authLines, pageW / 2, y + (authBoxH / 2) + 1, { align: 'center' });
        pdf.rect(margin, y, contentW, authBoxH);
        y += authBoxH;
    }

    // ── Customer + Invoice details ────────────────────────────────
    pdf.setFontSize(8.5);
    setTextDark();

    // Right side first to get heights
    pdf.setFont('helvetica', 'bold');
    const gstinText = `GSTIN No. ${invoice.customer.gstin || ''}`;
    const invNoText = `INVOICE NO:- ${invoice.invoiceNumber}`;
    const dateText = `Invoice Date: - ${formatDateForDisplay(invoice.date)}`;

    // Left side: Party details
    pdf.setFont('helvetica', 'bold');
    pdf.text('Party Name & Address:-', margin + 2, y + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.text('Name:', margin + 2, y + 10);
    pdf.setFont('helvetica', 'bold');
    const partyNameLines = pdf.splitTextToSize(invoice.customer.name, (contentW / 2) - 15);
    pdf.text(partyNameLines, margin + 14, y + 10);

    const partyNameH = partyNameLines.length * 4;

    pdf.setFont('helvetica', 'normal');
    pdf.text('Address:', margin + 2, y + 10 + partyNameH);
    const addrLines = pdf.splitTextToSize(invoice.customer.address || '', (contentW / 2) - 18);
    pdf.text(addrLines, margin + 20, y + 10 + partyNameH);

    const partyAddrH = addrLines.length * 4;
    const leftHeight = 10 + partyNameH + partyAddrH + 2;

    // Right side rendering
    pdf.setFont('helvetica', 'bold');
    pdf.text(gstinText, midX + 2, y + 5);
    pdf.text(invNoText, margin + contentW - 2, y + 5, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.text('Invoice Date:', midX + 2, y + 12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatDateForDisplay(invoice.date), margin + contentW - 2, y + 12, { align: 'right' });

    const detailRowH = Math.max(28, leftHeight);
    pdf.rect(margin, y, contentW, detailRowH);
    pdf.line(midX, y, midX, y + detailRowH);
    y += detailRowH;

    // ── Items table header ────────────────────────────────────────
    const isSameState = storeInfo.state === invoice.customer.state;
    const cols = isSameState
        ? [
            { label: 'S.\nNo', w: 10 },
            { label: 'Particulars', w: 60 },
            { label: 'HSN\nCode', w: 14 },
            { label: 'Qty', w: 10 },
            { label: 'Rate', w: 18 },
            { label: 'Amount', w: 18 },
            { label: `CGST\n${(invoice.items[0]?.taxRate || 18) / 2}%`, w: 15 },
            { label: `SGST\n${(invoice.items[0]?.taxRate || 18) / 2}%`, w: 15 },
            { label: 'Total\nAmount', w: 30 },
        ]
        : [
            { label: 'S.\nNo', w: 10 },
            { label: 'Particulars', w: 80 },
            { label: 'HSN\nCode', w: 14 },
            { label: 'Qty', w: 10 },
            { label: 'Rate', w: 20 },
            { label: 'Amount', w: 20 },
            { label: `IGST\n${invoice.items[0]?.taxRate || 18}%`, w: 16 },
            { label: 'Total\nAmount', w: 20 },
        ];

    // Adjust column widths to fit contentW (190mm)
    const totalColsW = cols.reduce((sum, c) => sum + c.w, 0);
    const scaleFactor = contentW / totalColsW;
    cols.forEach(c => c.w = c.w * scaleFactor);

    const hdrH = 12;
    pdf.setFillColor(...primary);
    pdf.rect(margin, y, contentW, hdrH, 'F');
    pdf.setTextColor(...primaryText);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');

    let cx = margin;
    for (const col of cols) {
        const lines = col.label.split('\n');
        if (lines.length === 2) {
            pdf.text(lines[0], cx + col.w / 2, y + 4.5, { align: 'center' });
            pdf.text(lines[1], cx + col.w / 2, y + 8.5, { align: 'center' });
        } else {
            pdf.text(lines[0], cx + col.w / 2, y + 7, { align: 'center' });
        }
        setBorderColor();
        pdf.line(cx + col.w, y, cx + col.w, y + hdrH);
        cx += col.w;
    }
    pdf.rect(margin, y, contentW, hdrH);
    y += hdrH;

    // ── Items rows ────────────────────────────────────────────────
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let amountTotal = 0;
    let grandTotal = 0;

    for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const taxAmount = (item.amount * item.taxRate) / 100;
        const cgst = isSameState ? taxAmount / 2 : 0;
        const sgst = isSameState ? taxAmount / 2 : 0;
        const igst = !isSameState ? taxAmount : 0;
        const rowTotal = item.amount + taxAmount;

        cgstTotal += cgst;
        sgstTotal += sgst;
        igstTotal += igst;
        amountTotal += item.amount;
        grandTotal += rowTotal;

        const nameLines = pdf.splitTextToSize(item.name, cols[1].w - 4);
        const rowH = Math.max(8, nameLines.length * 4.5 + 2);

        setTextDark();
        pdf.setFontSize(7.5);
        pdf.setFont('helvetica', 'normal');

        cx = margin;
        const vals = isSameState
            ? [
                String(i + 1),
                item.name,
                item.hsn || '',
                String(item.quantity),
                item.rate.toFixed(2),
                item.amount.toFixed(2),
                cgst.toFixed(2),
                sgst.toFixed(2),
                rowTotal.toFixed(2),
            ]
            : [
                String(i + 1),
                item.name,
                item.hsn || '',
                String(item.quantity),
                item.rate.toFixed(2),
                item.amount.toFixed(2),
                igst.toFixed(2),
                rowTotal.toFixed(2),
            ];

        for (let ci = 0; ci < cols.length; ci++) {
            const col = cols[ci];
            const val = vals[ci];
            if (ci === 1) {
                // Particulars - wrap text
                pdf.text(nameLines, cx + 2, y + 5);
            } else if (ci === 0 || ci === 2 || ci === 3) {
                pdf.text(val, cx + col.w / 2, y + 5, { align: 'center' });
            } else {
                pdf.text(val, cx + col.w - 2, y + 5, { align: 'right' });
            }
            setBorderColor();
            pdf.line(cx + col.w, y, cx + col.w, y + rowH);
            cx += col.w;
        }
        pdf.rect(margin, y, contentW, rowH);
        y += rowH;

        // Page break if near bottom
        if (y > 270 && i < invoice.items.length - 1) {
            pdf.addPage();
            y = margin;
            // Redraw header on new page? (Optional, but good practice)
        }
    }

    // ── Transport charges row ─────────────────────────────────────
    if (invoice.transportCharges > 0) {
        const tcH = 8;
        setTextDark();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        cx = margin;
        const tcVals = isSameState
            ? ['', 'Transportation Charges', '', '', '', invoice.transportCharges.toFixed(2), '0.00', '0.00', invoice.transportCharges.toFixed(2)]
            : ['', 'Transportation Charges', '', '', '', invoice.transportCharges.toFixed(2), '0.00', invoice.transportCharges.toFixed(2)];
        for (let ci = 0; ci < cols.length; ci++) {
            const col = cols[ci];
            const val = tcVals[ci];
            if (ci === 1) pdf.text(val, cx + 2, y + 5);
            else if (ci === 6 || ci === 7 || (ci === 8 && !isSameState)) pdf.text(val, cx + col.w - 2, y + 5, { align: 'right' });
            else if (ci === cols.length - 1) pdf.text(val, cx + col.w - 2, y + 5, { align: 'right' });
            else if (ci === 5) pdf.text(val, cx + col.w - 2, y + 5, { align: 'right' });

            setBorderColor();
            pdf.line(cx + col.w, y, cx + col.w, y + tcH);
            cx += col.w;
        }
        pdf.rect(margin, y, contentW, tcH);
        y += tcH;
    }

    // ── Totals row ────────────────────────────────────────────────
    const totalH = 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setTextDark();
    cx = margin;
    const totalLabelW = cols.slice(0, 5).reduce((a, col) => a + col.w, 0);
    pdf.text('Total Amount', margin + totalLabelW / 2, y + 5, { align: 'center' });
    let tcx = margin + totalLabelW;

    const summaryVals = isSameState
        ? [amountTotal.toFixed(2), cgstTotal.toFixed(2), sgstTotal.toFixed(2), (grandTotal + invoice.transportCharges).toFixed(2)]
        : [amountTotal.toFixed(2), igstTotal.toFixed(2), (grandTotal + invoice.transportCharges).toFixed(2)];

    const summaryStartIdx = 5;
    for (let ci = 0; ci < summaryVals.length; ci++) {
        const col = cols[summaryStartIdx + ci];
        pdf.text(summaryVals[ci], tcx + col.w - 2, y + 5, { align: 'right' });
        setBorderColor();
        pdf.line(tcx + col.w, y, tcx + col.w, y + totalH);
        tcx += col.w;
    }
    pdf.rect(margin, y, contentW, totalH);
    y += totalH;

    // ── Round off & final total ───────────────────────────────────
    const baseTotal = amountTotal + (isSameState ? cgstTotal + sgstTotal : igstTotal) + invoice.transportCharges - invoice.discount;
    const roundOff = Math.round(baseTotal) - baseTotal;
    const finalTotal = Math.round(baseTotal);

    const roundH = 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text('Round Off', margin + contentW * 0.6 + 2, y + 5);
    pdf.text(`(${roundOff >= 0 ? '+' : ''}${roundOff.toFixed(2)})`, margin + contentW - 2, y + 5, { align: 'right' });
    pdf.rect(margin, y, contentW, roundH);
    y += roundH;

    const amtInWords = `${numberToWords(finalTotal)} Only`;
    const amtRowH = 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);

    // Wrap amount in words if too long
    const wordLines = pdf.splitTextToSize(amtInWords, contentW - 40);
    pdf.text(wordLines, margin + 2, y + 6);

    pdf.setFontSize(11);
    pdf.text(finalTotal.toLocaleString('en-IN'), margin + contentW - 2, y + 6, { align: 'right' });
    pdf.rect(margin, y, contentW, amtRowH);
    y += amtRowH;

    // ── Footer: Terms & Signature ─────────────────────────────────
    const footerH = 35;
    if (y + footerH > 280) { pdf.addPage(); y = margin; }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    setTextDark();
    pdf.text('Terms and Conditions E. & O. E.', margin + 2, y + 5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    if (invoice.notes) {
        const noteLines = pdf.splitTextToSize(invoice.notes, contentW / 2 - 4);
        pdf.text(noteLines, margin + 2, y + 10);
    }

    // Signature side
    pdf.setFont(activeFont, 'normal');
    pdf.text('Receiver\'s Signature', midX + 2, y + 5);

    pdf.setFont(activeFont, 'bold');
    pdf.text(`For:- ${storeInfo.name}`, margin + contentW - 2, y + footerH - 12, { align: 'right' });

    // Signature Image
    if (settings.showSignature && settings.signatureImage) {
        try {
            const sigProps = pdf.getImageProperties(settings.signatureImage);
            const sigRatio = sigProps.width / sigProps.height;
            const maxSigW = 40;
            const maxSigH = 12;
            const boxSigRatio = maxSigW / maxSigH;

            let finalSigW = maxSigW;
            let finalSigH = maxSigH;
            
            if (sigRatio > boxSigRatio) {
                finalSigH = finalSigW / sigRatio;
            } else {
                finalSigW = finalSigH * sigRatio;
            }

            // Right-aligned, bottom-aligned relative to the allocated box 
            // (box is margin + contentW - 2 - maxSigW, up to margin + contentW - 2)
            const sigOffsetX = margin + contentW - 2 - finalSigW;
            const sigOffsetY = y + footerH - 12 - finalSigH - 1; // 1mm padding above the name text

            pdf.addImage(settings.signatureImage, 'PNG', sigOffsetX, sigOffsetY, finalSigW, finalSigH, undefined, 'FAST');
        } catch (e) {
            console.error('Error adding signature to PDF:', e);
        }
    }

    pdf.setFont(activeFont, 'normal');
    pdf.text(settings.showSignature && settings.signatureText ? settings.signatureText : 'Authorized Signatory', margin + contentW - 2, y + footerH - 5, { align: 'right' });

    pdf.line(midX, y, midX, y + footerH);
    pdf.rect(margin, y, contentW, footerH);
    y += footerH;

    // ── Thank you footer ─────────────────────────────────────────
    if (settings.showFooter) {
        pdf.setTextColor(...textMid);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.text(settings.footerText || 'Thank you for your business!', pageW / 2, y + 6, { align: 'center' });
    } else {
        setTextMid();
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(8);
        pdf.text('Thank you for your business!', pageW / 2, y + 6, { align: 'center' });
    }

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
