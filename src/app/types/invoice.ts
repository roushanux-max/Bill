export interface Customer {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  state: string;
  email?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  hsnCode: string;
  sellingPrice: number;
  gstRate: number;
  unit: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  name: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customer: {
    name: string;
    gstin: string;
    address: string;
    state: string;
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  transportCharges: number;
  discount: number;
  notes: string;
  subtotal: number;
  totalTax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreInfo {
  name: string;
  ownerName?: string;
  gstin: string;
  address: string;
  state: string;
  phone: string;
  email: string;
  authDistributors?: string;
}
