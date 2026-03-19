import { Customer, Product, Invoice, StoreInfo, InvoiceItem, Payment, ActivityLog, CustomerPayload, ProductPayload, InvoicePayload } from '../types/invoice';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { parseDateFromDisplay } from './dateUtils';

// ─── Safe localStorage Wrappers ──────────────────────────────────────────────
// Guards against SSR (window undefined), JSON errors, and storage quota errors.

/** Read a string value from localStorage. Returns null if unavailable or on error. */
export const safeGet = (key: string): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch (e) {
    console.warn(`[storage] safeGet failed for key "${key}":`, e);
    return null;
  }
};

/** Write a value to localStorage. Silently fails on error (quota, SSR, etc). */
export const safeSet = (key: string, value: string): void => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[storage] safeSet failed for key "${key}":`, e);
  }
};

/** Remove a key from localStorage. Silently fails on error. */
export const safeRemove = (key: string): void => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[storage] safeRemove failed for key "${key}":`, e);
  }
};

// ─── ID Generation ───────────────────────────────────────────────────────────
// Fallback ID generator for non-UUID environments (e.g. some offline items)
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Validates if a given string is a standard 36-character UUID.
 */
export const isUUID = (id: string | undefined | null): boolean => {
  if (!id) return false;
  // Standard UUID format: 8-4-4-4-12 hex chars
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// ─── Generic Storage Array Helpers ──────────────────────────────────────────

export const safeParseJSON = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    console.error('[storage] JSON Parse Error:', e);
    return fallback;
  }
};

export const getCachedData = <T>(key: string, fallback: T): T => {
  const data = safeGet(key);
  return safeParseJSON<T>(data, fallback);
};

export const setCachedData = <T>(key: string, data: T): void => {
  safeSet(key, JSON.stringify(data));
};


// ─── Sync Tracking & Offline Queue ─────────────────────────────────────────────────────────────
let activeSyncTasks = 0;

export interface SyncOperation {
  id: string;
  type: 'store' | 'customer' | 'product' | 'invoice' | 'customer_delete' | 'product_delete' | 'invoice_delete';
  payload: any;
  timestamp: string;
}

export const addToSyncQueue = (type: SyncOperation['type'], payload: any) => {
  const key = getUserKey('bill_sync_queue');
  if (!key) return;
  const queue = getCachedData<SyncOperation[]>(key, []);
  queue.push({
    id: generateId(),
    type,
    payload,
    timestamp: new Date().toISOString()
  });
  setCachedData(key, queue);
};

