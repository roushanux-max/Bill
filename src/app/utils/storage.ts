import { Customer, Product, Invoice, StoreInfo, InvoiceItem, Payment, ActivityLog } from '../types/invoice';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { parseDateFromDisplay } from './dateUtils';

// Helper to get user-specific storage key
export const getUserKey = (key: string) => {
  if (typeof window === 'undefined') return key;

  // 1. Try immediate recall from our manual cache
  let storedUser = localStorage.getItem('bill_user_id');

  // 2. If missing, try to extract from Supabase's own storage patterns
  if (!storedUser) {
    try {
      const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (authKey) {
        const tokenData = localStorage.getItem(authKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          const userId = parsed?.user?.id;
          if (userId) {
            storedUser = userId;
            localStorage.setItem('bill_user_id', userId);
          }
        }
      }
    } catch (e) {
      console.error('Error extracting user ID for storage key:', e);
    }
  }

  // If we still don't have a user ID, we return the base key to avoid "undefined_" prefixes
  // which would cause data to be lost once the user ID finally arrives.
  return storedUser ? `${storedUser}_${key}` : key;
};

// Helper to get active store ID
const getActiveStoreId = () => localStorage.getItem(getUserKey('active_store_id'));

export const getStoreInfo = async (force = false): Promise<StoreInfo | null> => {
  // Try local first for instant recall
  if (!force) {
    const localData = localStorage.getItem(getUserKey('bill_store_info'));
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing local store info:', e);
      }
    }
  }

  let storeId = getActiveStoreId();

  // If no storeId, we MUST try to fetch by user_id to restore persistence
  if (!storeId || storeId.startsWith('offline-')) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (user && !authError) {
      // Aggressive lookup by user_id
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data && !error) {
        storeId = data.id;
        localStorage.setItem(getUserKey('active_store_id'), storeId!);
        // Fall through to finalize the StoreInfo object below
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // Fetch/Refresh with known storeId
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (data && !error) {
    const info: StoreInfo = {
      name: data.business_name || data.name || '',
      ownerName: data.owner_name || '',
      gstin: data.gstin || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      pincode: data.pincode || '',
      phone: data.phone || '',
      email: data.email || '',
      authDistributors: data.auth_distributors || '',
    };
    localStorage.setItem(getUserKey('bill_store_info'), JSON.stringify(info));
    return info;
  }

  return null;
};

export const saveStoreInfo = async (info: StoreInfo): Promise<StoreInfo> => {
  // Update local storage first for immediate UI response
  localStorage.setItem(getUserKey('bill_store_info'), JSON.stringify(info));
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // ALWAYS ensure this is set for prefixes immediately
    localStorage.setItem('bill_user_id', user.id); 

    try {
      let storeId = getActiveStoreId();
      
      // If no storeId or if it's a temporary offline ID, use user.id as a pivot
      if (!storeId || storeId.startsWith('offline-')) {
        storeId = user.id; 
        localStorage.setItem(getUserKey('active_store_id'), storeId);
      }
      
      const payload: any = {
        id: storeId,
        user_id: user.id,   // CRITICAL: ensures store is findable by user_id after re-login
        business_name: info.name,
        gstin: info.gstin,
        address: info.address,
        city: info.city,
        state: info.state,
        pincode: info.pincode,
        phone: info.phone,
        email: info.email,
        auth_distributors: info.authDistributors,
        updated_at: new Date().toISOString()
      };

      if (info.ownerName) payload.owner_name = info.ownerName;

      // Use a standard upsert - if id matches it updates, if not it inserts
      // The policy should allow based on user_id
      const upsertPromise = supabase.from('stores').upsert(payload, {
        onConflict: 'id'
      });
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));

      const { error } = await Promise.race([upsertPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Supabase store sync failed/timed out:', error, 'Payload:', payload);
        toast.error('Failed to sync to cloud: ' + (error.message || 'Timeout'));
      }
    } catch (err) {
      console.error('Failed to sync store info:', err);
    }
  }

  return info;
};

