import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { FileText, IndianRupee, Users, Package, Eye, EyeOff, UserPlus, Plus } from 'lucide-react';
import {
  getInvoices,
  getCustomers,
  getProducts,
  subscribeToInvoices,
  subscribeToProducts,
  subscribeToCustomers,
  hasGuestDataToMigrate,
  migrateGuestDataToDatabase,
} from '@/shared/utils/storage';
import { Invoice } from '@/features/invoices/types/invoice';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/shared/components/ui/alert-dialog';
import { StatSkeleton, ListSkeleton } from '@/shared/components/SkeletonLoaders';
import Header from '@/shared/components/Header';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { storeInfo } = useBranding();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayCount: 0,
    monthSales: 0,
    monthCount: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [showRevenue, setShowRevenue] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      const [invoicesRes, customersRes, productsRes] = await Promise.all([
        getInvoices(true),
        getCustomers(true),
        getProducts(true),
      ]);
      const invoices = invoicesRes.data || [];
      const customers = customersRes.data || [];
      const products = productsRes.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Helper function to parse both DD.MM.YY and ISO (YYYY-MM-DD) date formats
      const parseDateString = (dateStr: string) => {
        if (!dateStr) return new Date(0);
        // Handle ISO format: YYYY-MM-DD or full ISO string
        if (dateStr.includes('-')) {
          const d = new Date(dateStr);
          return isNaN(d.getTime()) ? new Date(0) : d;
        }
        // Handle DD.MM.YY format
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year =
            parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };

      // Only count invoices with a customer name AND a non-zero total
      const validInvoices = invoices.filter(
        (inv) => (inv.grandTotal || 0) > 0 && inv.customer?.name?.trim()
      );

      const todayInvoices = validInvoices.filter((inv) => {
        const invDate = parseDateString(inv.date);
        invDate.setHours(0, 0, 0, 0);
        return invDate.getTime() === today.getTime();
      });

      const monthInvoices = validInvoices.filter((inv) => {
        const invDate = parseDateString(inv.date);
        return invDate >= thisMonth;
      });

      setStats({
        todaySales: todayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        todayCount: todayInvoices.length,
        monthSales: monthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        monthCount: monthInvoices.length,
        totalInvoices: validInvoices.length,
        totalRevenue: validInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        totalCustomers: customers.length,
        totalProducts: products.length,
      });
      // Show all valid invoices in the recent list (sorted newest first)
      setRecentInvoices(
        [...validInvoices].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setIsInitialLoading(false);

      if (hasGuestDataToMigrate()) {
        setShowMigrationPrompt(true);
      }
    };

    fetchStats();

    // Subscribe to realtime invoice changes and refresh stats when they occur
    const unsubInvoices = subscribeToInvoices(() => fetchStats());
    const unsubProducts = subscribeToProducts(() => fetchStats());
    const unsubCustomers = subscribeToCustomers(() => fetchStats());

    return () => {
      if (unsubInvoices) unsubInvoices();
      if (unsubProducts) unsubProducts();
      if (unsubCustomers) unsubCustomers();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="px-4 py-4 sm:py-8 max-w-6xl mx-auto pb-20 sm:pb-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <Button
              onClick={() => navigate('/create-invoice')}
              className="hidden sm:flex bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white border-none font-semibold px-4"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Create Invoice</span>
            </Button>
          </div>
          <p className="text-sm sm:text-base text-slate-500">
            Welcome back{' '}
            <span className="font-semibold text-slate-800">
              {storeInfo?.ownerName || user?.email?.split('@')[0]}
            </span>
            ! Here's your{' '}
            {storeInfo?.name ? (
              <strong className="text-[var(--brand-color)]">{storeInfo.name}</strong>
            ) : (
              'organization'
            )}{' '}
            overview.
          </p>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        {isInitialLoading ? (
          <StatSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="cursor-default">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <button
                  onClick={() => setShowRevenue(!showRevenue)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  title={showRevenue ? 'Hide Revenue' : 'Show Revenue'}
                >
                  {showRevenue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {showRevenue ? `₹${stats.totalRevenue.toLocaleString('en-IN')}` : '₹******'}
                </div>
                <p className="text-xs text-slate-600 mt-1">{stats.totalInvoices} total invoices</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/invoices')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices This Month</CardTitle>
                <FileText className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.monthCount}</div>
                <p className="text-xs text-slate-600 mt-1">
                  {showRevenue ? `₹${stats.monthSales.toLocaleString('en-IN')}` : '₹******'} this
                  month
                </p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customers')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-xs text-slate-600 mt-1">All registered customers</p>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/products')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-slate-600 mt-1">Products in catalog</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invoices List */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">All Invoices</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
              Manage
            </Button>
          </div>
          {isInitialLoading ? (
            <ListSkeleton count={3} />
          ) : recentInvoices.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <div className="text-slate-400 mb-3">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No invoices yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create your first invoice to see it here
                </p>
              </div>
              <Button
                size="sm"
                className="bg-[var(--brand-color)] hover:bg-[var(--brand-color-hover)] text-white border-none"
                onClick={() => navigate('/create-invoice')}
              >
                + Create Invoice
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {recentInvoices.map((inv) => (
                <Card
                  key={inv.id}
                  className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/invoice-preview?id=${encodeURIComponent(inv.id)}&return=${encodeURIComponent('/dashboard')}`
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">
                          #{inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-400">—</span>
                        <span className="font-medium text-slate-700 text-sm truncate">
                          {inv.customer?.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {inv.date} • {inv.items?.length || 0} item
                        {(inv.items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-bold text-slate-900 text-sm">
                        ₹{(inv.grandTotal || 0).toLocaleString('en-IN')}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/invoice-preview?id=${encodeURIComponent(inv.id)}&return=${encodeURIComponent('/dashboard')}`
                          );
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Migration Prompt Modal */}
      <AlertDialog open={showMigrationPrompt} onOpenChange={setShowMigrationPrompt}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Save Temporary Unsaved Data?</AlertDialogTitle>
            <AlertDialogDescription>
              We found invoices tracking activity from when you were exploring Invoice as a Guest.
              Would you like to save these invoices permanently to your new account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isMigrating}
              onClick={() => {
                // Discard
                Object.keys(window.sessionStorage).forEach(
                  (k) => k.startsWith('guest_mode_') && window.sessionStorage.removeItem(k)
                );
                window.sessionStorage.removeItem('invoice_guest_mode');
                setShowMigrationPrompt(false);
              }}
            >
              Discard
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMigrating}
              onClick={async (e) => {
                e.preventDefault();
                setIsMigrating(true);
                const toastId = toast.loading('Saving guest data to your account...');
                const success = await migrateGuestDataToDatabase();
                setIsMigrating(false);
                setShowMigrationPrompt(false);
                if (success) {
                  toast.success('Successfully saved your temporary invoices to your account!', {
                    id: toastId,
                  });
                  setTimeout(() => window.location.reload(), 1000);
                } else {
                  toast.error('Failed to migrate some data. Check console logs.', { id: toastId });
                }
              }}
            >
              {isMigrating ? 'Saving...' : 'Save Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
