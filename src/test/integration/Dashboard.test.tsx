import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Dashboard from '@/app/pages/Dashboard';

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

const mockInvoices = [
  { id: '1', grandTotal: 1000, date: new Date().toISOString(), status: 'paid' },
  { id: '2', grandTotal: 500, date: new Date().toISOString(), status: 'unpaid' },
];

// Mock storage module - Note: functions must be async to match real behavior
vi.mock('@/shared/utils/storage', () => ({
  getInvoices: vi.fn().mockResolvedValue({ data: [], error: null }),
  getCustomers: vi.fn().mockResolvedValue({ data: [], error: null }),
  getProducts: vi.fn().mockResolvedValue({ data: [], error: null }),
  subscribeToInvoices: vi.fn(() => () => {}),
  subscribeToProducts: vi.fn(() => () => {}),
  subscribeToCustomers: vi.fn(() => () => {}),
  hasGuestDataToMigrate: vi.fn().mockReturnValue(false),
  migrateGuestDataToDatabase: vi.fn(),
}));

describe('Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows zero stats when data is empty', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(
      () => {
        // After loading, stat cards should show '0' or '₹0'
        const zeroElements = screen.queryAllByText('0');
        expect(zeroElements.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );
  });

  it('shows revenue content after clicking the toggle button', async () => {
    const { getInvoices, getCustomers, getProducts } = await import('@/shared/utils/storage');
    (getInvoices as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockInvoices,
      error: null,
    });
    (getCustomers as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'c1' }, { id: 'c2' }],
      error: null,
    });
    (getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }],
      error: null,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for loading to finish (Show Revenue button appears)
    const showButton = await screen.findByTitle(/Show Revenue/i, {}, { timeout: 5000 });
    expect(showButton).toBeDefined();

    // Click to reveal revenue
    fireEvent.click(showButton);

    await waitFor(
      () => {
        // Revenue is now shown - check for the formatted value
        const revenueEl = screen.queryAllByText(/1,500/);
        expect(revenueEl.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );
  });
});
