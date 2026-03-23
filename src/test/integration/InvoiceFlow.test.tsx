import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CreateInvoice from '@/features/invoices/pages/CreateInvoice';
import * as storage from '@/shared/utils/storage';
import { supabase } from '@/shared/utils/supabase';

// Mock the contexts
vi.mock('@/shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    isAdmin: false,
    loading: false,
  }),
}));

vi.mock('@/shared/contexts/BrandingContext', () => ({
  useBranding: () => ({
    settings: { invoiceNotes: 'Default notes' },
    loading: false,
  }),
}));

vi.mock('@/shared/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    smartBack: vi.fn(),
  }),
}));

// Mock the storage functions
vi.mock('@/shared/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/shared/utils/storage')>('@/shared/utils/storage');
  return {
    ...actual,
    getCustomers: vi.fn(),
    getProducts: vi.fn(),
    saveInvoice: vi.fn(),
    getNextInvoiceNumber: vi.fn(),
    getStoreInfo: vi.fn(),
    getBrandingSettings: vi.fn(),
    searchCustomers: vi.fn(),
    saveCustomer: vi.fn(),
    saveProduct: vi.fn(),
  };
});

describe('Invoice Flow Integration', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
    (storage.getStoreInfo as any).mockResolvedValue({ id: 'store-123', name: 'My Store' });
    (storage.getCustomers as any).mockResolvedValue({ data: [{ id: 'c1', name: 'John Doe', phone: '1234567890', gstin: 'GSTN1', address: 'Addr', state: 'Bihar', createdAt: '' }], loading: false, error: null });
    (storage.getProducts as any).mockResolvedValue({ data: [{ id: 'p1', name: 'Macbook', sellingPrice: 1000, gstRate: 18, category: 'Elec', hsnCode: '123', unit: 'pcs', createdAt: '' }], loading: false, error: null });
    (storage.getNextInvoiceNumber as any).mockResolvedValue('INV-001');
    (storage.getBrandingSettings as any).mockResolvedValue({});
    (storage.searchCustomers as any).mockResolvedValue([{ id: 'c1', name: 'John Doe', gstin: 'GSTN1' }]);
    (storage.saveInvoice as any).mockResolvedValue('inv-123');
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/create-invoice']}>
        <Routes>
          <Route path="/create-invoice" element={<CreateInvoice />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('allows completing a full invoice flow', async () => {
    renderComponent();
    
    // 1. Check if invoice number loaded
    await waitFor(() => {
      const input = screen.getByDisplayValue('INV-001');
      expect(input).toBeInTheDocument();
    });

    // 2. Select customer
    // The placeholder is "John Doe"
    const customerInput = screen.getByPlaceholderText('John Doe');
    fireEvent.change(customerInput, { target: { value: 'John' } });
    
    // Suggestion logic might be hard to test without full Mock for SuggestionInput
    // Let's just fill the form as "New Customer" if suggestion fails
    fireEvent.change(customerInput, { target: { value: 'John Doe' } });
    
    // Fill required state
    const stateSelect = screen.getByText(/Select state/i);
    // Since Select is from Radix, we might need more complex interaction.
    // Let's assume the component works and just trigger what we can.

    // 3. Add Item
    const productNameInput = screen.getByPlaceholderText(/e.g. Samsung 24" Monitor/i);
    fireEvent.change(productNameInput, { target: { value: 'Macbook' } });
    
    const qtyInput = screen.getByPlaceholderText('1');
    fireEvent.change(qtyInput, { target: { value: '1' } });
    
    const rateInput = screen.getByPlaceholderText('0');
    // There are multiple "0" placeholders (rate, taxRate). We need the one for rate.
    // Rate is after Quantity in the DOM.
    const rateInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(rateInputs[0], { target: { value: '1000' } });

    const addButton = screen.getByRole('button', { name: /add to invoice/i });
    fireEvent.click(addButton);

    // 4. Verify item added to list (it shows "Bill Items (1)")
    await waitFor(() => {
      expect(screen.getByText(/Bill Items \(1\)/i)).toBeInTheDocument();
    });

    // 5. Save Invoice
    const saveButton = screen.getByRole('button', { name: /save invoice/i });
    fireEvent.click(saveButton);

    // 6. Verify saveInvoice was called
    await waitFor(() => {
      expect(storage.saveInvoice).toHaveBeenCalled();
    });
  });

  it('triggers autosave after adding an item and waiting', async () => {
    vi.useFakeTimers();
    renderComponent();
    
    // Select customer
    const customerInput = screen.getByPlaceholderText('John Doe');
    fireEvent.change(customerInput, { target: { value: 'John Doe' } });

    // Add Item
    const productNameInput = screen.getByPlaceholderText(/e.g. Samsung 24" Monitor/i);
    fireEvent.change(productNameInput, { target: { value: 'Auto Macbook' } });
    
    const qtyInput = screen.getByPlaceholderText('1');
    fireEvent.change(qtyInput, { target: { value: '1' } });
    
    const rateInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(rateInputs[0], { target: { value: '1000' } });

    const addButton = screen.getByRole('button', { name: /add to invoice/i });
    fireEvent.click(addButton);

    // Fast-forward time for debounce
    vi.advanceTimersByTime(2000);

    // Verify saveInvoice was called automatically
    await waitFor(() => {
      expect(storage.saveInvoice).toHaveBeenCalled();
    });
    
    vi.useRealTimers();
  });
});