export const processSyncQueue = async () => {
  const key = getUserKey('bill_sync_queue');
  if (!key) return;
  
  let queue = getCachedData<SyncOperation[]>(key, []);
  if (queue.length === 0) return;

  emitSyncStart();
  let hasError = false;
  const remainingQueue: SyncOperation[] = [];

  for (const op of queue) {
    if (hasError) {
      // Must maintain strict order; if one fails, halt processing and retain the rest
      remainingQueue.push(op);
      continue;
    }

    try {
      if (op.type === 'customer') {
        const { customerData, isUuid, customerId } = op.payload;
        const req = isUuid 
            ? supabase.from('customers').upsert({ id: customerId, ...customerData }) 
            : supabase.from('customers').insert(customerData);
        const { error } = await req;
        if (error) throw error;
        
        // Update local object to synced
        const cKey = getUserKey('bill_customers');
        if (cKey) {
            const arr = getCachedData<Customer[]>(cKey, []);
            const idx = arr.findIndex(c => c.id === customerId);
            if (idx >= 0) { arr[idx].isSynced = true; setCachedData(cKey, arr); }
        }

      } else if (op.type === 'product') {
        const { productData, isUuid, productId } = op.payload;
        const req = isUuid 
            ? supabase.from('products').upsert({ id: productId, ...productData }) 
            : supabase.from('products').insert(productData);
        const { error } = await req;
        if (error) throw error;
        
        const pKey = getUserKey('bill_products');
        if (pKey) {
            const arr = getCachedData<Product[]>(pKey, []);
            const idx = arr.findIndex(p => p.id === productId);
            if (idx >= 0) { arr[idx].isSynced = true; setCachedData(pKey, arr); }
        }

      } else if (op.type === 'store') {
        const { payload } = op.payload;
        const { error } = await supabase.from('stores').upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        
      } else if (op.type === 'invoice') {
        const { metadata, itemsPayload, invId } = op.payload;
        const { error: invError } = await supabase.from('invoices').upsert({ id: invId, ...metadata }).select('id').single();
        if (invError) throw invError;
        
        if (itemsPayload && itemsPayload.length > 0) {
            const { data: existingItems } = await supabase.from('invoice_items').select('id').eq('invoice_id', invId);
            const { error: itemsError } = await supabase.from('invoice_items').upsert(itemsPayload, { onConflict: 'id' });
            if (itemsError) throw itemsError;
            
            if (existingItems) {
                const pIds = new Set(itemsPayload.map((i: any) => i.id));
                const toDelete = existingItems.map(i => i.id).filter(id => !pIds.has(id));
                if (toDelete.length > 0) {
                    await supabase.from('invoice_items').delete().in('id', toDelete);
                }
            }
        } else {
            await supabase.from('invoice_items').delete().eq('invoice_id', invId);
        }
        
        const iKey = getUserKey('bill_invoices');
        if (iKey) {
            const arr = getCachedData<Invoice[]>(iKey, []);
            const idx = arr.findIndex(i => i.id === invId);
            if (idx >= 0) { arr[idx].isSynced = true; setCachedData(iKey, arr); }
        }
        
      } else if (op.type === 'customer_delete') {
         await supabase.from('customers').delete().eq('id', op.payload.id);
      } else if (op.type === 'product_delete') {
         await supabase.from('products').delete().eq('id', op.payload.id);
      } else if (op.type === 'invoice_delete') {
         await supabase.from('invoices').delete().eq('id', op.payload.id);
      }
    } catch (e) {
      console.warn(`Sync queue operation [${op.type}] failed:`, e);
      remainingQueue.push(op);
      hasError = true;
    }
  }

  setCachedData(key, remainingQueue);
  if (remainingQueue.length === 0 && queue.length > 0) {
      toast.success('Offline changes synced to cloud!');
  }
  emitSyncEnd(!hasError);
};

export const emitSyncStart = () => {
  activeSyncTasks++;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bill-sync', { detail: { type: 'saving' } }));
  }
};
export const emitSyncEnd = (success = true) => {
  activeSyncTasks = Math.max(0, activeSyncTasks - 1);
  if (typeof window !== 'undefined' && activeSyncTasks === 0) {
    window.dispatchEvent(new CustomEvent('bill-sync', { detail: success ? 'synced' : 'offline' }));
  }
};

export const getUserKey = (key: string): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Try immediate recall from our manual cache
  let storedUser = safeGet('bill_user_id');

  // 2. If missing, try to extract from Supabase's own storage patterns
  if (!storedUser) {
    try {
      const authKey = Object.keys(window.localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (authKey) {
        const tokenData = safeGet(authKey);
        if (tokenData) {
          const parsed = JSON.parse(tokenData);
          const userId = parsed?.user?.id;
          if (userId) {
            storedUser = userId;
            safeSet('bill_user_id', userId);
          }
        }
      }
    } catch (e) {
      console.error('Error extracting user ID for storage key:', e);
    }
  }

  // If we still don't have a user ID, we return null to prevent data mixing 
  // or storing data under non-user-prefixed keys.
  return storedUser ? `${storedUser}_${key}` : null;
};

// Helper to get active store ID
const getActiveStoreId = () => {
  const key = getUserKey('active_store_id');
  return key ? safeGet(key) : null;
};

export const getStoreInfo = async (force = false): Promise<StoreInfo | null> => {
  // Try local first for instant recall
  if (!force) {
    const key = getUserKey('bill_store_info');
    const localData = key ? safeGet(key) : null;
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
        const key = getUserKey('active_store_id');
        if (key) safeSet(key, storeId!);
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
    .maybeSingle();

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
    const key = getUserKey('bill_store_info');
    if (key) safeSet(key, JSON.stringify(info));
    return info;
  }

  return null;
};

