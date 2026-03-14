import { Customer, Product, Invoice, StoreInfo, InvoiceItem } from '../types/invoice';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { supabase } from './supabase';
import { parseDateFromDisplay } from './dateUtils';

// Helper to get user-specific storage key
export const getUserKey = (key: string) => {
  const authData = localStorage.getItem('sb-whmmhfldrigyyqqlqygo-auth-token'); // Check if this is the right key or if we should use a more stable one
  // Actually, let's try to get user ID from supabase directly if possible, 
  // but for synchronous localStorage access, we might need a stored user ID.
  const storedUser = localStorage.getItem('bill_user_id');
  return storedUser ? `${storedUser}_${key}` : key;
};

// Helper to get active store ID
const getActiveStoreId = () => localStorage.getItem(getUserKey('active_store_id'));

// Store Info
export const getStoreInfo = async (): Promise<StoreInfo | null> => {
  // Try local first for instant recall
  const localData = localStorage.getItem(getUserKey('bill_store_info'));
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Error parsing local store info:', e);
    }
  }

  let storeId = getActiveStoreId();

  if (!storeId) {
    // If no active store ID, try to get the first store for the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Check user_id column
      let { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      // 2. Fallback: Check id column matching user.id (old setup pattern)
      if (!data || error) {
        const fallback = await supabase
          .from('stores')
          .select('*')
          .eq('id', user.id)
          .limit(1)
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (data && !error) {
        storeId = data.id as string;
        localStorage.setItem(getUserKey('active_store_id'), storeId);
        // Continue to fetch with this storeId
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // Fetch with storeId
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
      authDistributors: data.auth_distributors || [],
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
    // Ensure active_store_id is set even if Supabase fails later
    localStorage.setItem(getUserKey('active_store_id'), user.id);
    localStorage.setItem('bill_user_id', user.id); // Ensure we have the user ID for prefixes

    try {
      const storeId = getActiveStoreId() || user.id;
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

      const upsertPromise = supabase.from('stores').upsert(payload);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000));

      const { error } = await Promise.race([upsertPromise, timeoutPromise]) as any;

      if (error) {
        console.warn('Supabase store sync failed/timed out, using local storage only:', error.message);
      }
    } catch (err) {
      console.error('Failed to sync store info:', err);
    }
  }

  return info;
};

// Branding Settings
export const getBrandingSettings = async (): Promise<BrandingSettings> => {
  // Try local first
  const localData = localStorage.getItem(getUserKey('bill_branding_settings'));
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error('Error parsing local branding settings:', e);
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
        return parsed.filter(inv => inv && inv.customer && inv.id);
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

  if (!storeId) {
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) return parsed.filter(inv => inv && inv.customer && inv.id);
        return parsed;
      } catch (e) { }
    }
    return [];
  }

  // If we are forcing fetch or have no local data, get from Supabase
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(*)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetch failed, returning local cache:', error);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          return parsed.filter(inv => inv && inv.customer && inv.id);
        }
      } catch (e) { }
    }
    return [];
  }

  const invoices = (data || []).map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    date: inv.date,
    customerId: inv.customer_id,
    customer: {
      name: inv.customers?.name || 'Deleted Customer',
      gstin: inv.customers?.gstin || '',
      address: inv.customers?.address || '',
      state: inv.customers?.state || '',
      phone: inv.customers?.phone || '',
      email: inv.customers?.email || '',
    },
    items: inv.items as InvoiceItem[],
    transportCharges: Number(inv.transport_charges) || 0,
    discount: Number(inv.discount) || 0,
    notes: inv.notes || '',
    subtotal: Number(inv.subtotal),
    totalTax: Number(inv.tax_amount),
    total: Number(inv.total),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at || inv.created_at,
  })).filter(inv => inv && inv.customer && inv.id);

  // Merge with existing local invoices to prevent wiping unsynced offline invoices
  try {
    const localRaw = localStorage.getItem(getUserKey('bill_invoices'));
    if (localRaw) {
      const localInvoices = JSON.parse(localRaw) as Invoice[];
      if (Array.isArray(localInvoices)) {
        // Add any local invoices that don't exist in the remote fetched list (offline ones)
        const remoteIds = new Set(invoices.map(inv => inv.id));
        const unsyncedLocal = localInvoices.filter(localInv =>
          localInv && localInv.id && !remoteIds.has(localInv.id)
        );

        const mergedInvoices = [...unsyncedLocal, ...invoices];
        localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(mergedInvoices));
        return mergedInvoices;
      }
    }
  } catch (e) {
    console.error('Error merging local invoices:', e);
  }

  localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(invoices));
  return invoices;
};

export const saveInvoice = async (invoice: Invoice): Promise<string | undefined> => {
  // Update local storage first
  const currentInvoices = await getInvoices() || [];

  const index = currentInvoices.findIndex(inv => inv.id === invoice.id);
  const updatedInvoices = index >= 0
    ? currentInvoices.map((inv, i) => i === index ? invoice : inv)
    : [invoice, ...currentInvoices];

  localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(updatedInvoices));

  const storeId = getActiveStoreId();
  if (!storeId) return invoice.id;

  const payload = {
    store_id: storeId,
    customer_id: invoice.customerId,
    invoice_number: invoice.invoiceNumber,
    date: parseDateFromDisplay(invoice.date),
    subtotal: invoice.subtotal,
    tax_amount: invoice.totalTax,
    total: invoice.total,
    items: invoice.items,
    transport_charges: invoice.transportCharges || 0,
    discount: invoice.discount || 0,
    notes: invoice.notes || '',
  };

  try {
    const upsertPayload = { ...payload, id: invoice.id };
    const { data, error } = await supabase.from('invoices').upsert(upsertPayload).select('id').single();
    if (!error && data && data.id && data.id !== invoice.id) {
      // DB assigned a new UUID — update localStorage so the invoice is findable by its real ID
      const localRaw = localStorage.getItem(getUserKey('bill_invoices'));
      if (localRaw) {
        try {
          const local = JSON.parse(localRaw) as Invoice[];
          const updated = local.map(inv => inv.id === invoice.id ? { ...inv, id: data.id } : inv);
          localStorage.setItem(getUserKey('bill_invoices'), JSON.stringify(updated));
        } catch (_) { }
      }
      return data.id;
    }
    if (!error && data) return data.id;
  } catch (e) {
    console.warn('Supabase invoice sync failed:', e);
  }

  return invoice.id;
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

    // Find the highest numeric value in the existing invoice numbers
    for (const inv of invoices) {
      if (inv.invoiceNumber) {
        // Extract all digits from the string
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