import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Dashboard from '@/app/pages/Dashboard';
import * as storage from '@/shared/utils/storage';

// Mock contexts
vi.mock('@/shared/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/shared/contexts/BrandingContext', () => ({
  useBranding: () => ({
    storeInfo: { name: 'Test Store' },
  }),
}));

// Mock router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock storage
vi.mock('@/shared/utils/storage', () => ({
  getInvoices: vi.fn(),
  getCustomers: vi.fn(),
  getProducts: vi.fn(),
  subscribeToInvoices: vi.fn(() => () => {}),
  subscribeToProducts: vi.fn(() => () => {}),
  subscribeToCustomers: vi.fn(() => () => {}),
}));

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fixedDate = new Date().toISOString();
  const mockInvoices = [
    { id: '1', grandTotal: 1000, date: fixedDate, status: 'paid' },
    { id: '2', grandTotal: 500, date: fixedDate, status: 'unpaid' },
  ];

  it('calculates and displays stats correctly', async () => {
    (storage.getInvoices as any).mockResolvedValue({ data: mockInvoices, loading: false, error: null });
    (storage.getCustomers as any).mockResolvedValue({ data: [{}, {}], loading: false, error: null });
    (storage.getProducts as any).mockResolvedValue({ data: [{}, {}, {}], loading: false, error: null });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for skeletons to disappear and content to appear
    const showButton = await screen.findByTitle(/Show Revenue/i);
    fireEvent.click(showButton);

    await waitFor(() => {
      // Look for the revenue value. Total Revenue should be 1,500.
      const revenueElements = screen.queryAllByText(/1,500/);
      expect(revenueElements.length).toBeGreaterThanOrEqual(1);
      // Total Invoices should be 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // Total Customers should be 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // Total Products should be 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    (storage.getInvoices as any).mockResolvedValue({ data: [], loading: false, error: null });
    (storage.getCustomers as any).mockResolvedValue({ data: [], loading: false, error: null });
    (storage.getProducts as any).mockResolvedValue({ data: [], loading: false, error: null });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // If data is empty, some stats might show '0'
      // Total Invoices, Customers, Products
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(3);
    });
  });
});
