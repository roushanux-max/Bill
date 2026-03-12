import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { saveInvoice } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  displayEmail: string | null;
  loading: boolean;
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

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        redirectTo: `${window.location.origin}/setup-shop`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    displayEmail: user?.email ?? null,
    loading,
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