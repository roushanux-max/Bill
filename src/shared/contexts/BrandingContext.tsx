import { createContext, useContext, useState, useEffect } from 'react';
import { BrandingSettings, defaultBrandingSettings } from '@/shared/types/branding';
import { StoreInfo } from '@/features/invoices/types/invoice';
import { getBrandingSettings, getStoreInfo, getUserKey, subscribeToStores, safeGet, safeSet, saveStoreInfo, saveBrandingSettings } from '@/shared/utils/storage';

interface BrandingContextType {
  settings: BrandingSettings;
  storeInfo: StoreInfo | null;
  updateSettings: (settings: BrandingSettings) => void;
  updateStoreInfo: (info: StoreInfo) => void;
  refreshBranding: () => Promise<void>;
  loading: boolean;
  overrideSettings?: BrandingSettings;
  overrideStoreInfo?: StoreInfo;
  setOverrideSettings: (s: BrandingSettings | undefined) => void;
  setOverrideStoreInfo: (i: StoreInfo | undefined) => void;
}

import { useAuth } from './AuthContext';
import ConflictResolutionModal from '@/features/invoices/components/ConflictResolutionModal';

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user, hasStore } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<BrandingSettings>(() => {
    try {
      const key = getUserKey('bill_branding_settings');
      const saved = key ? safeGet(key) : null;
      return saved ? JSON.parse(saved) : defaultBrandingSettings;
    } catch (e) {
      console.error('Error loading initial branding settings:', e);
      return defaultBrandingSettings;
    }
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() => {
    try {
      const key = getUserKey('bill_store_info');
      const saved = key ? safeGet(key) : null;
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error loading initial store info:', e);
      return null;
    }
  });

  const [overrideSettings, setOverrideSettings] = useState<BrandingSettings | undefined>();
  const [overrideStoreInfo, setOverrideStoreInfo] = useState<StoreInfo | undefined>();
  const [conflictData, setConflictData] = useState<{ guestBranding: BrandingSettings; guestStore: StoreInfo } | null>(null);

  // Apply styles when settings change (prioritize override if present)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyBrandingStyles(overrideSettings || settings);
    }
  }, [settings, overrideSettings]);

  const refreshBranding = async () => {
    // Avoid double-loading if we already have a user but no data yet
    setLoading(true);
    try {
      const [savedSettings, savedStoreInfo] = await Promise.all([
        getBrandingSettings(true),
        getStoreInfo(true)
      ]);

      if (savedSettings) {
        setSettings(savedSettings);
        applyBrandingStyles(savedSettings);
        // Sync to local storage for the next instant-load
        const bKey = getUserKey('bill_branding_settings');
        if (bKey) safeSet(bKey, JSON.stringify(savedSettings));
      }

      if (savedStoreInfo) {
        setStoreInfo(savedStoreInfo);
        const iKey = getUserKey('bill_store_info');
        if (iKey) safeSet(iKey, JSON.stringify(savedStoreInfo));
      }
    } catch (e) {
      console.error('Error refreshing branding sync:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load branding settings on mount and when store status changes
  useEffect(() => {
    refreshBranding();
  }, [user, hasStore]);

  useEffect(() => {
    if (!user) return;

    // Listen for remote changes via Supabase Realtime
    const unsubscribe = subscribeToStores(() => {
      refreshBranding();
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    // Listen for local storage changes (cross-tab sync)
    const handleStorageChange = (e: StorageEvent | Event) => {
      // If it's a real StorageEvent, check the key
      if ('key' in e) {
        const se = e as StorageEvent;
        if (se.key === getUserKey('bill_branding_settings') && se.newValue) {
          try {
            const newSettings = JSON.parse(se.newValue) as BrandingSettings;
            setSettings(newSettings);
            applyBrandingStyles(newSettings);
          } catch (e) { }
        }
        if (se.key === getUserKey('bill_store_info') && se.newValue) {
          try {
            const newStoreInfo = JSON.parse(se.newValue) as StoreInfo;
            setStoreInfo(newStoreInfo);
          } catch (e) { }
        }
      } else {
        // Custom 'storage' event - full refresh
        refreshBranding();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleConflict = (e: any) => {
        const { guestBranding, guestStore } = e.detail;
        if (guestBranding || guestStore) {
            setConflictData({ guestBranding, guestStore });
        }
    };
    window.addEventListener('GUEST_LOGIN_CONFLICT', handleConflict);
    return () => window.removeEventListener('GUEST_LOGIN_CONFLICT', handleConflict);
  }, []);

  const updateSettings = async (newSettings: BrandingSettings) => {
    if (overrideSettings) setOverrideSettings(newSettings); // update temp if in temp mode
    setSettings(newSettings);
    applyBrandingStyles(newSettings);
    if (user) await saveBrandingSettings(newSettings);
  };

  const updateStoreInfo = async (info: StoreInfo) => {
    if (overrideStoreInfo) setOverrideStoreInfo(info);
    setStoreInfo(info);
    if (user) await saveStoreInfo(info);
  };

  const effectiveSettings = overrideSettings || settings;
  const effectiveStoreInfo = overrideStoreInfo || storeInfo;

  return (
    <BrandingContext.Provider value={{ 
        settings: effectiveSettings, 
        storeInfo: effectiveStoreInfo, 
        updateSettings, 
        updateStoreInfo, 
        refreshBranding, 
        loading,
        overrideSettings,
        overrideStoreInfo,
        setOverrideSettings,
        setOverrideStoreInfo
    }}>
      {children}
      {conflictData && (
          <ConflictResolutionModal 
              guestBranding={conflictData.guestBranding} 
              guestStore={conflictData.guestStore} 
              onResolve={(action) => {
                  if (action === 'temp') {
                      setOverrideSettings(conflictData.guestBranding || defaultBrandingSettings);
                      setOverrideStoreInfo(conflictData.guestStore || null);
                  }
                  setConflictData(null);
                  refreshBranding(); // Ensure DB sync if keep/discard
              }}
          />
      )}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}

function applyBrandingStyles(settings: BrandingSettings) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  // Create dynamic stylesheet for theme colors
  let styleId = 'branding-theme-styles';
  let existingStyle = document.getElementById(styleId) as HTMLStyleElement;

  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = styleId;
    document.head.appendChild(existingStyle);
  }

  const dynamicTextColor = adjustBrightness(settings.primaryColor, -60);
  const dynamicSecondaryColor = adjustBrightness(settings.primaryColor, -40);

  const themeCSS = `
    .user-theme {
      --primary: ${settings.primaryColor};
      --primary-hover: ${adjustBrightness(settings.primaryColor, -15)};
      --primary-light: ${adjustBrightness(settings.primaryColor, 85)};
      --primary-foreground: ${getContrastColor(settings.primaryColor)};
      --font-family: ${getFontFamilyString(settings.fontFamily)};
    }

    .user-theme {
      color: ${dynamicTextColor};
      font-family: var(--font-family);
    }

    /* Input focus states */
    .user-theme input:focus, .user-theme textarea:focus, .user-theme select:focus {
      border-color: ${settings.primaryColor} !important;
      box-shadow: 0 0 0 2px ${settings.primaryColor}40 !important;
    }

    /* Global link color */
    .user-theme a {
      color: ${settings.primaryColor};
    }
    
    .user-theme a:hover {
      color: ${dynamicSecondaryColor};
    }

    /* Ensure consistent heading colors */
    .user-theme h1, .user-theme h2, .user-theme h3, .user-theme h4, .user-theme h5, .user-theme h6 {
      color: ${dynamicTextColor};
    }
  `;

  existingStyle.textContent = themeCSS;
}

/**
 * Get contrast color (white or black) based on hex background
 */
function getContrastColor(hexcolor: string): string {
  const r = parseInt(hexcolor.slice(1, 3), 16);
  const g = parseInt(hexcolor.slice(3, 5), 16);
  const b = parseInt(hexcolor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

/**
 * Adjust brightness of a hex color correctly - for testing 
 */
function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;

  R = R < 0 ? 0 : R > 255 ? 255 : R;
  G = G < 0 ? 0 : G > 255 ? 255 : G;
  B = B < 0 ? 0 : B > 255 ? 255 : B;

  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

/**
 * Get CSS font-family string from setting
 */
function getFontFamilyString(font: string): string {
  switch (font) {
    case 'aptos': return "'Aptos', 'Segoe UI', system-ui, sans-serif";
    case 'inter': return "'Inter', sans-serif";
    case 'roboto': return "'Roboto', sans-serif";
    case 'lato': return "'Lato', sans-serif";
    case 'opensans': return "'Open Sans', sans-serif";
    default: return "'Aptos', 'Segoe UI', system-ui, sans-serif";
  }
}
