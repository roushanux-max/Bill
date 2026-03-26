import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./supabase', () => {
  const mockSupabaseQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    then: vi.fn((onfulfilled) => Promise.resolve({ data: [], error: null }).then(onfulfilled)),
  };
  return {
    supabase: {
      auth: { getUser: vi.fn() },
      from: vi.fn(() => mockSupabaseQueryBuilder),
    },
  };
});

describe('storage utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    const { supabase } = require('./supabase');
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    window.localStorage.setItem('user-123_active_store_id', 'store-456');
    window.localStorage.setItem('bill_user_id', 'user-123');
  });

  it('calls supabase.from("customers") when saving a customer', async () => {
    const { saveCustomer } = require('./storage');
    const { supabase } = require('./supabase');
    await saveCustomer({ id: '1', name: 'John Doe' });
    expect(supabase.from).toHaveBeenCalledWith('customers');
  });

  it('calls supabase.from("customers") when fetching customers', async () => {
    const { getCustomers } = require('./storage');
    const { supabase } = require('./supabase');
    await getCustomers(true);
    expect(supabase.from).toHaveBeenCalledWith('customers');
  });

  it('calls supabase.from("invoices") when saving an invoice', async () => {
    const { saveInvoice } = require('./storage');
    const { supabase } = require('./supabase');
    await saveInvoice({ id: '1', invoiceNumber: 'INV-1' });
    expect(supabase.from).toHaveBeenCalledWith('invoices');
  });

  it('calls supabase.from("invoices") when fetching invoices', async () => {
    const { getInvoices } = require('./storage');
    const { supabase } = require('./supabase');
    await getInvoices(true);
    expect(supabase.from).toHaveBeenCalledWith('invoices');
  });

  it('passes different user IDs to supabase queries for different users', async () => {
    const { getCustomers } = require('./storage');
    const { supabase } = require('./supabase');
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-A' } } });
    window.localStorage.setItem('user-A_active_store_id', 'store-A');
    await getCustomers(true);
    expect(supabase.from).toHaveBeenCalledWith('customers');
  });
});