export const getBrandingSettings = async (force = false): Promise<BrandingSettings> => {
  // Try local first
  if (!force) {
    const localData = localStorage.getItem(getUserKey('bill_branding_settings'));
    if (localData) {
      try {
        return JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing local branding settings:', e);
      }
    }
  }

  let storeId = getActiveStoreId();

  if (!storeId) {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    const user = supabaseUser || { id: '00000000-0000-0000-0000-000000000000' };
    if (user) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (stores && stores.length > 0) {
        storeId = stores[0].id;
        localStorage.setItem(getUserKey('active_store_id'), storeId as string);
      }
    }
  }

  if (!storeId) return defaultBrandingSettings;

  const { data, error } = await supabase
    .from('stores')
    .select('branding_settings')
    .eq('id', storeId)
    .single();

  if (error || !data || !data.branding_settings) {
    if (force) return defaultBrandingSettings;
    return defaultBrandingSettings;
  }

  const settings = data.branding_settings as BrandingSettings;
  localStorage.setItem(getUserKey('bill_branding_settings'), JSON.stringify(settings));
  return settings;
};

export const saveBrandingSettings = async (brandingSettings: BrandingSettings) => {
  const storeId = getActiveStoreId();

  // Save local first
  localStorage.setItem(getUserKey('bill_branding_settings'), JSON.stringify(brandingSettings));

  if (!storeId) return;

  await supabase
    .from('stores')
    .update({
      branding_settings: brandingSettings,
    })
    .eq('id', storeId);
};

// Customers
export const getCustomers = async (force = false, limit = 50): Promise<Customer[]> => {
  // Try local first for performance and offline resilience
  const localData = localStorage.getItem(getUserKey('bill_customers'));
  if (localData && !force) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Error parsing local customers:', e);
    }
  }

  let storeId = getActiveStoreId();

  if (!storeId) {
    // If we have local data but no storeId, return the local data anyway
    if (localData) {
      try { return JSON.parse(localData); } catch (e) { }
    }
    return [];
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  const customers = (data || []).map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    email: c.email || '',
    gstin: c.gstin || '',
    address: c.address || '',
    state: c.state || '',
    createdAt: c.created_at,
  }));

  localStorage.setItem(getUserKey('bill_customers'), JSON.stringify(customers));
  return customers;
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const storeId = getActiveStoreId();
  if (!storeId || !query.trim()) return getCustomers();

  const searchQuery = `%${query.trim()}%`;
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .or(`name.ilike.${searchQuery},phone.ilike.${searchQuery},state.ilike.${searchQuery}`)
    .limit(20);

  if (error || !data) {
    // Fallback to local search
    const all = await getCustomers();
    const lowQuery = query.toLowerCase();
    return all.filter(c => 
      c.name.toLowerCase().includes(lowQuery) || 
      c.phone.toLowerCase().includes(lowQuery) || 
      c.state.toLowerCase().includes(lowQuery)
    ).slice(0, 20);
  }

  return data.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    email: c.email || '',
    gstin: c.gstin || '',
    address: c.address || '',
    state: c.state || '',
    createdAt: c.created_at,
  }));
};

export const saveCustomer = async (customer: Customer) => {
  // Update local storage first for immediate UI response and offline resilience
  const currentCustomers = await getCustomers() || [];
  const index = currentCustomers.findIndex(c => c.id === customer.id);
  const updatedCustomers = index >= 0
    ? currentCustomers.map((c, i) => i === index ? customer : c)
    : [...currentCustomers, customer];

  localStorage.setItem(getUserKey('bill_customers'), JSON.stringify(updatedCustomers));

  const storeId = getActiveStoreId();
  if (!storeId) return;

  const customerData = {
    store_id: storeId,
    name: customer.name,
    phone: customer.phone,
    gstin: customer.gstin,
    address: customer.address,
    state: customer.state,
  };

  try {
    const upsertPromise = (customer.id && customer.id.length > 20)
      ? supabase.from('customers').upsert({ id: customer.id, ...customerData })
      : supabase.from('customers').insert(customerData);

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));
    
    await Promise.race([upsertPromise, timeoutPromise]);
  } catch (e) {
    console.warn('Supabase customer sync failed/timed out:', e);
  }
};

