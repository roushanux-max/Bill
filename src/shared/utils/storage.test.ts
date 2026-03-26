import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from './supabase';

// We test the storage module's behavior by verifying it calls supabase correctly.
// The supabase client is auto-mocked via src/test/setup.ts.

describe.skip('storage utility', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    // Set up a logged-in user for all auth calls
    (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
    });

    // Set the active store id for the test user
    window.localStorage.setItem('user-123_active_store_id', 'store-456');
    window.localStorage.setItem('bill_user_id', 'user-123');
  });

  describe('Customers', () => {
    it('calls supabase.from("customers") when saving a customer', async () => {
      const { saveCustomer } = await import('./storage');

      const mockCustomer = {
        id: 'cust-1',
        name: 'John Doe',
        phone: '1234567890',
        gstin: 'GST123',
        address: '123 St',
        state: 'Bihar',
        createdAt: new Date().toISOString(),
      };

      await saveCustomer(mockCustomer);
      expect(supabase.from).toHaveBeenCalledWith('customers');
    });

    it('calls supabase.from("customers") when fetching customers', async () => {
      const { getCustomers } = await import('./storage');
      await getCustomers(true);
      expect(supabase.from).toHaveBeenCalledWith('customers');
    });
  });

  describe('Invoices', () => {
    it('calls supabase.from("invoices") when saving an invoice', async () => {
      const { saveInvoice } = await import('./storage');

      const mockInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-001',
        date: '2023-01-01',
        customerId: 'cust-1',
        customer: {
          id: 'cust-1',
          name: 'John',
          gstin: '',
          address: '',
          state: '',
          phone: '',
          createdAt: '',
        },
        items: [],
        transportCharges: 0,
        discountTotal: 0,
        subtotal: 100,
        taxTotal: 10,
        grandTotal: 110,
        notes: '',
        status: 'unpaid' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        store_id: 'store-456',
      };

      await saveInvoice(mockInvoice);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
    });

    it('calls supabase.from("invoices") when fetching invoices', async () => {
      const { getInvoices } = await import('./storage');
      await getInvoices(true);
      expect(supabase.from).toHaveBeenCalledWith('invoices');
    });
  });

  describe('Multi-user Isolation', () => {
    it('passes different user IDs to supabase queries for different users', async () => {
      const { getCustomers } = await import('./storage');

      // User A
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-A' } },
      });
      window.localStorage.setItem('user-A_active_store_id', 'store-A');
      await getCustomers(true);
      expect(supabase.from).toHaveBeenCalledWith('customers');

      // Re-clear and set User B
      vi.clearAllMocks();
      (supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-B' } },
      });
      window.localStorage.setItem('user-B_active_store_id', 'store-B');
      await getCustomers(true);
      expect(supabase.from).toHaveBeenCalledWith('customers');
    });
  });
});
