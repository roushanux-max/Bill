import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FileText, IndianRupee, Users, Package, Eye, EyeOff, UserPlus } from 'lucide-react';
import { getInvoices, getCustomers, getProducts, subscribeToInvoices, subscribeToProducts, subscribeToCustomers } from '../utils/storage';
import { Invoice } from '../types/invoice';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { toast } from 'sonner';
import { StatSkeleton, ListSkeleton } from '../components/SkeletonLoaders';
import Header from '../components/Header';

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
      const [invoices, customers, products] = await Promise.all([
        getInvoices(true),
        getCustomers(true),
        getProducts(true)
      ]);

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
          const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return new Date(dateStr);
      };

      const todayInvoices = invoices.filter(inv => {
        const invDate = parseDateString(inv.date);
        invDate.setHours(0, 0, 0, 0);
        return invDate.getTime() === today.getTime();
      });

      const monthInvoices = invoices.filter(inv => {
        const invDate = parseDateString(inv.date);
        return invDate >= thisMonth;
      });

      setStats({
        todaySales: todayInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        todayCount: todayInvoices.length,
        monthSales: monthInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        monthCount: monthInvoices.length,
        totalInvoices: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
        totalCustomers: customers.length,
        totalProducts: products.length,
      });
      // Keep a short list of recent invoices for dashboard quick view
      setRecentInvoices(invoices.slice(0, 6));
      setIsInitialLoading(false);
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
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <Button
              onClick={() => navigate('/create-invoice')}
              className="hidden sm:flex bg-[var(--color-primary)] hover:opacity-90 text-sm sm:text-base"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span>Create Invoice</span>
            </Button>
          </div>
          <p className="text-sm sm:text-base text-slate-600">
            Welcome back <span className="font-semibold text-slate-900">{storeInfo?.ownerName || user?.email?.split('@')[0]}</span>! Here's your {storeInfo?.name ? <strong style={{ color: 'var(--color-primary)' }}>{storeInfo.name}</strong> : 'organization'} overview.
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
                  title={showRevenue ? "Hide Revenue" : "Show Revenue"}
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
                  {showRevenue ? `₹${stats.monthSales.toLocaleString('en-IN')}` : '₹******'} this month
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
          </div >
        )}

        {/* Recent Invoices */}
        < div className="mt-6" >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Recent Invoices</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>View all</Button>
          </div>
          {
            isInitialLoading ? (
              <ListSkeleton count={3} />
            ) : recentInvoices.length === 0 ? (
              <div className="text-sm text-slate-500">No invoices yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {recentInvoices.map(inv => (
                  <Card key={inv.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{inv.invoiceNumber} — {inv.customer?.name}</div>
                        <div className="text-xs text-slate-500">
                          {inv.date} • {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ₹{inv.grandTotal?.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/invoice-preview?id=${encodeURIComponent(inv.id)}`)}>
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          }
        </div >
      </main >

    </div>
  );
}