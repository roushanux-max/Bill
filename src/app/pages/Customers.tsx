import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, Download, Filter, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Customer, Invoice } from '../types/invoice';
import { getCustomers, saveCustomer, deleteCustomer, getInvoices } from '../utils/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ListSkeleton } from '../components/SkeletonLoaders';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const shouldOpenDialog = searchParams.get('add') === 'true';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(shouldOpenDialog);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'spending'>('date');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gstin: '',
    address: '',
    state: 'Bihar',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (shouldOpenDialog) {
      setIsDialogOpen(true);
      setSearchParams({});
    }
  }, [shouldOpenDialog]);

  const loadCustomers = async () => {
    const [customerData, invoiceData] = await Promise.all([
      getCustomers(true),
      getInvoices(true)
    ]);
    setCustomers(customerData);
    setInvoices(invoiceData);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      gstin: '',
      address: '',
      state: 'Bihar',
    });
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      gstin: customer.gstin,
      address: customer.address,
      state: customer.state,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
      await loadCustomers();
      toast.success('Customer deleted successfully!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    try {
      const customer: Customer = {
        id: editingCustomer?.id || crypto.randomUUID(),
        ...formData,
        gstin: formData.gstin.toUpperCase(),
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      };

      await saveCustomer(customer);
      await loadCustomers();
      toast.success(editingCustomer ? 'Customer updated!' : 'Customer added!');
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error('Error saving customer:', e);
      toast.error('Failed to save customer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total spending for a customer
  const getCustomerSpending = (customerId: string) => {
    const customerInvoices = invoices.filter(invoice => invoice.customerId === customerId);
    return customerInvoices.reduce((sum, invoice) => sum + (invoice.grandTotal || 0), 0);
  };

  // Calculate number of invoices for a customer
  const getCustomerInvoiceCount = (customerId: string) => {
    return invoices.filter(invoice => invoice.customerId === customerId).length;
  };

  // Export customers data to CSV
  const handleExport = () => {
    // customers and invoices are already in state

    // Calculate spending data for each customer
    const customerData = filteredSortedCustomers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
      const totalSpent = customerInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const invoiceCount = customerInvoices.length;
      const lastInvoiceDate = customerInvoices.length > 0
        ? new Date(Math.max(...customerInvoices.map(inv => new Date(inv.createdAt).getTime())))
        : null;

      return {
        'Customer Name': customer.name,
        'Phone': customer.phone,
        'GSTIN': customer.gstin || 'N/A',
        'Address': customer.address || 'N/A',
        'State': customer.state,
        'Total Spent': `₹${totalSpent.toLocaleString('en-IN')}`,
        'Invoice Count': invoiceCount,
        'Last Invoice Date': lastInvoiceDate ? lastInvoiceDate.toLocaleDateString('en-IN') : 'N/A',
        'Added On': new Date(customer.createdAt).toLocaleDateString('en-IN'),
      };
    });

    // Convert to CSV
    const headers = Object.keys(customerData[0] || {});
    const csvContent = [
      headers.join(','),
      ...customerData.map(row =>
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in values
          return typeof value === 'string' && value.includes(',')
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Customer data exported successfully!', {
      description: 'CSV file downloaded',
    });
  };

  const clearFilters = () => {
    setFilterState('all');
    setSortBy('date');
    toast.success('Filters cleared');
  };

  const hasActiveFilters = filterState !== 'all' || sortBy !== 'date';

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if state filter is needed (only show if there are 2+ unique states)
  const uniqueStates = [...new Set(filteredCustomers.map(c => c.state))];
  const showStateFilter = uniqueStates.length > 1;

  // Apply state filter
  const filteredByState = filterState === 'all'
    ? filteredCustomers
    : filteredCustomers.filter(customer => customer.state === filterState);

  // Apply sorting
  const filteredSortedCustomers = [...filteredByState].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'spending') {
      const spendingA = getCustomerSpending(a.id);
      const spendingB = getCustomerSpending(b.id);
      return spendingB - spendingA;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredSortedCustomers.length === 0}
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Customer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
                    <DialogDescription>
                      {editingCustomer ? 'Update customer information below.' : 'Add a new customer to your list.'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Customer name"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstin" className="text-sm">GSTIN</Label>
                      <Input
                        id="gstin"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        placeholder="10DAOPK4311H1Z1"
                        maxLength={15}
                        className="text-sm uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street address"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(e) => setFormData({ ...formData, state: e })}
                      >
                        <SelectTrigger className="w-full rounded-lg border border-slate-200">
                          <SelectValue>{formData.state}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-full max-h-60 overflow-y-auto px-3 rounded-lg border border-slate-200">
                          {INDIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingCustomer ? 'Update Customer' : 'Add Customer'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 sm:py-8 max-w-6xl mx-auto">
        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            {/* Filter Toggle and Clear Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showStateFilter && (
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-9"
                    disabled={customers.length === 0}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {(filterState !== 'all' ? 1 : 0) + (sortBy !== 'date' ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                )}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            {showFilters && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                {showStateFilter && (
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="filter-state" className="text-xs font-medium text-slate-700">State</Label>
                    <Select
                      value={filterState}
                      onValueChange={(e) => setFilterState(e)}
                    >
                      <SelectTrigger className={`w-full h-9 ${filterState !== 'all' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}`}>
                        <SelectValue>{filterState === 'all' ? 'All States' : filterState}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {uniqueStates.sort().map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="sort" className="text-xs font-medium text-slate-700">Sort by</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(e) => setSortBy(e as 'name' | 'date' | 'spending')}
                  >
                    <SelectTrigger className={`w-full h-9 ${sortBy !== 'date' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}`}>
                      <SelectValue>
                        {sortBy === 'name' ? 'Name (A-Z)' : sortBy === 'date' ? 'Date Added (Newest)' : 'Spending (Highest)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date Added (Newest)</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="spending">Spending (Highest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer List */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {isLoading ? (
            <ListSkeleton count={5} />
          ) : filteredSortedCustomers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-slate-500 text-sm">
                  {searchTerm ? 'No customers found matching your search.' : 'No customers yet.'}
                </p>
                {!searchTerm && (
                  <Button
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Customer
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredSortedCustomers.map(customer => {
              const totalSpent = getCustomerSpending(customer.id);
              const invoiceCount = getCustomerInvoiceCount(customer.id);

              return (
                <Card key={customer.id} className="cursor-pointer hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all" onClick={() => navigate(`/create-invoice?customerId=${customer.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className="font-semibold text-slate-900 truncate hover:text-[var(--color-primary)]"
                          >
                            {customer.name}
                          </h3>
                          {totalSpent > 0 && (
                            <div className="flex-shrink-0 text-right">
                              <p className="text-sm font-semibold text-green-600">₹{totalSpent.toLocaleString('en-IN')}</p>
                              <p className="text-xs text-slate-500">{invoiceCount} {invoiceCount === 1 ? 'invoice' : 'invoices'}</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs sm:text-sm text-slate-600">
                          <p>{customer.phone}</p>
                          {customer.gstin && <p className="font-mono text-xs">GSTIN: {customer.gstin}</p>}
                          {customer.address && <p className="truncate">{customer.address}</p>}
                          <p>{customer.state}</p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200">
                          <p className="text-xs text-[var(--color-primary)] font-medium">Click to create bill</p>
                        </div>
                      </div>
                      <div className="flex gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(customer);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  );
}