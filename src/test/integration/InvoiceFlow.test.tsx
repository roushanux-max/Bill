import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import CreateInvoice from '@/features/invoices/pages/CreateInvoice';
import * as storage from '@/shared/utils/storage';

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
    storeInfo: { name: 'Test Store' },
    loading: false,
  }),
}));

vi.mock('@/shared/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    smartBack: vi.fn(),
  }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock the storage module
vi.mock('@/shared/utils/storage', async () => {
  const actual = await vi.importActual<typeof import('@/shared/utils/storage')>(
    '@/shared/utils/storage'
  );
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

describe.skip('Invoice Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.getStoreInfo as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'store-123',
      name: 'My Store',
    });
    (storage.getCustomers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'c1',
          name: 'John Doe',
          phone: '1234567890',
          gstin: 'GSTN1',
          address: 'Addr',
          state: 'Bihar',
          createdAt: '',
        },
      ],
      loading: false,
      error: null,
    });
    (storage.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Macbook',
          sellingPrice: 1000,
          gstRate: 18,
          category: 'Elec',
          hsnCode: '123',
          unit: 'pcs',
          createdAt: '',
        },
      ],
      loading: false,
      error: null,
    });
    (storage.getNextInvoiceNumber as ReturnType<typeof vi.fn>).mockResolvedValue('INV-001');
    (storage.getBrandingSettings as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (storage.searchCustomers as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'c1', name: 'John Doe', gstin: 'GSTN1' },
    ]);
    (storage.saveInvoice as ReturnType<typeof vi.fn>).mockResolvedValue('inv-123');
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

  it('loads invoice number on mount', async () => {
    renderComponent();

    // The component should load data and show the invoice number
    await waitFor(
      () => {
        const input = screen.getByDisplayValue('INV-001');
        expect(input).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('renders the Create Invoice page successfully', async () => {
    renderComponent();

    // Check the page renders — look for a heading or the form structure
    await waitFor(
      () => {
        // The Create Invoice form should be present
        const heading = screen.queryByText(/Create Invoice|New Invoice|Invoice/i);
        expect(heading).toBeTruthy();
      },
      { timeout: 5000 }
    );

    // Verify data loading was called
    expect(storage.getCustomers).toHaveBeenCalled();
    expect(storage.getProducts).toHaveBeenCalled();
    expect(storage.getNextInvoiceNumber).toHaveBeenCalled();
  });
});
