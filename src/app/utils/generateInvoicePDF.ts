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
    const margin = 15;
    const contentW = pageW - margin * 2;
    const primary = hexToRgb(settings.primaryColor);
    
    // Aesthetic Colors
    const textDark: [number, number, number] = [15, 23, 42]; // slate-900
    const textMid: [number, number, number] = [71, 85, 105]; // slate-600
    const textLight: [number, number, number] = [148, 163, 184]; // slate-400
    const borderLight: [number, number, number] = [226, 232, 240]; // slate-200
    const borderDark: [number, number, number] = [15, 23, 42]; // slate-900

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
    
    const logoSizeMap: Record<string, number> = {
        small: 15,
        medium: 20,
        large: 28
    };
    const maxLogoH = logoSizeMap[settings.logoSize] || 20;
    let rightHeaderY = y;
    
    // Right side text (Invoice Title & Logo)
    setFont('normal', 24, [203, 213, 225]); // slate-300 light title
    pdf.text(storeInfo.gstin ? 'TAX INVOICE' : 'INVOICE', margin + contentW, rightHeaderY + 6, { align: 'right' });
    rightHeaderY += 12;

    if (settings.logo) {
        try {
            const imgProps = pdf.getImageProperties(settings.logo);
            const imgRatio = imgProps.width / imgProps.height;
            const maxLogoW = 50;
            
            let finalH = maxLogoH;
            let finalW = finalH * imgRatio;
            
            if (finalW > maxLogoW) {
                finalW = maxLogoW;
                finalH = finalW / imgRatio;
            }
            
            pdf.addImage(settings.logo, 'PNG', margin + contentW - finalW, rightHeaderY, finalW, finalH, undefined, 'FAST');
            rightHeaderY += finalH + 5;
        } catch (e) {
            console.error('Error adding logo to PDF:', e);
        }
    }

    // Invoice Meta (No, Date)
    setFont('normal', 9, textMid);
    pdf.text('Invoice No:', margin + contentW - 25, rightHeaderY, { align: 'right' });
    pdf.text('Date:', margin + contentW - 25, rightHeaderY + 5, { align: 'right' });
    
    setFont('bold', 9, textDark);
    pdf.text(invoice.invoiceNumber, margin + contentW, rightHeaderY, { align: 'right' });
    pdf.text(formatDateForDisplay(invoice.date), margin + contentW, rightHeaderY + 5, { align: 'right' });
    
    const rightSideBottomY = rightHeaderY + 10;

    // Left side text (Store Info)
    let leftY = y + 6;
    setFont('bold', 18, primary);
    const storeName = storeInfo.name?.toUpperCase() || 'YOUR COMPANY';
    const storeNameLines = pdf.splitTextToSize(storeName, contentW * 0.5);
    pdf.text(storeNameLines, margin, leftY);
    leftY += storeNameLines.length * 7;

    setFont('normal', 9, textMid);
    const addressLines = pdf.splitTextToSize(storeInfo.address || 'Company Address', contentW * 0.5);
    pdf.text(addressLines, margin, leftY);
    leftY += addressLines.length * 4;

    if (storeInfo.phone) {
        pdf.text(`Phone: ${storeInfo.phone}`, margin, leftY);
        leftY += 4;
    }
    if (storeInfo.email) {
        pdf.text(`Email: ${storeInfo.email}`, margin, leftY);
        leftY += 4;
    }
    if (storeInfo.gstin) {
        setFont('bold', 9, textDark);
        pdf.text(`GSTIN: ${storeInfo.gstin}`, margin, leftY + 1);
        leftY += 5;
    }
    if (storeInfo.authDistributors) {
        setFont('italic', 8, textDark);
        const authLines = pdf.splitTextToSize(storeInfo.authDistributors, contentW * 0.5);
        pdf.text(authLines, margin, leftY + 1);
        leftY += authLines.length * 3 + 1;
    }

    y = Math.max(leftY, rightSideBottomY) + 5;

    // Separator
    pdf.setDrawColor(...borderLight);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + contentW, y);
    y += 8;

    // ── Bill To Section ───────────────────────────────────────────
    setFont('bold', 7.5, textLight);
    pdf.text('BILL TO', margin, y);
    y += 5;

    setFont('bold', 12, textDark);
    const custNameLines = pdf.splitTextToSize(invoice.customer?.name || 'Walk-in Customer', contentW * 0.6);
    pdf.text(custNameLines, margin, y);
    y += custNameLines.length * 5;

    setFont('normal', 9, textMid);
    if (invoice.customer?.address) {
        const custAddrLines = pdf.splitTextToSize(invoice.customer.address, contentW * 0.6);
        pdf.text(custAddrLines, margin, y);
        y += custAddrLines.length * 4;
    }
    if (invoice.customer?.phone) {
        pdf.text(`Phone: ${invoice.customer.phone}`, margin, y);
        y += 4;
    }
    if (invoice.customer?.gstin) {
        setFont('bold', 9, textDark);
        pdf.text(`GSTIN: ${invoice.customer.gstin}`, margin, y + 1);
        y += 5;
    }

    y += 5;

    // ── Items Table Header ────────────────────────────────────────
    const isSameState = storeInfo.state === invoice.customer?.state;
    const cols = isSameState
        ? [
            { label: '#', w: 8, align: 'center' },
            { label: 'Item Description', w: 62, align: 'left' },
            { label: 'HSN', w: 15, align: 'center' },
            { label: 'Qty', w: 10, align: 'center' },
            { label: 'Rate', w: 20, align: 'right' },
            { label: 'CGST', w: 16, align: 'right' },
            { label: 'SGST', w: 16, align: 'right' },
            { label: 'Amount', w: 33, align: 'right' },
        ]
        : [
            { label: '#', w: 8, align: 'center' },
            { label: 'Item Description', w: 78, align: 'left' },
            { label: 'HSN', w: 15, align: 'center' },
            { label: 'Qty', w: 10, align: 'center' },
            { label: 'Rate', w: 22, align: 'right' },
            { label: 'IGST', w: 16, align: 'right' },
            { label: 'Amount', w: 31, align: 'right' },
        ];

    // Scale to contentW
    const totalColsW = cols.reduce((sum, c) => sum + c.w, 0);
    const scaleFactor = contentW / totalColsW;
    cols.forEach(c => c.w = c.w * scaleFactor);

    // Header Line
    pdf.setDrawColor(...borderDark);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, margin + contentW, y);
    y += 5;

    setFont('bold', 8.5, textDark);
    let cx = margin;
    for (const col of cols) {
        let textX = cx;
        if (col.align === 'center') textX = cx + col.w / 2;
        else if (col.align === 'right') textX = cx + col.w - 2;
        else textX = cx + 2;

        pdf.text(col.label, textX, y, { align: col.align as "center" | "right" | "left" });
        cx += col.w;
    }
    
    y += 2;
    // Bottom Header Line
    pdf.line(margin, y, margin + contentW, y);
    y += 4;

    // ── Items Rows ────────────────────────────────────────────────
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let amountTotal = 0;
    let grandTotal = 0;

    for (let i = 0; i < (invoice.items || []).length; i++) {
        const item = invoice.items![i];
        const amount = item.totalAmount || (item as any).amount || 0;
        const taxAmount = (amount * item.taxRate) / 100;
        const cgst = isSameState ? taxAmount / 2 : 0;
        const sgst = isSameState ? taxAmount / 2 : 0;
        const igst = !isSameState ? taxAmount : 0;
        const rowTotal = amount + taxAmount;

        cgstTotal += cgst;
        sgstTotal += sgst;
        igstTotal += igst;
        amountTotal += amount;
        grandTotal += rowTotal;

        const nameLines = pdf.splitTextToSize(item.productName || (item as any).name, cols[1].w - 4);
        const rowH = Math.max(8, nameLines.length * 4.5);

        // Page break if near bottom
        if (y + rowH > 270) {
            // Draw a subtle line to close the current page's table
            pdf.setDrawColor(...borderLight);
            pdf.setLineWidth(0.1);
            pdf.line(margin, y, margin + contentW, y);

            pdf.addPage();
            y = margin;
            
            // Re-draw header
            pdf.setDrawColor(...borderDark);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, margin + contentW, y);
            y += 5;
            setFont('bold', 8.5, textDark);
            let hx = margin;
            for (const col of cols) {
                let textX = hx;
                if (col.align === 'center') textX = hx + col.w / 2;
                else if (col.align === 'right') textX = hx + col.w - 2;
                else textX = hx + 2;
                pdf.text(col.label, textX, y, { align: col.align as "center" | "right" | "left" });
                hx += col.w;
            }
            y += 2;
            pdf.line(margin, y, margin + contentW, y);
            y += 4;
        }

        setFont('normal', 8.5, textDark);
        pdf.setTextColor(30, 41, 59); // slightly offset text
        
        let rcx = margin;
        
        const stringVals = isSameState
            ? [
                String(i + 1),
                nameLines,
                item.hsn || '-',
                String(item.quantity),
                (item.unitPrice || (item as any).rate || 0).toLocaleString('en-IN'),
                Math.round(cgst).toLocaleString('en-IN'),
                Math.round(sgst).toLocaleString('en-IN'),
                Math.round(rowTotal).toLocaleString('en-IN'),
            ] : [
                String(i + 1),
                nameLines,
                item.hsn || '-',
                String(item.quantity),
                (item.unitPrice || (item as any).rate || 0).toLocaleString('en-IN'),
                Math.round(igst).toLocaleString('en-IN'),
                Math.round(rowTotal).toLocaleString('en-IN'),
            ];

        for (let ci = 0; ci < cols.length; ci++) {
            const col = cols[ci];
            const val = stringVals[ci];
            
            let textX = rcx;
            if (col.align === 'center') textX = rcx + col.w / 2;
            else if (col.align === 'right') textX = rcx + col.w - 2;
            else textX = rcx + 2;

            if (ci === 1) {
                // Name Lines
                setFont('bold', 8.5, textDark);
                pdf.text(val as string[], textX, y + 4);
            } else {
                setFont('normal', 8.5, textMid);
                if (ci === cols.length - 1) setFont('bold', 8.5, textDark); // Make amount bold
                if (ci === 0) setFont('normal', 8, textLight); // Make index lighter
                pdf.text(val as string, textX, y + 4, { align: col.align as "center" | "right" | "left" });
                
                // Add % subtext for taxes
                if (isSameState && (ci === 5 || ci === 6)) {
                    setFont('normal', 7, textLight);
                    pdf.text(`${(item.taxRate || 18) / 2}%`, textX, y + 7.5, { align: 'right' });
                } else if (!isSameState && ci === 5) {
                    setFont('normal', 7, textLight);
                    pdf.text(`${item.taxRate || 18}%`, textX, y + 7.5, { align: 'right' });
                }
            }
            rcx += col.w;
        }

        y += rowH;
        
        // Subtle row separator
        pdf.setDrawColor(...borderLight);
        pdf.setLineWidth(0.1);
        pdf.line(margin, y, margin + contentW, y);
        y += 1; // Slight gap before next row
    }

    // ── Summary Section ───────────────────────────────────────────
    y += 5; // Gap before summary

    const summaryW = 70;
    const summaryX = margin + contentW - summaryW;
    
    // Page break protection for summary
    if (y > 230) {
        pdf.addPage();
        y = margin;
    }

    const drawSummaryRow = (label: string, value: string, isDiscount = false) => {
        setFont('normal', 9, textMid);
        pdf.text(label, summaryX, y);
        if (isDiscount) setFont('bold', 9, [5, 150, 105]); // emerald-600
        else setFont('bold', 9, textDark);
        pdf.text(value, summaryX + summaryW, y, { align: 'right' });
        y += 6;
    };

    drawSummaryRow('Subtotal', amountTotal.toLocaleString('en-IN'));
    if (invoice.transportCharges > 0) {
        drawSummaryRow('Transportation Charges', invoice.transportCharges.toLocaleString('en-IN'));
    }
    if (invoice.discountTotal > 0) {
        drawSummaryRow('Discount', `- ${invoice.discountTotal.toLocaleString('en-IN')}`, true);
    }

    // Grand total
    const finalTotal = invoice.grandTotal || Math.round(amountTotal + (isSameState ? cgstTotal + sgstTotal : igstTotal) + (invoice.transportCharges || 0) - (invoice.discountTotal || 0));

    y += 2;
    pdf.setDrawColor(...borderLight);
    pdf.setLineWidth(0.3);
    pdf.line(summaryX, y - 4, summaryX + summaryW, y - 4);
    
    setFont('bold', 7.5, textLight);
    pdf.text('TOTAL AMOUNT (INR)', summaryX, y + 1);
    
    setFont('bold', 16, primary);
    pdf.text(`RS. ${finalTotal.toLocaleString('en-IN')}`, summaryX + summaryW, y + 1, { align: 'right' });
    
    y += 5;

    // ── Footer: Amount In Words & Terms ───────────────────────────
    y = Math.max(y + 10, y + 10);
    
    // Page break protection for footer
    if (y > 250) {
        pdf.addPage();
        y = margin;
    }

    const amtInWords = `${numberToWords(finalTotal)} Only`;
    setFont('bold', 7.5, textLight);
    pdf.text('AMOUNT IN WORDS', margin, y);
    y += 4;
    setFont('bold', 9, textDark);
    pdf.text(amtInWords, margin, y);
    y += 10;

    // Line separator for footer
    pdf.setDrawColor(...borderLight);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, margin + contentW, y);
    y += 8;

    const footerTopY = y;
    let leftSideY = y;
    
    // Terms & Conditions (Left)
    if (invoice.notes || settings.invoiceNotes) {
        setFont('bold', 7.5, textLight);
        pdf.text('TERMS & CONDITIONS', margin, leftSideY);
        leftSideY += 5;
        
        setFont('normal', 8, textMid);
        const termsLines = pdf.splitTextToSize((invoice.notes || settings.invoiceNotes) as string, contentW * 0.6);
        pdf.text(termsLines, margin, leftSideY);
        leftSideY += termsLines.length * 4;
    }

    // Signature (Right)
    const sigBoxW = 60;
    const sigBoxX = margin + contentW - sigBoxW;
    let rightSideY = footerTopY;

    if (settings.showSignature) {
        if (settings.signatureImage) {
            try {
                const imgProps = pdf.getImageProperties(settings.signatureImage);
                const imgRatio = imgProps.width / imgProps.height;
                const maxSigH = 15;
                let finalW = maxSigH * imgRatio;
                if (finalW > sigBoxW) {
                    finalW = sigBoxW;
                }
                pdf.addImage(settings.signatureImage, 'PNG', sigBoxX + (sigBoxW - finalW)/2, rightSideY, finalW, maxSigH, undefined, 'FAST');
                rightSideY += maxSigH + 2;
            } catch (e) {
                console.error('Error adding signature img:', e);
                rightSideY += 17;
            }
        } else {
            rightSideY += 17;
        }

        pdf.setDrawColor(...borderLight);
        pdf.setLineWidth(0.5);
        pdf.line(sigBoxX, rightSideY, sigBoxX + sigBoxW, rightSideY);
        rightSideY += 4;

        setFont('bold', 8, textDark);
        const authSigner = settings.signatureText || `For ${storeInfo.name || 'Company'}`;
        const authSignerLines = pdf.splitTextToSize(authSigner, sigBoxW);
        pdf.text(authSignerLines, sigBoxX + sigBoxW/2, rightSideY, { align: 'center' });
        rightSideY += authSignerLines.length * 4;

        setFont('normal', 7, textLight);
        pdf.text('Authorized Signatory', sigBoxX + sigBoxW/2, rightSideY, { align: 'center' });
        rightSideY += 4;
    }

    // Footer Text
    if (settings.showFooter) {
        const bottomY = 285;
        setFont('normal', 8, textLight);
        pdf.text(settings.footerText || 'Thank you for your business!', pageW / 2, bottomY, { align: 'center' });
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
