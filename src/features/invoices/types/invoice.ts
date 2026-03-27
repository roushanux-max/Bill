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
  isSynced?: boolean;
  lastSyncedAt?: string;
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
  isSynced?: boolean;
  lastSyncedAt?: string;
}

export interface InvoiceItem {
  id: string;
  user_id?: string;
  invoice_id: string;
  product_id?: string;
  productName: string; // Snapshot
  unitPrice: number; // Snapshot
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
  isSynced?: boolean;
  lastSyncedAt?: string;
  // UI Helpers (populated on load)
  items: InvoiceItem[];
  customer: Customer;
  dueDate?: string;
  guestCreatedAt?: number;
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
  branding_settings?: any; // Contains domain metadata now
}

export interface CustomerPayload {
  id?: string;
  user_id: string;
  store_id: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  state: string;
  email?: string;
}

export interface ProductPayload {
  id?: string;
  user_id: string;
  store_id: string;
  name: string;
  category: string;
  hsn_code: string;
  rate: number;
  tax_percent: number;
  unit: string;
}

export interface InvoicePayload {
  id?: string;
  user_id: string;
  store_id: string;
  customer_id: string;
  invoice_number: string;
  date: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  transport_charges: number;
  notes: string;
  status: string;
  local_invoice_id?: string;
  customer_name?: string;
  customer_phone?: string;
}
