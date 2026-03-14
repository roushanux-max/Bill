import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '../types/invoice';
import { getProducts, saveProduct, deleteProduct, subscribeToProducts } from '../utils/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const CATEGORIES = ['Furniture', 'Hardware', 'Electronics', 'Other'];
const UNITS = ['pcs', 'box', 'kg', 'meter', 'set'];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterGstRate, setFilterGstRate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'date'>('date');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    hsnCode: '',
    sellingPrice: 0,
    gstRate: 18,
    unit: '',
  });

  useEffect(() => {
    loadProducts();
    const unsubscribe = subscribeToProducts(() => {
      loadProducts();
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      hsnCode: '',
      sellingPrice: 0,
      gstRate: 18,
      unit: '',
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      hsnCode: product.hsnCode,
      sellingPrice: product.sellingPrice,
      gstRate: product.gstRate,
      unit: product.unit,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      await loadProducts();
      toast.success('Product deleted successfully!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.hsnCode) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    try {
      const product: Product = {
        id: editingProduct?.id || crypto.randomUUID(),
        ...formData,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
      };

      await saveProduct(product);
      await loadProducts();
      toast.success(editingProduct ? 'Product updated!' : 'Product added!');
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error('Error saving product:', e);
      toast.error('Failed to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.hsnCode.includes(searchTerm)
  );

  // Check which filters are needed
  const uniqueGstRates = [...new Set(filteredProducts.map(p => p.gstRate))];
  const showGstFilter = true; // Always show GST filter for clarity
  const showAnyFilter = filteredProducts.length > 0;

  // Apply GST filters directly to search results
  const filteredByGst = filterGstRate === 'all'
    ? filteredProducts
    : filteredProducts.filter(product => product.gstRate === parseInt(filterGstRate));

  // Apply sorting
  const sortedProducts = filteredByGst.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'price') {
      return b.sellingPrice - a.sellingPrice;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterGstRate('all');
    setSortBy('date');
    toast.success('Filters cleared');
  };

  const hasActiveFilters = filterCategory !== 'all' || filterGstRate !== 'all' || sortBy !== 'date';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <h1 className="text-lg sm:text-2xl font-semibold text-slate-900">Products</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Product</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Update product information below.' : 'Add a new product to your catalog.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Iron Rack"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsnCode" className="text-sm">HSN Code *</Label>
                    <Input
                      id="hsnCode"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      placeholder="9403"
                      required
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice" className="text-sm">Selling Price *</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        required
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstRate" className="text-sm">GST Rate (%)</Label>
                      <select
                        id="gstRate"
                        value={formData.gstRate}
                        onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) })}
                        className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
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
                        editingProduct ? 'Update Product' : 'Add Product'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
              placeholder="Search products..."
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
                {showAnyFilter && (
                <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-9"
                    disabled={products.length === 0}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                        {(filterGstRate !== 'all' ? 1 : 0) + (sortBy !== 'date' ? 1 : 0)}
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
            {showFilters && showAnyFilter && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                {showGstFilter && (
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="filter-gst" className="text-xs font-medium text-slate-700">GST Rate</Label>
                    <Select
                      value={filterGstRate}
                      onValueChange={(e) => setFilterGstRate(e)}
                    >
                      <SelectTrigger className={`w-full h-9 ${filterGstRate !== 'all' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}`}>
                        <SelectValue>{filterGstRate === 'all' ? 'All GST Rates' : `${filterGstRate}%`}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All GST Rates</SelectItem>
                        {uniqueGstRates.sort((a, b) => a - b).map(rate => (
                          <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="sort" className="text-xs font-medium text-slate-700">Sort by</Label>
                  <Select
                    value={sortBy}
                    onValueChange={(e) => setSortBy(e as 'name' | 'price' | 'date')}
                  >
                    <SelectTrigger className={`w-full h-9 ${sortBy !== 'date' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : ''}`}>
                      <SelectValue>
                        {sortBy === 'date' ? 'Newest First' : sortBy === 'name' ? 'Name (A-Z)' : 'Price (High-Low)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Newest First</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="price">Price (High-Low)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product List */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {sortedProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500 text-sm">
                  {searchTerm ? 'No products found' : 'No products yet. Add your first product!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedProducts.map(product => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{product.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs sm:text-sm text-slate-600">
                        <span className="font-mono text-xs">HSN: {product.hsnCode}</span>
                      </div>
                      <div className="mt-2 flex gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Price: </span>
                          <span className="font-semibold">₹{product.sellingPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">GST: </span>
                          <span className="font-semibold">{product.gstRate}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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