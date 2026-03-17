export interface Customer {
  id: string;
  user_id?: string;
  store_id?: string;
  name: string;
  phone: string;
  email?: string;
  gstin: string;
  address: string;
  state: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  user_id?: string;
  store_id?: string;
  name: string;
  category: string;
  hsnCode: string;
  sellingPrice: number;
  gstRate: number;
  unit: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  user_id?: string;
  invoice_id: string;
  product_id?: string;
  productName: string; // Snapshot
  unitPrice: number;   // Snapshot
  quantity: number;
  hsn?: string;
  unit?: string;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  user_id?: string;
  store_id: string;
  customerId: string;
  invoiceNumber: string;
  date: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  transportCharges: number;
  notes: string;
  status: 'unpaid' | 'paid' | 'overdue' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  // UI Helpers (populated on load)
  items?: InvoiceItem[];
  customer?: Customer;
}

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: any;
  createdAt: string;
}

export interface StoreInfo {
  id?: string;
  user_id?: string;
  name: string;
  ownerName?: string;
  gstin: string;
  address: string;
  city?: string;
  state: string;
  pincode?: string;
  phone: string;
  email: string;
  authDistributors?: string;
  branding_settings?: any;
}