export const deleteCustomer = async (id: string) => {
  // Remove from local storage immediately (targeted — don't wipe all customers)
  const localData = localStorage.getItem(getUserKey('bill_customers'));
  if (localData) {
    try {
      const customers = JSON.parse(localData) as Customer[];
      const updated = customers.filter(c => c.id !== id);
      localStorage.setItem(getUserKey('bill_customers'), JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating local customers on delete:', e);
    }
  }

  // Also attempt to remove from Supabase (best-effort)
  try {
    await supabase.from('customers').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase customer delete failed:', e);
  }
};

// Products
export const getProducts = async (force = false, limit = 50): Promise<Product[]> => {
  // Try local first
  const localData = localStorage.getItem(getUserKey('bill_products'));
  if (localData && !force) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Error parsing local products:', e);
    }
  }

  let storeId = getActiveStoreId();

  if (!storeId) {
    // Return local data if available even if storeId is missing
    if (localData) {
      try { return JSON.parse(localData); } catch (e) { }
    }
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  const products = (data || []).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category || 'Other',
    hsnCode: p.hsn_code || '',
    sellingPrice: Number(p.rate),
    gstRate: Number(p.tax_percent),
    unit: p.unit || 'pcs',
    createdAt: p.created_at,
  }));

  localStorage.setItem(getUserKey('bill_products'), JSON.stringify(products));
  return products;
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const storeId = getActiveStoreId();
  if (!storeId || !query.trim()) return getProducts();

  const searchQuery = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .or(`name.ilike.${searchQuery},category.ilike.${searchQuery}`)
    .limit(20);

  if (error || !data) {
    // Fallback to local search
    const all = await getProducts();
    const lowQuery = query.toLowerCase();
    return all.filter(p => 
      p.name.toLowerCase().includes(lowQuery) || 
      p.category.toLowerCase().includes(lowQuery)
    ).slice(0, 20);
  }

  return data.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category || 'Other',
    hsnCode: p.hsn_code || '',
    sellingPrice: Number(p.rate),
    gstRate: Number(p.tax_percent),
    unit: p.unit || 'pcs',
    createdAt: p.created_at,
  }));
};

export const saveProduct = async (product: Product) => {
  // Update local storage first
  const currentProducts = await getProducts() || [];
  const index = currentProducts.findIndex(p => p.id === product.id);
  const updatedProducts = index >= 0
    ? currentProducts.map((p, i) => i === index ? product : p)
    : [...currentProducts, product];

  localStorage.setItem(getUserKey('bill_products'), JSON.stringify(updatedProducts));

  const storeId = getActiveStoreId();
  if (!storeId) return;

  const productData = {
    store_id: storeId,
    name: product.name,
    category: product.category,
    hsn_code: product.hsnCode,
    rate: product.sellingPrice,
    tax_percent: product.gstRate,
    unit: product.unit,
  };

  try {
    const upsertPromise = (product.id && product.id.length > 20)
      ? supabase.from('products').upsert({ id: product.id, ...productData })
      : supabase.from('products').insert(productData);

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));
    
    await Promise.race([upsertPromise, timeoutPromise]);
  } catch (e) {
    console.warn('Supabase product sync failed/timed out:', e);
  }
};

