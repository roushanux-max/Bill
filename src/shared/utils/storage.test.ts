import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveCustomer, getCustomers, saveInvoice, getInvoices } from './storage';
import { supabase } from './supabase';
import { Customer, Invoice } from '@/features/invoices/types/invoice';

// Mock sonner
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

describe('storage utility', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    
    // Default mock for getUser
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
    
    // Mock getActiveStoreId
    window.localStorage.setItem('user-123_active_store_id', 'store-456');
    window.localStorage.setItem('bill_user_id', 'user-123');
  });

  describe('Customers', () => {
    const mockCustomer: Customer = {
      id: 'cust-1',
      name: 'John Doe',
      phone: '1234567890',
      gstin: 'GST123',
      address: '123 St',
      state: 'Bihar',
      createdAt: new Date().toISOString(),
    };

    it('saves a customer with user_id', async () => {
      await saveCustomer(mockCustomer);
      expect(supabase.from).toHaveBeenCalledWith('customers');
    });

    it('filters customers by user_id on retrieval', async () => {
      const mockQueryBuilder = (supabase.from as any)();
      vi.spyOn(mockQueryBuilder, 'limit').mockResolvedValue({ data: [mockCustomer], error: null });

      const result = await getCustomers(true);
      
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Invoices', () => {
    const mockInvoice: Invoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-001',
      date: '2023-01-01',
      customerId: 'cust-1',
      customer: { id: 'cust-1', name: 'John', gstin: '', address: '', state: '', phone: '', createdAt: '' },
      items: [],
      transportCharges: 0,
      discountTotal: 0,
      subtotal: 100,
      taxTotal: 10,
      grandTotal: 110,
      notes: '',
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      store_id: 'store-456',
    };

    it('saves an invoice metadata and items', async () => {
      // Mock single() for the invoice upsert
      const mockQueryBuilder = (supabase.from as any)();
      vi.spyOn(mockQueryBuilder, 'single').mockResolvedValue({ data: { id: 'inv-1' }, error: null });

      await saveInvoice(mockInvoice);
      
      expect(supabase.from).toHaveBeenCalledWith('invoices');
    });

    it('filters invoices by user_id', async () => {
      const mockQueryBuilder = (supabase.from as any)();
      vi.spyOn(mockQueryBuilder, 'order').mockResolvedValue({ data: [], error: null });

      await getInvoices(true);
      
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('Multi-user Data Isolation', () => {
    it('ensures User A cannot see User B data', async () => {
      // 1. Setup User A
      const userA = { id: 'user-A' };
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: userA } });
      window.localStorage.setItem('user-A_active_store_id', 'store-A');
      
      const mockQueryBuilder = (supabase.from as any)();
      const eqSpy = vi.spyOn(mockQueryBuilder, 'eq');
      vi.spyOn(mockQueryBuilder, 'limit').mockResolvedValue({ data: [], error: null });

      await getCustomers(true);
      expect(eqSpy).toHaveBeenCalledWith('user_id', 'user-A');
      
      // 2. Setup User B
      const userB = { id: 'user-B' };
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: userB } });
      window.localStorage.setItem('user-B_active_store_id', 'store-B');
      
      await getCustomers(true);
      expect(eqSpy).toHaveBeenCalledWith('user_id', 'user-B');
    });
  });

  describe('Error Handling', () => {
    it('handles Supabase errors gracefully in getCustomers', async () => {
      const mockQueryBuilder = (supabase.from as any)();
      vi.spyOn(mockQueryBuilder, 'limit').mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const result = await getCustomers(true);
      expect(result.error).toBe('DB Error');
    });
  });
});
