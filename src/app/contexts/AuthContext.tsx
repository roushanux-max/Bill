import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { saveInvoice, getUserKey, logActivity } from '../utils/storage';
import LoadingScreen from '../components/LoadingScreen';

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
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin emails - hardcoded for now as requested
  const ADMIN_EMAILS = ['roushanux@gmail.com'];

  useEffect(() => {
    if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      // PROACTIVE: Try to extract user ID from Supabase token immediately
      // This stabilizes getUserKey prefixes before getSession() even returns
      try {
        const authKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (authKey) {
          const tokenData = localStorage.getItem(authKey);
          if (tokenData) {
            const parsed = JSON.parse(tokenData);
            const userId = parsed?.user?.id;
            if (userId && !localStorage.getItem('bill_user_id')) {
              localStorage.setItem('bill_user_id', userId);
            }
          }
        }
      } catch (e) {}

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
        if (initialSession?.user) {
          localStorage.setItem('bill_user_id', initialSession.user.id);
          setLoading(true);
          await refreshHasStore(initialSession.user);
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
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth event:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        localStorage.setItem('bill_user_id', session.user.id);
        // Don't wait for refresh here, let the useEffect handle it
      } else {
        localStorage.removeItem('bill_user_id');
        setHasStore(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isRefreshing = useRef(false);

  const refreshHasStore = async (currUser = user) => {
    if (!currUser) {
      setHasStore(null);
      return;
    }

    if (isRefreshing.current) {
        console.log('AuthContext: refreshHasStore already in progress, skipping.');
        return;
    }

    isRefreshing.current = true;
    try {
      // 1. Check local storage first (fastest)
      const localStoreId = localStorage.getItem(getUserKey('active_store_id'));
      const localOnboarding = localStorage.getItem(getUserKey('hasCompletedOnboarding')) === 'true';
      
      if (localStoreId && localOnboarding) {
        setHasStore(true);
        return;
      }

      // 2. Query Supabase to see if this user actually has a store
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', currUser.id)
        .limit(1);

      if (!error && stores && stores.length > 0) {
        const storeId = stores[0].id;
        console.log('AuthContext: Restored store for user:', storeId);
        localStorage.setItem(getUserKey('active_store_id'), storeId);
        localStorage.setItem(getUserKey('hasCompletedOnboarding'), 'true');
        
        // Dispatch storage event so other contexts (Branding) update immediately
        window.dispatchEvent(new Event('storage'));
        
        setHasStore(true);
      } else {
        console.log('AuthContext: No store found for user');
        setHasStore(false);
      }
    } catch (e) {
      console.warn('AuthContext: Store check failed', e);
      // Fallback: don't set hasStore false on error to avoid pushing to onboarding accidentally
      if (hasStore === null) setHasStore(true); 
    } finally {
      isRefreshing.current = false;
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
      const activeStoreId = localStorage.getItem(getUserKey('active_store_id'));
      if (!activeStoreId) {
        try {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', u.id)
            .limit(1);

          if (!error && stores && stores.length > 0) {
            localStorage.setItem(getUserKey('active_store_id'), stores[0].id);
          }
        } catch (e) {
          // ignore
        }
      }

      // If there's a local invoice draft, migrate it to Supabase (once)
      try {
        const draftRaw = localStorage.getItem(getUserKey('invoiceDraft'));
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && (draft.items?.length > 0 || draft.customerId)) {
            // Ensure active_store_id is present before saving
            const storeId = localStorage.getItem(getUserKey('active_store_id'));
            if (storeId) {
              // saveInvoice will use active_store_id via storage helpers
              await saveInvoice(draft);
              localStorage.removeItem(getUserKey('invoiceDraft'));
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
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.user) {
      await logActivity('login', 'user', data.user.id);
    }
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
    const keysToRemove = [
      'active_store_id',
      'hasCompletedOnboarding',
      'invoiceDraft',
      'bill_user_id'
    ];
    
    // Clear only global/session keys. User-prefixed keys are preserved for instant recall upon same-user re-login.
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
    isAdmin,
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