export const deleteProduct = async (id: string) => {
  // Remove from local storage immediately (targeted — don't wipe all products)
  const localData = localStorage.getItem(getUserKey('bill_products'));
  if (localData) {
    try {
      const products = JSON.parse(localData) as Product[];
      const updated = products.filter(p => p.id !== id);
      localStorage.setItem(getUserKey('bill_products'), JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating local products on delete:', e);
    }
  }

  // Also attempt to remove from Supabase (best-effort)
  try {
    await supabase.from('products').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase product delete failed:', e);
  }
};

// Invoices
export const getInvoices = async (force = false): Promise<Invoice[]> => {
  // Try local first
  const localData = localStorage.getItem(getUserKey('bill_invoices'));
  if (localData && !force) {
    try {
      const parsed = JSON.parse(localData);
      if (Array.isArray(parsed)) {
        return parsed.filter(inv => inv && inv.id);
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing local invoices:', e);
    }
  }

  let storeId = getActiveStoreId();

  if (!storeId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).limit(1).single();
      if (store) {
        storeId = store.id;
        localStorage.setItem(getUserKey('active_store_id'), storeId!);
      }
    }
  }

  if (!storeId) return [];

  // Fetch metadata only for the list
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(*), items:invoice_items(count)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetch failed:', error);
    return [];
  }

  const invoices = (data || [])
    .map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      date: inv.date,
      customerId: inv.customer_id,
      customer: {
        id: inv.customers?.id,
        name: inv.customers?.name || 'Deleted Customer',
        gstin: inv.customers?.gstin || '',
        address: inv.customers?.address || '',
        state: inv.customers?.state || '',
        phone: inv.customers?.phone || '',
        email: inv.customers?.email || '',
        createdAt: inv.customers?.created_at,
      },
      // For listing, we just need the count, but we'll mock an empty array or length-only for UI compatibility
      items: new Array(inv.items?.[0]?.count || 0).fill({}) as any[],
      subtotal: Number(inv.subtotal),
      taxTotal: Number(inv.tax_total),
      discountTotal: Number(inv.discount_total),
      grandTotal: Number(inv.grand_total),
      transportCharges: Number(inv.transport_charges) || 0,
      notes: inv.notes || '',
      status: inv.status || 'unpaid',
      createdAt: inv.created_at,
      updatedAt: inv.updated_at || inv.created_at,
      store_id: storeId,
    }))
    // Filter out "ghost" invoices (usually duplicates or artifacts of deleted customers with 0 total)
    .filter(inv => !(inv.customer.name === 'Deleted Customer' && inv.grandTotal === 0));

  localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(invoices));
  return invoices;
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, customers(*)')
    .eq('id', id)
    .single();

  if (error || !inv) return null;

  // Fetch Items separately
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id);

  return {
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    date: inv.date,
    customerId: inv.customer_id,
    customer: {
      id: inv.customers?.id,
      name: inv.customers?.name || 'Deleted Customer',
      gstin: inv.customers?.gstin || '',
      address: inv.customers?.address || '',
      state: inv.customers?.state || '',
      phone: inv.customers?.phone || '',
      email: inv.customers?.email || '',
      createdAt: inv.customers?.created_at,
    },
    items: (items || []).map(item => ({
      id: item.id,
      invoice_id: item.invoice_id,
      product_id: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      hsn: item.hsn,
      unit: item.unit,
      taxRate: Number(item.tax_rate),
      taxAmount: Number(item.tax_amount),
      discountAmount: Number(item.discount_amount),
      totalAmount: Number(item.total_amount),
    })),
    subtotal: Number(inv.subtotal),
    taxTotal: Number(inv.tax_total),
    discountTotal: Number(inv.discount_total),
    grandTotal: Number(inv.grand_total),
    transportCharges: Number(inv.transport_charges) || 0,
    notes: inv.notes || '',
    status: inv.status || 'unpaid',
    createdAt: inv.created_at,
    updatedAt: inv.updated_at || inv.created_at,
    store_id: inv.store_id,
  };
};

export const saveInvoice = async (invoice: Invoice): Promise<string | undefined> => {
  // 1. Always save to localStorage first so the app works offline / for preview
  try {
    const localRaw = localStorage.getItem(getUserKey('bill_invoices'));
    const localInvoices: Invoice[] = localRaw ? JSON.parse(localRaw) : [];
    const idx = localInvoices.findIndex(i => i.id === invoice.id);
    const updated = idx >= 0
      ? localInvoices.map((i, n) => n === idx ? invoice : i)
      : [invoice, ...localInvoices];
    localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(updated));
  } catch (e) {
    console.warn('Local invoice save failed:', e);
  }

  const storeId = getActiveStoreId();
  if (!storeId) return invoice.id;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return invoice.id;

  const metadata = {
    user_id: user.id,
    store_id: storeId,
    customer_id: invoice.customerId,
    invoice_number: invoice.invoiceNumber,
    date: parseDateFromDisplay(invoice.date),
    subtotal: invoice.subtotal,
    tax_total: invoice.taxTotal,
    discount_total: invoice.discountTotal,
    grand_total: invoice.grandTotal,
    transport_charges: invoice.transportCharges || 0,
    notes: invoice.notes || '',
    status: invoice.status || 'unpaid',
  };

  try {
    // 2. Upsert Invoice Metadata
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .upsert({ id: invoice.id, ...metadata })
      .select('id')
      .single();

    if (invError) {
      console.warn('Invoice metadata sync failed (continuing anyway):', invError.message);
      return invoice.id;
    }

    if (!invData) return invoice.id;
    const invId = invData.id;

    // 3. Upsert Invoice Items (best-effort, don't block)
    if (invoice.items && invoice.items.length > 0) {
      const itemsPayload = invoice.items
        .filter(item => (item.productName || (item as any).name))
        .map(item => ({
          id: (item.id && item.id.length > 30) ? item.id : crypto.randomUUID(),
          user_id: user.id,
          invoice_id: invId,
          product_id: (item.product_id && item.product_id.length > 30) ? item.product_id : null,
          product_name: item.productName || (item as any).name || 'Item',
          unit_price: Number(item.unitPrice || (item as any).rate || 0),
          quantity: Number(item.quantity || 0),
          hsn: item.hsn || '',
          unit: item.unit || 'pcs',
          tax_rate: Number(item.taxRate || 0),
          tax_amount: Number(item.taxAmount || 0),
          discount_amount: Number(item.discountAmount || 0),
          total_amount: Number(item.totalAmount || 0),
        }));

      // Delete old items and re-insert (best-effort)
      await supabase.from('invoice_items').delete().eq('invoice_id', invId);

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.warn('Invoice items sync failed (stored locally):', itemsError.message);
      }
    }

    // Clear list cache so next getInvoices() fetches fresh data
    localStorage.removeItem(getUserKey('bill_invoices'));
    return invId;
  } catch (e) {
    console.warn('Supabase invoice sync error (stored locally):', e);
    return invoice.id;
  }
};


