import { describe, it, expect } from 'vitest';
import { calculateTotals } from './calculations';
import { InvoiceItem } from '../types/invoice';

describe('calculateTotals', () => {
  const mockItems: InvoiceItem[] = [
    {
      id: '1',
      invoice_id: 'inv1',
      product_id: 'p1',
      productName: 'Product 1',
      quantity: 2,
      unitPrice: 100,
      taxRate: 5,
      taxAmount: 10,
      discountAmount: 0,
      totalAmount: 210,
    },
    {
      id: '2',
      invoice_id: 'inv1',
      product_id: 'p2',
      productName: 'Product 2',
      quantity: 1,
      unitPrice: 500,
      taxRate: 12,
      taxAmount: 60,
      discountAmount: 0,
      totalAmount: 560,
    }
  ];

  it('calculates totals correctly with items, transport, and discount', () => {
    const { subtotal, totalTax, total } = calculateTotals(mockItems, 50, 20);
    
    // Subtotal: (2 * 100) + (1 * 500) = 700
    // Tax: (2 * 100 * 0.05) + (1 * 500 * 0.12) = 10 + 60 = 70
    // Gross: 700 + 70 + 50 (transport) = 820
    // Total: 820 - 20 (discount) = 800
    
    expect(subtotal).toBe(700);
    expect(totalTax).toBe(70);
    expect(total).toBe(800);
  });

  it('handles zero items', () => {
    const { subtotal, totalTax, total } = calculateTotals([], 0, 0);
    expect(subtotal).toBe(0);
    expect(totalTax).toBe(0);
    expect(total).toBe(0);
  });

  it('handles zero tax rate', () => {
    const itemsNoTax: InvoiceItem[] = [
      { id: '1', invoice_id: 'inv1', product_id: 'p1', productName: 'No Tax', quantity: 1, unitPrice: 100, taxRate: 0, taxAmount: 0, discountAmount: 0, totalAmount: 100 }
    ];
    const { totalTax, total } = calculateTotals(itemsNoTax, 0, 0);
    expect(totalTax).toBe(0);
    expect(total).toBe(100);
  });

  it('rounds the final total', () => {
    const itemsRounding: InvoiceItem[] = [
      { id: '1', invoice_id: 'inv1', product_id: 'p1', productName: 'Rounding', quantity: 1, unitPrice: 100.45, taxRate: 5, taxAmount: 5.02, discountAmount: 0, totalAmount: 105.47 }
    ];
    // 100.45 + (100.45 * 0.05) = 100.45 + 5.0225 = 105.4725
    // round(105.4725) = 105
    const { total } = calculateTotals(itemsRounding, 0, 0);
    expect(total).toBe(105);
  });

  it('handles missing transport or discount (defaults to 0)', () => {
    const { subtotal, totalTax, total } = calculateTotals(mockItems);
    // Subtotal 700, Tax 70, Transport 0, Discount 0 -> 770
    expect(total).toBe(770);
  });
});
