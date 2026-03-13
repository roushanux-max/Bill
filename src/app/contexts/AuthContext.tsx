import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { saveInvoice } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  displayEmail: string | null;
  loading: boolean;
  hasStore: boolean | null;
  refreshHasStore: () => Promise<void>;
  signUp: (email: string, password: string, name: string, mobile?: string, city?: string, dob?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // If we have a hash fragment (OAuth redirect), let's wait a bit longer 
        // for onAuthStateChange to fire if getSession returned null
        if (!initialSession && window.location.hash) {
           console.log("AuthContext: Detected hash fragment, waiting for session with timeout...");
           // Fail-safe timeout to prevent infinite loading
           setTimeout(() => {
             setLoading(current => {
               if (current) console.log("AuthContext: Redirect timeout hit, concluding no session.");
               return false;
             });
           }, 2000);
           return;
        }
      } catch (e) {
        console.error('Error checking initial session:', e);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && !localStorage.getItem('active_store_id')) {
        // One-time proactive store restoration on auth change
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);
        
        if (stores && stores.length > 0) {
          localStorage.setItem('active_store_id', stores[0].id);
          // Dispatch storage event so other contexts know we have a store now
          window.dispatchEvent(new Event('storage'));
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshHasStore = async () => {
    if (!user) {
      setHasStore(null);
      return;
    }

    // Fast path: localStorage
    if (localStorage.getItem('hasCompletedOnboarding') === 'true' || localStorage.getItem('active_store_id')) {
      setHasStore(true);
      return;
    }

    try {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!error && stores && stores.length > 0) {
        localStorage.setItem('active_store_id', stores[0].id);
        localStorage.setItem('hasCompletedOnboarding', 'true');
        setHasStore(true);
      } else {
        setHasStore(false);
      }
    } catch (e) {
      console.warn('AuthContext: Store check failed', e);
      // Fallback: assume they have one if offline so we don't block them
      setHasStore(true);
    }
  };

  useEffect(() => {
    if (user && hasStore === null) {
      refreshHasStore();
    } else if (!user) {
      setHasStore(null);
    }
  }, [user]);

  // When user changes (login), ensure we have an active store id and migrate local drafts
  useEffect(() => {
    const handleUserSignIn = async (u: User | null) => {
      if (!u) return;

      // If no active_store_id in localStorage, try to pick the user's first store
      const activeStoreId = localStorage.getItem('active_store_id');
      if (!activeStoreId) {
        try {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', u.id)
            .limit(1);

          if (!error && stores && stores.length > 0) {
            localStorage.setItem('active_store_id', stores[0].id);
          }
        } catch (e) {
          // ignore
        }
      }

      // If there's a local invoice draft, migrate it to Supabase (once)
      try {
        const draftRaw = localStorage.getItem('invoiceDraft');
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && (draft.items?.length > 0 || draft.customerId)) {
            // Ensure active_store_id is present before saving
            const storeId = localStorage.getItem('active_store_id');
            if (storeId) {
              // saveInvoice will use active_store_id via storage helpers
              await saveInvoice(draft);
              localStorage.removeItem('invoiceDraft');
            }
          }
        }
      } catch (e) {
        console.error('Invoice draft migration failed', e);
      }
    };

    handleUserSignIn(user);
  }, [user]);

  const signUp = async (email: string, password: string, name: string, mobile?: string, city?: string, dob?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            mobile: mobile || '',
            city: city || '',
            dob: dob || '',
          }
        }
      });

      return { error };
    } catch (error) {
      console.error('Error during signup:', error);
      return { error: 'Failed to create account' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Clear all user-specific local data to prevent data leaks between sessions
    const keysToRemove = [
      'bill_store_info',
      'bill_branding_settings',
      'bill_customers',
      'bill_products',
      'bill_invoices',
      'active_store_id',
      'hasCompletedOnboarding',
      'invoiceDraft'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Dispatch a storage event to immediately update BrandingContext to defaults
    window.dispatchEvent(new Event('storage'));

    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    displayEmail: user?.email ?? null,
    loading,
    hasStore,
    refreshHasStore,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}