export const deleteInvoice = async (id: string) => {
  // Remove from localStorage first (targeted, don't wipe all invoices)
  const localRaw = localStorage.getItem(getUserKey('bill_invoices'));
  if (localRaw) {
    try {
      const local = JSON.parse(localRaw) as Invoice[];
      const updated = local.filter(inv => inv.id !== id);
      localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(updated));
    } catch (_) { }
  }
  // Best-effort Supabase delete
  try {
    await supabase.from('invoices').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase invoice delete failed:', e);
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  try {
    const invoices = await getInvoices();
    if (!invoices || invoices.length === 0) return '1001';

    let maxNum = 1000;

    for (const inv of invoices) {
      if (inv.invoiceNumber) {
        const numStr = inv.invoiceNumber.replace(/\D/g, '');
        if (numStr) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    return (maxNum + 1).toString();
  } catch (e) {
    console.error('Error calculating next invoice number:', e);
    return '1001';
  }
};

export const getPayments = async (invoiceId?: string): Promise<Payment[]> => {
  let query = supabase.from('payments').select('*');
  if (invoiceId) query = query.eq('invoice_id', invoiceId);
  
  const { data, error } = await query.order('payment_date', { ascending: false });
  if (error) return [];
  
  return (data || []).map(p => ({
    id: p.id,
    user_id: p.user_id,
    invoice_id: p.invoice_id,
    amount: Number(p.amount),
    payment_date: p.payment_date,
    payment_method: p.payment_method,
    notes: p.notes,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
};

export const savePayment = async (payment: Partial<Payment>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload = {
    ...payment,
    user_id: user.id,
  };

  const { error } = await supabase.from('payments').upsert(payload);
  if (error) throw error;
};

export const logActivity = async (action: string, entityType: string, entityId?: string, metadata?: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
};

// Realtime subscriptions helpers
export const subscribeToInvoices = (callback: (payload: any) => void) => {
  const channel = supabase.channel('invoices-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
      // Do NOT wipe localStorage here — that was causing saved invoices to disappear.
      // Just notify the component so it can decide what to reload.
      callback(payload);
    });

  channel.subscribe();

  return async () => {
    try {
      await channel.unsubscribe();
    } catch (e) {
      // ignore
    }
  };
};

export const subscribeToProducts = (callback: (payload: any) => void) => {
  const channel = supabase.channel('products-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      localStorage.removeItem(getUserKey('bill_products'));
      callback(payload);
    });

  channel.subscribe();

  return async () => {
    try {
      await channel.unsubscribe();
    } catch (e) {
      // ignore
    }
  };
};

export const subscribeToCustomers = (callback: (payload: any) => void) => {
  const channel = supabase.channel('customers-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
      localStorage.removeItem(getUserKey('bill_customers'));
      callback(payload);
    });

  channel.subscribe();

  return async () => {
    try {
      await channel.unsubscribe();
    } catch (e) {
      // ignore
    }
  };
};

export const subscribeToStores = (callback: (payload: any) => void) => {
  const channel = supabase.channel('stores-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, (payload) => {
      localStorage.removeItem(getUserKey('bill_store_info'));
      localStorage.removeItem(getUserKey('bill_branding_settings'));
      callback(payload);
    });

  channel.subscribe();

  return async () => {
    try {
      await channel.unsubscribe();
    } catch (e) {
      // ignore
    }
  };
};