export const saveStoreInfo = async (info: StoreInfo): Promise<StoreInfo> => {
  // Update local storage first for immediate UI response
  const key = getUserKey('bill_store_info');
  if (key) safeSet(key, JSON.stringify(info));
  
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // ALWAYS ensure this is set for prefixes immediately
    safeSet('bill_user_id', user.id); 

    try {
      let storeId = getActiveStoreId();
      
      // If no storeId or if it's a temporary offline ID, use user.id as a pivot
      if (!storeId || storeId.startsWith('offline-')) {
        storeId = user.id; 
        const key = getUserKey('active_store_id');
        if (key) safeSet(key, storeId);
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
      const { error } = await supabase.from('stores').upsert(payload, {
        onConflict: 'id'
      });

      if (error) {
        console.error('Supabase store sync failed:', error, 'Payload:', payload);
        addToSyncQueue('store', { payload });
        toast.error('Failed to sync to cloud: ' + (error.message || 'Unknown error. Working offline. Changes will sync later.'));
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
    const key = getUserKey('bill_branding_settings');
    if (key) {
      const cached = getCachedData<BrandingSettings | null>(key, null);
      if (cached) return cached;
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
        const key = getUserKey('active_store_id');
        if (key) safeSet(key, storeId as string);
      }
    }
  }

  if (!storeId) return defaultBrandingSettings;

  const { data, error } = await supabase
    .from('stores')
    .select('branding_settings')
    .eq('id', storeId)
    .maybeSingle();

  if (error || !data || !data.branding_settings) {
    if (force) return defaultBrandingSettings;
    return defaultBrandingSettings;
  }

  const settings = data.branding_settings as BrandingSettings;
  const key = getUserKey('bill_branding_settings');
  if (key) safeSet(key, JSON.stringify(settings));
  return settings;
};

export const saveBrandingSettings = async (brandingSettings: BrandingSettings) => {
  const storeId = getActiveStoreId();

  // Save local first
  const key = getUserKey('bill_branding_settings');
  if (key) safeSet(key, JSON.stringify(brandingSettings));

  if (!storeId) return;

  await supabase
    .from('stores')
    .update({
      branding_settings: brandingSettings,
    })
    .eq('id', storeId);
};

// Customers
export interface ApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const getCustomers = async (force = false, limit = 50): Promise<ApiResult<Customer[]>> => {
  try {
    // Try local first for performance and offline resilience
    const key = getUserKey('bill_customers');
    if (key && !force) {
      const cached = getCachedData<Customer[]>(key, []);
      if (cached.length > 0) return { data: cached, loading: false, error: null };
    }

    let storeId = getActiveStoreId();

    if (!storeId) {
      // If we have local data but no storeId, return the local data anyway
      return { data: key ? getCachedData<Customer[]>(key, []) : [], loading: false, error: null };
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], loading: false, error: error.message };

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

    if (key) safeSet(key, JSON.stringify(customers));
    return { data: customers, loading: false, error: null };
  } catch (err: any) {
    return { data: [], loading: false, error: err.message || 'Error occurred' };
  }
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const storeId = getActiveStoreId();
  if (!storeId || !query.trim()) {
    const { data } = await getCustomers();
    return data || [];
  }

  const searchQuery = `%${query.trim()}%`;
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('store_id', storeId)
    .or(`name.ilike.${searchQuery},phone.ilike.${searchQuery},state.ilike.${searchQuery}`)
    .limit(20);

  if (error || !data) {
    // Fallback to local search
    const { data: all } = await getCustomers();
    if (!all) return [];
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
  emitSyncStart();
  customer.isSynced = false;
  customer.lastSyncedAt = new Date().toISOString();

  // Update local storage first for immediate UI response and offline resilience
  const { data: currentCustomers } = await getCustomers();
  const index = (currentCustomers || []).findIndex(c => c.id === customer.id);
  let updatedCustomers = index >= 0
    ? (currentCustomers || []).map((c, i) => i === index ? customer : c)
    : [customer, ...(currentCustomers || [])].slice(0, 50);

  const key = getUserKey('bill_customers');
  if (key) safeSet(key, JSON.stringify(updatedCustomers));

  const storeId = getActiveStoreId();
  if (!storeId) {
    emitSyncEnd(false);
    return;
  }

  const customerData: CustomerPayload = {
    store_id: storeId,
    name: customer.name,
    phone: customer.phone,
    gstin: customer.gstin,
    address: customer.address,
    state: customer.state,
  };

  try {
    const upsertPromise = isUUID(customer.id)
      ? supabase.from('customers').upsert({ id: customer.id, ...customerData })
      : supabase.from('customers').insert(customerData);

    await upsertPromise;
    
    // DB Success
    customer.isSynced = true;
    customer.lastSyncedAt = new Date().toISOString();
    updatedCustomers = updatedCustomers.map(c => c.id === customer.id ? customer : c);
    if (key) safeSet(key, JSON.stringify(updatedCustomers));
    
    emitSyncEnd(true);
  } catch (e) {
    console.warn('Supabase customer sync failed:', e);
    addToSyncQueue('customer', { customerData, isUuid: isUUID(customer.id), customerId: customer.id });
    toast('Working offline. Changes will sync later.');
    emitSyncEnd(false);
  }
};

export const deleteCustomer = async (id: string) => {
  // Remove from local storage immediately (targeted — don't wipe all customers)
  const key = getUserKey('bill_customers');
  if (key) {
    const customers = getCachedData<Customer[]>(key, []);
    if (customers.length > 0) {
      setCachedData(key, customers.filter(c => c.id !== id));
    }
  }

  // Also attempt to remove from Supabase (best-effort)
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') { // Foreign key violation
        console.warn('Customer has linked invoices. Using local-only delete for now.');
        // This is a "soft-delete" on the client side since we can't easily add is_deleted column
        // The customer will remain in DB but won't show in the main list because we cleared them from localStorage
        // and getCustomers returns union/filtered data usually.
      } else {
        addToSyncQueue('customer_delete', { id });
        throw error;
      }
    }
  } catch (e) {
    console.warn('Supabase customer delete failed:', e);
  }
};

