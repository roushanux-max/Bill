import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Plus, Search, Eye, Pencil, Download, Share2, Trash2, Filter, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Invoice } from '../types/invoice';
import { getInvoices, deleteInvoice, saveInvoice, getStoreInfo, getBrandingSettings } from '../utils/storage';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { generateInvoicePDF, getInvoiceFilename } from '../utils/generateInvoicePDF';
import { formatDateForDisplay, parseDateFromDisplay } from '../utils/dateUtils';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async (force = true) => {
    const data = await getInvoices(force);
    setInvoices(data);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      await deleteInvoice(id);
      await loadInvoices();
      toast.success('Invoice deleted successfully!');
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    const newInvoice: Invoice = {
      ...invoice,
      id: crypto.randomUUID(),
      invoiceNumber: `${invoice.invoiceNumber}-COPY`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveInvoice(newInvoice);
    await loadInvoices();
    toast.success('Invoice duplicated successfully!');
  };

  const handleView = (invoice: Invoice) => {
    localStorage.setItem('previewInvoice', JSON.stringify(invoice));
    navigate(`/invoice-preview?return=${encodeURIComponent('/invoices')}`);
  };

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

  // Helper function to check if date is in range
  const isDateInRange = (dateStr: string, fromDate: string, toDate: string) => {
    if (!fromDate && !toDate) return true;

    const date = parseDateString(dateStr);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    if (from && to) {
      return date >= from && date <= to;
    } else if (from) {
      return date >= from;
    } else if (to) {
      return date <= to;
    }
    return true;
  };

  // Apply filters and search
  const getFilteredAndSortedInvoices = () => {
    let filtered = invoices;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        (invoice.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.customer?.phone || '').includes(searchTerm)
      );
    }

    // Status filter (for future implementation - currently all are pending)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(invoice => {
        // For future: implement paid/pending status
        return true;
      });
    }

    // Date range filter
    if (filterDateFrom || filterDateTo) {
      filtered = filtered.filter(invoice =>
        isDateInRange(invoice.date, filterDateFrom, filterDateTo)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return (b.grandTotal || 0) - (a.grandTotal || 0);
        case 'customer':
          return (a.customer?.name || '').localeCompare(b.customer?.name || '');
        case 'date':
        default: {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
      }
    });

    return sorted;
  };

  const filteredInvoices = getFilteredAndSortedInvoices();

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSortBy('date');
    toast.success('Filters cleared');
  };

  const hasActiveFilters = filterStatus !== 'all' || filterDateFrom || filterDateTo || sortBy !== 'date';

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  const handleDownload = async (invoice: Invoice) => {
    setIsGenerating(true);
    const toastId = toast.loading('Generating PDF...');
    try {
      const storeInfo = await getStoreInfo();
      if (!storeInfo) {
        toast.error('Store info not found. Please complete your shop setup.', { id: toastId });
        return;
      }
      const brandSettings = await getBrandingSettings() || defaultBrandingSettings;
      const pdf = generateInvoicePDF(invoice, storeInfo, brandSettings);
      const filename = getInvoiceFilename(invoice);
      pdf.save(filename);
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (invoice: Invoice) => {
    setIsGenerating(true);
    const toastId = toast.loading('Preparing to share...');
    try {
      const storeInfo = await getStoreInfo();
      const brandSettings = await getBrandingSettings() || defaultBrandingSettings;
      const pdf = generateInvoicePDF(invoice, storeInfo!, brandSettings);
      const filename = getInvoiceFilename(invoice);
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice for ${invoice.customer?.name || 'Customer'}`,
          files: [file],
        });
        toast.dismiss(toastId);
      } else {
        // Fallback: download the PDF
        pdf.save(filename);
        toast.dismiss(toastId);
        toast.success('PDF downloaded!', { id: toastId });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Sharing failed', { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 transition-colors font-medium text-sm sm:text-base"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Invoices</h1>
          </div>
          <Link to="/create-invoice" className="hidden sm:flex">
            <Button size="sm" className="bg-amber-400 hover:bg-amber-500 text-slate-900 border-none font-semibold px-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </header>

      <main className="px-4 py-4 sm:py-8 max-w-6xl mx-auto">
        {/* Search */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={hasActiveFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? "bg-[var(--color-primary)] hover:opacity-90" : ""}
              disabled={invoices.length === 0}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters {hasActiveFilters && `(${[filterStatus !== 'all', filterDateFrom, filterDateTo, sortBy !== 'date'].filter(Boolean).length})`}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}

            {showFilters && (
              <Card className="w-full sm:w-auto mt-2">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Status</label>
                      <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as 'all' | 'paid' | 'pending' | 'overdue')}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date From */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">From Date</label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Date To */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">To Date</label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Sort By */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Sort By</label>
                      <Select
                        value={sortBy}
                        onValueChange={(value) => setSortBy(value as 'date' | 'amount' | 'customer')}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date (Newest)</SelectItem>
                          <SelectItem value="amount">Amount (High to Low)</SelectItem>
                          <SelectItem value="customer">Customer (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-slate-600">
                      {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
                    </span>
                    <div className="flex gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Clear All
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Invoice List */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500 text-sm mb-4">
                  {searchTerm ? 'No invoices found' : 'No invoices yet. Create your first invoice!'}
                </p>
                {!searchTerm && (
                  <Link to="/create-invoice">
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map(invoice => (
              <Card
                key={invoice.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleView(invoice)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header: Invoice number and date */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-base">#{invoice.invoiceNumber || 'N/A'}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(invoice.date)} • {new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Badge>
                      </div>

                      {/* Customer details */}
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-900 text-sm">{invoice.customer?.name || 'Unknown Customer'}</p>
                        {invoice.customer?.address && (
                          <p className="text-xs text-slate-600 line-clamp-1">{invoice.customer.address}</p>
                        )}
                        {invoice.customer?.phone && (
                          <p className="text-xs text-slate-600">{invoice.customer.phone}</p>
                        )}
                      </div>

                      {/* Item count */}
                      <p className="text-xs text-slate-600">
                        {(invoice.items?.length || 0)} item{(invoice.items?.length || 0) !== 1 ? 's' : ''}
                      </p>

                      {/* Total amount */}
                      <div className="pt-1">
                        <span className="text-base font-bold text-slate-900">
                          ₹{(invoice.grandTotal || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/create-invoice?edit=${invoice.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(invoice)}
                        className="h-8 w-8 p-0 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        title="Download PDF"
                        disabled={isGenerating}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(invoice)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Share"
                        disabled={isGenerating}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(invoice.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                        disabled={isGenerating}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}