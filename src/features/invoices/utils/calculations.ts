import { InvoiceItem } from '../types/invoice';

export const calculateTotals = (
  items: InvoiceItem[],
  transportCharges: number = 0,
  discount: number = 0
) => {
  let itemSubtotal = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const rate = Number(item.unitPrice || (item as any).rate) || 0;
    const qty = Number(item.quantity) || 0;
    const tax = Number(item.taxRate) || 0;
    itemSubtotal += rate * qty;
    totalTax += (rate * qty * tax) / 100;
  });

  const grossTotal = itemSubtotal + totalTax + transportCharges;
  const total = Math.round(grossTotal - discount);

  return { subtotal: itemSubtotal, totalTax, total };
};
