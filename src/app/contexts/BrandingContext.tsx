import { createContext, useContext, useState, useEffect } from 'react';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { StoreInfo } from '../types/invoice';
import { getBrandingSettings, getStoreInfo } from '../utils/storage';

interface BrandingContextType {
  settings: BrandingSettings;
  storeInfo: StoreInfo | null;
  updateSettings: (settings: BrandingSettings) => void;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrandingSettings>(() => {
    try {
      const saved = localStorage.getItem('billmint_branding_settings');
      return saved ? JSON.parse(saved) : defaultBrandingSettings;
    } catch (e) {
      console.error('Error loading initial branding settings:', e);
      return defaultBrandingSettings;
    }
  });
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(() => {
    try {
      const saved = localStorage.getItem('billmint_store_info');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error loading initial store info:', e);
      return null;
    }
  });

  // Apply styles immediately on load
  if (typeof window !== 'undefined') {
    try {
      applyBrandingStyles(settings);
    } catch (e) {
      console.error('Failed to apply initial branding styles:', e);
    }
  }

  const refreshBranding = async () => {
    const [savedSettings, savedStoreInfo] = await Promise.all([
      getBrandingSettings(),
      getStoreInfo()
    ]);

    if (savedSettings) {
      setSettings(savedSettings);
      applyBrandingStyles(savedSettings);
    } else {
      applyBrandingStyles(defaultBrandingSettings);
    }

    setStoreInfo(savedStoreInfo);
  };

  // Load branding settings on mount
  useEffect(() => {
    // Already initialized synchronously, but refresh to ensure freshness
    refreshBranding();

    // Listen for storage changes (when settings are updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'billmint_branding_settings' && e.newValue) {
        try {
          const newSettings = JSON.parse(e.newValue) as BrandingSettings;
          setSettings(newSettings);
          applyBrandingStyles(newSettings);
        } catch (e) { }
      }
      if (e.key === 'billmint_store_info' && e.newValue) {
        try {
          const newStoreInfo = JSON.parse(e.newValue) as StoreInfo;
          setStoreInfo(newStoreInfo);
        } catch (e) { }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSettings = (newSettings: BrandingSettings) => {
    setSettings(newSettings);
    applyBrandingStyles(newSettings);
  };

  return (
    <BrandingContext.Provider value={{ settings, storeInfo, updateSettings, refreshBranding }}>
      {children}
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
  const root = document.documentElement;

  // Generate visually cohesive AAA contrast colors from the primary color
  const dynamicSecondaryColor = adjustBrightness(settings.primaryColor, -40); // Darker shade for secondary accents
  const dynamicTextColor = adjustBrightness(settings.primaryColor, -60);      // Very dark shade for text on light backgrounds
  const dynamicBorderColor = adjustBrightness(settings.primaryColor, 80);     // Very light shade for borders

  // Set CSS Variables for colors
  root.style.setProperty('--primary', settings.primaryColor);
  root.style.setProperty('--primary-foreground', getContrastColor(settings.primaryColor));
  root.style.setProperty('--color-primary', settings.primaryColor);
  root.style.setProperty('--color-primary-hover', adjustBrightness(settings.primaryColor, -15));
  root.style.setProperty('--color-primary-light', adjustBrightness(settings.primaryColor, 85));
  root.style.setProperty('--color-secondary', dynamicSecondaryColor);
  root.style.setProperty('--color-text', dynamicTextColor);
  root.style.setProperty('--color-border', dynamicBorderColor);

  // Set font family
  const fontFamilyMap: Record<string, string> = {
    'inter': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'roboto': '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'lato': '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'opensans': '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  root.style.setProperty('--font-family', fontFamilyMap[settings.fontFamily] || fontFamilyMap['inter']);

  // Set font size scale
  const fontSizeMap: Record<string, string> = {
    'small': '0.875',
    'medium': '1',
    'large': '1.125',
  };

  root.style.setProperty('--font-size-scale', fontSizeMap[settings.fontSize] || '1');

  // Create dynamic stylesheet for theme colors
  let styleId = 'branding-theme-styles';
  let existingStyle = document.getElementById(styleId) as HTMLStyleElement;

  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = styleId;
    document.head.appendChild(existingStyle);
  }

  // Generate CSS for dynamic theme
  const themeCSS = `
    .user-theme {
      --primary: ${settings.primaryColor};
      --primary-hover: ${adjustBrightness(settings.primaryColor, -15)};
      --primary-light: ${adjustBrightness(settings.primaryColor, 85)};
      --primary-foreground: ${getContrastColor(settings.primaryColor)};
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

    @media print {
      .user-theme {
        background: white !important;
        color: ${dynamicTextColor} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Force visibility of the capture area and hide everything else */
      [class*="fixed left-[-9999px]"].print\:fixed,
      [class*="fixed -left-[9999px]"].print\:fixed {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 99999 !important;
        background: white !important;
        visibility: visible !important;
        display: block !important;
      }
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