// Products
export const getProducts = async (force = false, limit = 50): Promise<ApiResult<Product[]>> => {
  try {
    // Try local first
    const key = getUserKey('bill_products');
    if (key && !force) {
      const cached = getCachedData<Product[]>(key, []);
      if (cached.length > 0) return { data: cached, loading: false, error: null };
    }

    let storeId = getActiveStoreId();

    if (!storeId) {
      // Return local data if available even if storeId is missing
      return { data: key ? getCachedData<Product[]>(key, []) : [], loading: false, error: null };
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: [], loading: false, error: error.message };

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

    if (key) safeSet(key, JSON.stringify(products));
    return { data: products, loading: false, error: null };
  } catch (err: any) {
    return { data: [], loading: false, error: err.message || 'Error occurred' };
  }
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const storeId = getActiveStoreId();
  if (!storeId || !query.trim()) {
    const { data } = await getProducts();
    return data || [];
  }

  const searchQuery = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .or(`name.ilike.${searchQuery},category.ilike.${searchQuery}`)
    .limit(20);

  if (error || !data) {
    // Fallback to local search
    const { data: all } = await getProducts();
    if (!all) return [];
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
  emitSyncStart();
  product.isSynced = false;
  product.lastSyncedAt = new Date().toISOString();

  // Update local storage first for immediate UI response
  const { data: currentProducts } = await getProducts();
  const index = (currentProducts || []).findIndex(p => p.id === product.id);
  let updatedProducts = index >= 0
    ? (currentProducts || []).map((p, i) => i === index ? product : p)
    : [product, ...(currentProducts || [])].slice(0, 50);

  const key = getUserKey('bill_products');
  if (key) safeSet(key, JSON.stringify(updatedProducts));

  const storeId = getActiveStoreId();
  if (!storeId) {
    emitSyncEnd(false);
    return;
  }

  const productData: ProductPayload = {
    store_id: storeId,
    name: product.name,
    category: product.category,
    hsn_code: product.hsnCode,
    rate: product.sellingPrice,
    tax_percent: product.gstRate,
    unit: product.unit,
  };

  try {
    const upsertPromise = isUUID(product.id)
      ? supabase.from('products').upsert({ id: product.id, ...productData })
      : supabase.from('products').insert(productData);

    await upsertPromise;

    product.isSynced = true;
    product.lastSyncedAt = new Date().toISOString();
    updatedProducts = updatedProducts.map(p => p.id === product.id ? product : p);
    if (key) safeSet(key, JSON.stringify(updatedProducts));

    emitSyncEnd(true);
  } catch (e) {
    console.warn('Supabase product sync failed:', e);
    addToSyncQueue('product', { productData, isUuid: isUUID(product.id), productId: product.id });
    toast('Working offline. Changes will sync later.');
    emitSyncEnd(false);
  }
};

export const deleteProduct = async (id: string) => {
  // Remove from local storage immediately (targeted — don't wipe all products)
  const key = getUserKey('bill_products');
  if (key) {
    const products = getCachedData<Product[]>(key, []);
    if (products.length > 0) {
      setCachedData(key, products.filter(p => p.id !== id));
    }
  }

  // Also attempt to remove from Supabase (best-effort)
  try {
    await supabase.from('products').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase product delete failed:', e);
    addToSyncQueue('product_delete', { id });
  }
};

// Invoices
export const getInvoices = async (force = false): Promise<ApiResult<Invoice[]>> => {
  try {
    // Try local first
    const key = getUserKey('bill_invoices');
    if (key && !force) {
      const cached = getCachedData<Invoice[]>(key, []);
      if (cached.length > 0) return { data: cached.filter(inv => inv && inv.id), loading: false, error: null };
    }

    let storeId = getActiveStoreId();

    if (!storeId) {
      // Return early with local data if available
      if (key) {
        const cached = getCachedData<Invoice[]>(key, []);
        if (cached.length > 0) return { data: cached.filter(inv => inv && inv.id), loading: false, error: null };
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).limit(1).single();
        if (store) {
          storeId = store.id;
          const sKey = getUserKey('active_store_id');
          if (sKey) safeSet(sKey, storeId!);
        }
      }
      
      if (!storeId) return { data: [], loading: false, error: null };
    }

    // 3. One-time Migration: Link orphaned invoices (store_id IS NULL) to activeStoreId
    // This helps users who had invoices before the multi-store architecture update.
    const migrationKey = getUserKey('invoice_migration_done');
    if (migrationKey && !safeGet(migrationKey)) {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user && storeId) {
        try {
          const { count, error: countError } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .is('store_id', null);
          
          if (!countError && count && count > 0) {
            console.log(`Auto-migrating ${count} legacy invoices to store: ${storeId}`);
            await supabase
              .from('invoices')
              .update({ store_id: storeId })
              .eq('user_id', user.id)
              .is('store_id', null);
          }
          safeSet(migrationKey, 'true');
        } catch (e) {
          console.warn('Silent migration failed:', e);
        }
      }
    }

    if (!storeId) return { data: [], loading: false, error: null };

    // Fetch metadata only for the list
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers(*), items:invoice_items(count)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch failed:', error);
      return { data: [], loading: false, error: error.message };
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
      .filter(inv => {
        const isDeletedCustomer = inv.customer.name === 'Deleted Customer' || !inv.customer.name;
        const isZeroTotal = Number(inv.grandTotal) === 0;
        return !(isDeletedCustomer && isZeroTotal);
      });

    if (key) safeSet(key, JSON.stringify(invoices));
    return { data: invoices, loading: false, error: null };
  } catch (err: any) {
    return { data: [], loading: false, error: err.message || 'Error parsing invoices' };
  }
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  // Fetch metadata and items in a single atomic join-request
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, customers(*), items:invoice_items(*)')
    .eq('id', id)
    .single();

  if (error || !inv) {
    if (error && error.code !== 'PGRST116') {
      console.error('getInvoice: DB Error:', error.message);
    }
    return null;
  }

  const items = inv.items || [];

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
    items: items.map((item: any) => ({
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

const isSavingMap: Record<string, boolean> = {};
const queueMap: Record<string, (() => void)[]> = {};

export const saveInvoice = async (invoice: Invoice): Promise<string | undefined> => {
  emitSyncStart();
  invoice.isSynced = false;
  invoice.lastSyncedAt = new Date().toISOString();

  // Wait if another save is in progress for this exact invoice protecting against race conditions
  await new Promise<void>(resolve => {
    if (!isSavingMap[invoice.id]) {
      isSavingMap[invoice.id] = true;
      resolve();
    } else {
      if (!queueMap[invoice.id]) queueMap[invoice.id] = [];
      queueMap[invoice.id].push(resolve);
    }
  });

  let metadata: InvoicePayload | undefined;
  let itemsPayload: any[] | undefined;

  try {
    // 1. Always save to localStorage first so the app works offline / for preview
    try {
      const key = getUserKey('bill_invoices');
      const localRaw = key ? safeGet(key) : null;
      const localInvoices: Invoice[] = localRaw ? JSON.parse(localRaw) : [];
      const idx = localInvoices.findIndex(i => i.id === invoice.id);
      const updated = idx >= 0
        ? localInvoices.map((i, n) => n === idx ? invoice : i)
        : [invoice, ...localInvoices].slice(0, 50);
      if (key) safeSet(key, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local invoice save failed:', e);
    }

    const storeId = getActiveStoreId();
    if (!storeId) {
      emitSyncEnd(false);
      return invoice.id;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      emitSyncEnd(false);
      return invoice.id;
    }

    metadata = {
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

    // 1.5 Validation: Don't save if it's a completely empty ghost invoice
    if (Number(invoice.grandTotal) === 0 && (!invoice.customer?.name || invoice.customer.name === 'Deleted Customer')) {
      console.warn('Skipping save of ghost invoice');
      emitSyncEnd(true);
      return invoice.id;
    }

    // 2. Upsert Invoice Metadata
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .upsert({ id: invoice.id, ...metadata })
      .select('id')
      .single();

    if (invError) {
      console.warn('Invoice metadata sync failed:', invError.message);
      emitSyncEnd(false);
      return invoice.id;
    }

    if (!invData) {
      emitSyncEnd(false);
      return invoice.id;
    }
    const invId = invData.id;

    // 3. Sync Invoice Items (Atomic fetch, compare, write)
    if (invoice.items && invoice.items.length > 0) {
      itemsPayload = invoice.items
        .filter(item => (item.productName || (item as any).name))
        .map(item => ({
          id: isUUID(item.id) ? item.id : generateId(),
          user_id: user.id,
          invoice_id: invId,
          product_id: isUUID(item.product_id) ? item.product_id : null,
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

      // A. Fetch existing items from DB to compare
      const { data: existingItems, error: fetchError } = await supabase
        .from('invoice_items')
        .select('id')
        .eq('invoice_id', invId);

      if (fetchError) {
        console.warn('Failed to fetch existing items for sync:', fetchError.message);
      }

      // B. Upsert new/modified items safely (prevents 409 Conflict if IDs collide via onConflict)
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .upsert(itemsPayload, { onConflict: 'id' });

      if (itemsError) {
        console.error('Invoice items upsert failed:', itemsError.message);
        throw new Error('Failed to save invoice items: ' + itemsError.message);
      } else if (!fetchError && existingItems) {
        // C. Explicitly delete *only* items that were removed
        const payloadIds = new Set(itemsPayload.map(i => i.id));
        const toDeleteIds = existingItems
          .map(i => i.id)
          .filter(id => !payloadIds.has(id));

        if (toDeleteIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('invoice_items')
            .delete()
            .in('id', toDeleteIds);
            
          if (deleteError) {
            console.warn('Post-sync cleanup failed to delete removed items:', deleteError.message);
          }
        }
        
        console.log(`Successfully synced ${itemsPayload.length} items for invoice ${invId}`);
      }
    } else {
      // 3b. Empty payload: delete all current items for this invoice safely
      await supabase.from('invoice_items').delete().eq('invoice_id', invId);
    }
    
    // DB Success
    invoice.isSynced = true;
    invoice.lastSyncedAt = new Date().toISOString();
    const invKey = getUserKey('bill_invoices');
    if (invKey) {
       const localRaw = safeGet(invKey);
       const localInvoices: Invoice[] = localRaw ? JSON.parse(localRaw) : [];
       const idx = localInvoices.findIndex(i => i.id === invoice.id);
       if (idx >= 0) {
         localInvoices[idx] = invoice;
         safeSet(invKey, JSON.stringify(localInvoices));
       }
    }
    
    emitSyncEnd(true);
    return invId;
  } catch (e) {
    console.warn('Supabase invoice sync error:', e);
    addToSyncQueue('invoice', { metadata, itemsPayload, invId: invoice.id });
    toast('Working offline. Changes will sync later.');
    emitSyncEnd(false);
    return invoice.id;
  } finally {
    // Release lock for this invoice and process next in queue if any
    if (queueMap[invoice.id] && queueMap[invoice.id].length > 0) {
      const next = queueMap[invoice.id].shift();
      if (next) next();
    } else {
      isSavingMap[invoice.id] = false;
    }
  }
};


export const deleteInvoice = async (id: string): Promise<boolean> => {
  // Remove from localStorage first (targeted, don't wipe all invoices)
  const key = getUserKey('bill_invoices');
  if (key) {
    const local = getCachedData<Invoice[]>(key, []);
    if (local.length > 0) {
      setCachedData(key, local.filter(inv => inv.id !== id));
    }
  }
  // Best-effort Supabase delete
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('Supabase invoice delete failed:', e);
    addToSyncQueue('invoice_delete', { id });
    return false;
  }
};

export const getNextInvoiceNumber = async (): Promise<string> => {
  try {
    let maxNum = 1000;

    // Check recent local caching primarily mapping current state
    const { data: invoices } = await getInvoices();
    if (invoices && invoices.length > 0) {
      for (const inv of (invoices || [])) {
        if (inv.invoiceNumber) {
          const numStr = inv.invoiceNumber.replace(/\D/g, '');
          if (numStr) {
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }
    }

    // Actively query DB for authoritative sequence regardless of local trimming
    const storeId = getActiveStoreId();
    if (storeId) {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        for (const row of data) {
           const numStr = row.invoice_number?.replace(/\D/g, '');
           if (numStr) {
             const num = parseInt(numStr, 10);
             if (!isNaN(num) && num > maxNum) maxNum = num;
           }
        }
      }
    }

    return (maxNum + 1).toString();
  } catch (e) {
    console.error('Error calculating next invoice number, falling back to local only:', e);
    // Silent Fallback
    try {
      const { data: invoices } = await getInvoices();
      let maxNum = 1000;
      for (const inv of (invoices || [])) {
         if (inv.invoiceNumber) {
           const numStr = inv.invoiceNumber.replace(/\D/g, '');
           if (numStr) {
             const num = parseInt(numStr, 10);
             if (!isNaN(num) && num > maxNum) maxNum = num;
           }
         }
      }
      return (maxNum + 1).toString();
    } catch {
      return '1001';
    }
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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use current session's email if possible, or fallback to metadata
    const userEmail = user.email || metadata?.email;

    const refinedMetadata = {
      ...metadata,
      email: userEmail,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    };

    await supabase.from('activity_logs').insert([{
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: refinedMetadata
    }]);
  } catch (e) {
    console.warn('Silent log failure:', e);
  }
};

// --- Admin Utilities ---

export const getAdminStats = async () => {
  try {
    // 1. Get total UNIQUE users from stores (primary source of truth)
    const { data: storeUsers } = await supabase.from('stores').select('user_id');
    const totalUsers = new Set(storeUsers?.map(s => s.user_id)).size;

    // 2. Get total invoices today (with created_at timestamp)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: invoicesToday } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    // 3. Get total revenue (valid invoices only: grand_total > 0)
    const { data: revenueData } = await supabase
      .from('invoices')
      .select('grand_total')
      .gt('grand_total', 0);
    const totalRevenue = revenueData?.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0) || 0;

    // 4. Get total receipts (payments)
    const { count: totalPaymentsCount, data: paymentsData } = await supabase
      .from('payments')
      .select('amount', { count: 'exact' });
    const totalPaymentsAmount = paymentsData?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;

    // 5. Get live users (DISTINCT user_id from activity_logs in last 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: liveLogs } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', fifteenMinsAgo);
    const liveUsers = new Set(liveLogs?.map((l: any) => l.user_id)).size;
    
    // 6. Get total invoices count (overall)
    const { count: totalInvoices } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true });

    // 7. Get recent activity logs
    const { data: recentLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      totalUsers,
      liveUsers: liveUsers || 0,
      invoicesToday: invoicesToday || 0,
      totalInvoices: totalInvoices || 0,
      totalRevenue,
      totalPaymentsCount: totalPaymentsCount || 0,
      totalPaymentsAmount: totalPaymentsAmount || 0,
      recentLogs: recentLogs || []
    };
  } catch (e) {
    console.error('Admin stats failed:', e);
    return null;
  }
};

export const getAllUsers = async () => {
  try {
    // 1. Get users with stores (primary info)
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('*, invoices:invoices(count)')
      .order('created_at', { ascending: false });

    if (storeError) throw storeError;

    // 2. Discover users from activity logs (find those who started but didn't finish setup)
    const { data: logs, error: logError } = await supabase
      .from('activity_logs')
      .select('user_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(2000); 

    if (logError && (!stores || stores.length === 0)) return [];

    const userMap = new Map();
    
    // Process stores first - stores have authoritative registration timestamps (created_at)
    stores?.forEach(s => {
      userMap.set(s.user_id, {
        ...s,
        registration_date: s.created_at,
        last_active: s.updated_at || s.created_at,
        is_pending: false,
        source: 'store'
      });
    });

    // Process logs to find potential users not in stores table
    logs?.forEach(log => {
      const existing = userMap.get(log.user_id);
      if (!existing) {
        // This is a user with activity but no store setup yet
        const logEmail = log.metadata?.email || 'Unknown';
        userMap.set(log.user_id, {
          user_id: log.user_id,
          business_name: 'Pending Setup',
          owner_name: logEmail.split('@')[0] || 'New User',
          email: logEmail,
          registration_date: log.created_at,
          last_active: log.created_at,
          is_pending: true,
          invoices: [{ count: 0 }],
          source: 'log'
        });
      } else {
        // Update last_active if log is newer
        const logDate = new Date(log.created_at).getTime();
        const existingDate = new Date(existing.last_active).getTime();
        if (logDate > existingDate) {
          existing.last_active = log.created_at;
        }
        // Also capture email from logs if store doesn't have it
        if (!existing.email && log.metadata?.email) {
          existing.email = log.metadata.email;
        }
      }
    });

    return Array.from(userMap.values())
      .sort((a, b) => new Date(b.registration_date).getTime() - new Date(a.registration_date).getTime());
  } catch (e) {
    console.error('Failed to get users:', e);
    return [];
  }
};

export const getAllInvoices = async (limit = 100) => {
  try {
    // Explicitly select all required fields to ensure completeness
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        user_id,
        store_id,
        created_at,
        customer_id,
        subtotal,
        tax_total,
        discount_total,
        grand_total,
        status,
        date,
        customers (
          id,
          name,
          email,
          phone
        ),
        stores (
          id,
          business_name,
          owner_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to get all invoices:', e);
    return [];
  }
};

export const updateUserAccess = async (userId: string, isBlocked: boolean) => {
  try {
    const { error } = await supabase
      .from('stores')
      .update({ is_blocked: isBlocked })
      .eq('user_id', userId);

    if (error) {
       console.error('DATABASE ERROR updating user access:', error);
       throw error;
    }
    
    await logActivity(isBlocked ? 'blocked_user' : 'unblocked_user', 'user', userId);
    return true;
  } catch (e: any) {
    console.error('Failed to update user access:', e);
    // Log detailed diagnostics for the 400 error
    if (e.message || e.details) {
       toast.error(`Admin Error: ${e.message || 'Check console'}`);
    }
    return false;
  }
};

export const getUserActivity = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to get user activity:', e);
    return [];
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
      const key = getUserKey('bill_products');
      if (key) {
        const current = getCachedData<Product[]>(key, []);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newProduct: Product = {
            id: payload.new.id,
            name: payload.new.name,
            category: payload.new.category || 'Other',
            hsnCode: payload.new.hsn_code || '',
            sellingPrice: Number(payload.new.rate),
            gstRate: Number(payload.new.tax_percent),
            unit: payload.new.unit || 'pcs',
            createdAt: payload.new.created_at,
          };
          const idx = current.findIndex(p => p.id === payload.new.id);
          if (idx >= 0) current[idx] = newProduct;
          else current.unshift(newProduct);
          setCachedData(key, current.slice(0, 50));
        } else if (payload.eventType === 'DELETE') {
          setCachedData(key, current.filter(p => p.id !== payload.old.id));
        }
      }
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
      const key = getUserKey('bill_customers');
      if (key) {
        const current = getCachedData<Customer[]>(key, []);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newCustomer: Customer = {
            id: payload.new.id,
            name: payload.new.name,
            phone: payload.new.phone || '',
            email: payload.new.email || '',
            gstin: payload.new.gstin || '',
            address: payload.new.address || '',
            state: payload.new.state || '',
            createdAt: payload.new.created_at,
          };
          const idx = current.findIndex(c => c.id === payload.new.id);
          if (idx >= 0) current[idx] = newCustomer;
          else current.unshift(newCustomer);
          setCachedData(key, current.slice(0, 50));
        } else if (payload.eventType === 'DELETE') {
          setCachedData(key, current.filter(c => c.id !== payload.old.id));
        }
      }
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
      const infoKey = getUserKey('bill_store_info');
      const brandingKey = getUserKey('bill_branding_settings');
      
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        if (infoKey) {
          const info: StoreInfo = {
            name: payload.new.business_name || '',
            ownerName: payload.new.owner_name || '',
            gstin: payload.new.gstin || '',
            address: payload.new.address || '',
            city: payload.new.city || '',
            state: payload.new.state || '',
            pincode: payload.new.pincode || '',
            phone: payload.new.phone || '',
            email: payload.new.email || '',
            authDistributors: payload.new.auth_distributors || '',
          };
          setCachedData(infoKey, info);
        }
        if (brandingKey && payload.new.branding_settings) {
          setCachedData(brandingKey, payload.new.branding_settings);
        }
      } else if (payload.eventType === 'DELETE') {
        if (infoKey) safeRemove(infoKey);
        if (brandingKey) safeRemove(brandingKey);
      }
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