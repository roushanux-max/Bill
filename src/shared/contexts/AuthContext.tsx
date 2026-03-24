import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/utils/supabase';
import { saveInvoice, getUserKey, logActivity, safeGet, safeSet, safeRemove } from '@/shared/utils/storage';
import LoadingScreen from '@/shared/components/LoadingScreen';

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
  const ADMIN_EMAILS = ['roushan.ux@gmail.com'];

  useEffect(() => {
    if (user?.email && ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase())) {
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
        const authKey = Object.keys(window.localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (authKey) {
          const tokenData = safeGet(authKey);
          if (tokenData) {
            const parsed = JSON.parse(tokenData);
            const userId = parsed?.user?.id;
            const userEmail = parsed?.user?.email;
            if (userId && !safeGet('bill_user_id')) {
              safeSet('bill_user_id', userId);
              // Proactively log login for discovery
              logActivity('login_restored', 'user', userId, { email: userEmail });
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
          safeSet('bill_user_id', initialSession.user.id);
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
        const isNewSession = !safeGet('bill_user_id');
        safeSet('bill_user_id', session.user.id);
        
        if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && isNewSession)) {
          logActivity('login', 'user', session.user.id, { 
            email: session.user.email,
            method: session.user.app_metadata?.provider || 'password'
          });
        }
      } else {
        safeRemove('bill_user_id');
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
      const activeKey = getUserKey('active_store_id');
      const onboardKey = getUserKey('hasCompletedOnboarding');
      const localStoreId = activeKey ? safeGet(activeKey) : null;
      const localOnboarding = onboardKey ? safeGet(onboardKey) === 'true' : false;
      
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
        const aKey = getUserKey('active_store_id');
        const oKey = getUserKey('hasCompletedOnboarding');
        if (aKey) safeSet(aKey, storeId);
        if (oKey) safeSet(oKey, 'true');
        
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

      const asKey = getUserKey('active_store_id');
      const activeStoreId = asKey ? safeGet(asKey) : null;
      if (!activeStoreId) {
        try {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', u.id)
            .limit(1);

          if (!error && stores && stores.length > 0) {
            const setKey = getUserKey('active_store_id');
            if (setKey) safeSet(setKey, stores[0].id);
          }
        } catch (e) {
          // ignore
        }
      }

      // If there's a local invoice draft, migrate it to Supabase (once)
      try {
        const dKey = getUserKey('invoiceDraft');
        const draftRaw = dKey ? safeGet(dKey) : null;
        if (draftRaw) {
          const draft = JSON.parse(draftRaw);
          if (draft && (draft.items?.length > 0 || draft.customerId)) {
            const sKey = getUserKey('active_store_id');
            const storeId = sKey ? safeGet(sKey) : null;
            if (storeId) {
              await saveInvoice(draft);
              if (dKey) safeRemove(dKey);
            }
          }
        }

        // Guest Branding Migration Check (Conflict Resolution)
        const guestBrandingRaw = window.sessionStorage.getItem('guest_demo_branding_settings');
        const guestStoreRaw = window.sessionStorage.getItem('guest_demo_store_info');
        
        if (guestBrandingRaw || guestStoreRaw) {
            window.dispatchEvent(new CustomEvent('GUEST_LOGIN_CONFLICT', {
                detail: {
                    guestBranding: guestBrandingRaw ? JSON.parse(guestBrandingRaw) : null,
                    guestStore: guestStoreRaw ? JSON.parse(guestStoreRaw) : null
                }
            }));
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

      if (!error && data?.user) {
        // Log registration immediately for admin discovery
        await logActivity('registration', 'user', data.user.id, { 
          email: data.user.email,
          name,
          mobile
        });
      }

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
    // The activity log for Google will happen in the INITIAL_SESSION check or onAuthStateChange
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
    keysToRemove.forEach(key => safeRemove(key));
    
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