import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';
import { ArrowLeft, Eye, Save, Upload, ImageIcon, Palette, LayoutGrid, Type, FileSignature, Sparkles, CheckCircle2, X, Building2, User, LogOut } from 'lucide-react';
import { getTextColorClass, getDescriptionColorClass, getContrastColor } from '@/shared/utils/colorUtils';
import { BrandingSettings, defaultBrandingSettings } from '@/shared/types/branding';
import { StoreInfo } from '@/features/invoices/types/invoice';
import { getBrandingSettings, saveBrandingSettings, getStoreInfo, saveStoreInfo, getUserKey, safeSet } from '@/shared/utils/storage';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { toast } from 'sonner';
import { validateEmail, validatePhone } from '@/shared/utils/validation';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { refreshBranding, updateSettings: updateGlobalSettings, updateStoreInfo: updateGlobalStoreInfo } = useBranding();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<BrandingSettings>(defaultBrandingSettings);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('store');
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const location = useLocation();
  const sectionParam = new URLSearchParams(location.search).get('section');
  const returnParam = new URLSearchParams(location.search).get('return');

  // Load saved settings on mount
  useEffect(() => {
    const init = async () => {
      const [savedSettings, savedStoreInfo] = await Promise.all([
        getBrandingSettings(),
        getStoreInfo()
      ]);

      if (savedSettings) {
        setSettings(savedSettings);
      }
      setStoreInfo(savedStoreInfo);
    };
    init();
  }, []); // Only on mount

  // Handle deep linking to specific sections
  useEffect(() => {
    if (sectionParam) {
      const validSections = ['store', 'logo', 'footer', 'terms', 'account'];
      if (validSections.includes(sectionParam)) {
        setActiveSection(sectionParam);
        // Scroll to top of the content area if possible
        window.scrollTo(0, 0);
      }
    }
  }, [sectionParam]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Image size cannot exceed 5MB. The selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
        document.getElementById('logo-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newLogo = reader.result as string;
        setSettings(prev => {
          const next = { ...prev, logo: newLogo };
          updateGlobalSettings(next);
          return next;
        });
        setHasChanges(true);
        toast.success('Logo uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`Signature image size cannot exceed 2MB. The selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
        document.getElementById('signature-upload')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSig = reader.result as string;
        setSettings(prev => {
          const next = { ...prev, signatureImage: newSig, showSignature: true };
          updateGlobalSettings(next);
          return next;
        });
        setHasChanges(true);
        toast.success('Signature uploaded successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    const newSettings = { ...settings, logo: null };
    setSettings(newSettings);
    updateGlobalSettings(newSettings);
    setHasChanges(true);
  };

  const removeSignature = () => {
    const newSettings = { ...settings, signatureImage: null };
    setSettings(newSettings);
    updateGlobalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (storeInfo && !storeInfo.name?.trim()) {
      setActiveSection('store');
      setTimeout(() => {
        document.getElementById('business-name-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('business-name-input')?.focus();
      }, 100);
      toast.error('Business Name is required. Please fill in this field before saving.');
      return;
    }

    if (storeInfo?.phone && !validatePhone(storeInfo.phone)) {
      setActiveSection('store');
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    if (storeInfo?.email && !validateEmail(storeInfo.email)) {
      setActiveSection('store');
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      await saveBrandingSettings(settings);
      updateGlobalSettings(settings);
      if (storeInfo) {
        await saveStoreInfo(storeInfo);
        refreshBranding(); // Full sync
      }
      setHasChanges(false);
      toast.success('Settings saved successfully!', {
        description: 'Your changes have been applied to all invoices.',
        icon: <CheckCircle2 className="h-5 w-5" />,
        duration: 4000,
      });
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave without saving?')) {
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setSettings(defaultBrandingSettings);
      updateGlobalSettings(defaultBrandingSettings);
      await saveBrandingSettings(defaultBrandingSettings);
      setHasChanges(true);
      toast.success('Settings reset to default!');
    }
  };

  const updateSettings = (key: keyof BrandingSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateGlobalSettings(newSettings);
    setHasChanges(true); // Don't autosave, let user click Save for feedback
  };


  const updateStoreDetails = (key: keyof StoreInfo, value: any) => {
    if (!storeInfo) return;
    const newStoreInfo = { ...storeInfo, [key]: value };
    setStoreInfo(newStoreInfo);
    updateGlobalStoreInfo(newStoreInfo);
    setHasChanges(true);

    // Auto-fetch location if pincode is 6 digits
    if (key === 'pincode' && value.length === 6 && /^\d{6}$/.test(value)) {
      handlePincodeLookup(value);
    }
  };

  const handlePincodeLookup = async (pincode: string) => {
    setFetchingPincode(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice[0]) {
        const info = data[0].PostOffice[0];
        const city = info.District;
        const state = info.State;

        if (storeInfo) {
          const updated = { ...storeInfo, city, state };
          setStoreInfo(updated);
          updateGlobalStoreInfo(updated);
          setHasChanges(true);
          toast.success(`Location identified: ${city}, ${state}`);
        }
      }
    } catch (e) {
      console.error('Pincode fetch error:', e);
    } finally {
      setFetchingPincode(false);
    }
  };

  const sections = [
    { id: 'store', label: 'Store Details', icon: Building2 },
    { id: 'logo', label: 'Logo & Brand', icon: ImageIcon },
    { id: 'footer', label: 'Footer & Sign', icon: FileSignature },
    { id: 'terms', label: 'Terms & Notes', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Glassmorphism */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 transition-all duration-300 h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between w-full">
          <div className="flex items-center gap-3 sm:gap-6">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-1.5 text-amber-500 hover:text-amber-600 transition-colors font-medium text-sm sm:text-base border-none bg-transparent p-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
                Settings
              </h1>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 mr-2">
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />
                Unsaved changes
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 hidden sm:flex border-slate-200 text-amber-600 hover:bg-amber-50" 
              onClick={async () => {
                // Prepare a preview invoice using current settings and storeInfo
                try {
                  const previewInvoice = {
                    id: 'preview',
                    invoiceNumber: 'PREVIEW',
                    date: new Date().toLocaleDateString('en-GB').split('/').map(s => s.padStart(2, '0')).join('.').slice(0, 8),
                    customerId: 'preview-cust',
                    customer: {
                      name: storeInfo?.name || 'Sample Customer',
                      gstin: storeInfo?.gstin || '',
                      address: storeInfo?.address || '',
                      state: storeInfo?.state || '',
                      phone: storeInfo?.phone || '',
                    },
                    items: [
                      {
                        id: 'itm-1',
                        productId: 'prod-1',
                        name: 'Sample Item',
                        hsn: '0000',
                        quantity: 1,
                        unit: 'pcs',
                        rate: 1000,
                        taxRate: 18,
                        amount: 1000,
                      }
                    ],
                    transportCharges: 0,
                    discount: 0,
                    notes: settings.footerText || '',
                    subtotal: 1000,
                    totalTax: 180,
                    total: 1180,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  const invKey = getUserKey('previewInvoice');
                  const setKey = getUserKey('previewBrandingSettings');
                  const storeKey = getUserKey('previewStoreInfo');
                  
                  if (invKey) safeSet(invKey, JSON.stringify(previewInvoice));
                  if (setKey) safeSet(setKey, JSON.stringify(settings));
                  if (storeInfo && storeKey) safeSet(storeKey, JSON.stringify(storeInfo));
                  const previewReturn = `/settings?section=${activeSection}${returnParam ? `&return=${encodeURIComponent(returnParam)}` : ''}`;
                  navigate(`/invoice-preview?id=preview&return=${encodeURIComponent(previewReturn)}`);
                } catch (e) {
                  console.error('Failed to prepare preview', e);
                  toast.error('Failed to prepare preview');
                }
              }}>
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
              {hasChanges && (
                <Button 
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await Promise.all([
                        saveBrandingSettings(settings),
                        storeInfo ? saveStoreInfo(storeInfo) : Promise.resolve()
                      ]);
                      setHasChanges(false);
                      refreshBranding();
                      toast.success('Settings saved successfully!');
                    } catch (e) {
                      toast.error('Failed to save settings');
                    } finally {
                      setIsSaving(false);
                    }
                  }} 
                  disabled={isSaving}
                  size="sm" 
                  className="gap-2 transition-all bg-amber-400 hover:bg-amber-500 text-slate-900 border-none" 
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:py-8 max-w-6xl mx-auto pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeSection === section.id
                        ? 'shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      style={{
                        backgroundColor: activeSection === section.id ? settings.primaryColor : 'transparent',
                        color: activeSection === section.id ? getContrastColor(settings.primaryColor) : 'inherit',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Horizontal Scroll Sections */}
          <div className="lg:hidden sticky top-[72px] z-40 -mx-4 px-4 bg-gradient-to-br from-slate-50 to-slate-100 pb-3 pt-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${activeSection === section.id
                      ? 'shadow-md'
                      : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    style={{
                      backgroundColor: activeSection === section.id ? settings.primaryColor : 'white',
                      color: activeSection === section.id ? getContrastColor(settings.primaryColor) : '',
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Store Details Section */}
            {activeSection === 'store' && (
              storeInfo ? (
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                    <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                      <Building2 className="h-5 w-5" />
                      Store Details
                    </CardTitle>
                    <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                      Manage your business information that appears on invoices
                    </CardDescription>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="business-name-input" className="text-sm font-semibold text-slate-700">Business Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="business-name-input"
                          value={storeInfo.name}
                          onChange={(e) => updateStoreDetails('name', e.target.value)}
                          placeholder="e.g. M/S-AASHVI ENTERPRISES"
                          className="text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">GSTIN</Label>
                        <Input
                          value={storeInfo.gstin}
                          onChange={(e) => updateStoreDetails('gstin', e.target.value)}
                          placeholder="e.g. 10DAOPK4311H1Z1"
                          className="text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block mb-1">Phone Number</label>
                        <Input
                          value={storeInfo.phone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            updateStoreDetails('phone', val);
                          }}
                          inputMode="tel"
                          maxLength={10}
                          placeholder="e.g. 8507329056"
                          className="text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block mb-1">City</label>
                        <Input
                          value={storeInfo.city || ''}
                          onChange={(e) => updateStoreDetails('city', e.target.value)}
                          placeholder="e.g. Arrah"
                          className="text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-700 block mb-1">PIN Code</label>
                        <div className="relative">
                          <Input
                            value={storeInfo.pincode || ''}
                            onChange={(e) => updateStoreDetails('pincode', e.target.value)}
                            placeholder="6 digits"
                            maxLength={6}
                            className="text-sm border-slate-200"
                          />
                          {fetchingPincode && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Email Address (Optional)</Label>
                        <Input
                          value={storeInfo.email || ''}
                          onChange={(e) => updateStoreDetails('email', e.target.value)}
                          placeholder="e.g. contact@business.com"
                          className="text-sm border-slate-200"
                        />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label className="text-sm font-semibold text-slate-700">Address</Label>
                        <Textarea
                          value={storeInfo.address}
                          onChange={(e) => updateStoreDetails('address', e.target.value)}
                          placeholder="Full business address"
                          rows={2}
                          className="text-sm border-slate-200 resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">State</Label>
                        <Select
                          value={storeInfo.state}
                          onValueChange={(value) => updateStoreDetails('state', value)}
                        >
                          <SelectTrigger className="w-full text-sm border-slate-200">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 overflow-y-auto w-full border-slate-200">
                            {[
                              'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                              'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
                              'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
                              'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
                              'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
                            ].map(state => (
                              <SelectItem key={state} value={state} className="text-sm">
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <Label className="text-sm font-semibold text-slate-700">Authorized Distributors (Optional)</Label>
                        <Textarea
                          value={storeInfo.authDistributors || ''}
                          onChange={(e) => updateStoreDetails('authDistributors', e.target.value)}
                          placeholder="e.g. Auth. Distributors:- Palang, Sofa, Chair, Almira & All Furniture Item"
                          rows={2}
                          className="text-sm border-slate-200 resize-none"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-lg border-0 p-6 text-center">
                  <div className="mb-4">
                    <Building2 className="mx-auto h-10 w-10 text-slate-700" />
                  </div>
                  <h3 className="text-lg font-semibold">No Store Found</h3>
                  <p className="text-sm text-slate-500 mt-2">You haven't set up your store yet. Store details are required for invoices and professional documents.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button onClick={() => navigate('/setup-shop')}>Setup Shop</Button>
                    <Button variant="outline" onClick={async () => {
                      // Try reloading store info from backend
                      const si = await getStoreInfo();
                      setStoreInfo(si);
                      if (si) updateGlobalStoreInfo(si);
                      if (!si) toast('No store found. Please complete setup.');
                    }}>Reload</Button>
                  </div>
                </Card>
              )
            )}

            {/* Logo, Brand & Colors Section */}
            {activeSection === 'logo' && (
              <div className="space-y-6">
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                    <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                      <ImageIcon className="h-5 w-5" />
                      Logo & Brand Identity
                    </CardTitle>
                    <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                      Upload your logo and choose your brand color
                    </CardDescription>
                  </div>
                  <CardContent className="p-6 space-y-8">
                    {/* Logo Upload Area */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Business Logo</Label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all outline-none">
                        {settings.logo ? (
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                              <div className="border-2 border-slate-200 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-md w-40 h-40">
                                <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                              </div>
                              <button
                                onClick={removeLogo}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <label htmlFor="logo-upload" className="cursor-pointer">
                              <div
                                className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                style={{ backgroundColor: settings.primaryColor }}
                              >
                                <Upload className="h-4 w-4" />
                                Change Logo
                              </div>
                              <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            </label>
                          </div>
                        ) : (
                          <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${settings.primaryColor}20` }}>
                              <Upload className="h-8 w-8" style={{ color: settings.primaryColor }} />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-slate-700">Click to upload logo</p>
                              <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG up to 5MB</p>
                            </div>
                            <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Colors - Moved here */}
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-slate-700">Brand Primary Color</Label>
                      <div className="flex gap-4 items-center">
                        <div className="relative">
                          <input
                            type="color"
                            value={settings.primaryColor}
                            onChange={(e) => updateSettings('primaryColor', e.target.value)}
                            className="w-16 h-16 rounded-xl cursor-pointer border-2 border-white shadow-lg"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            type="text"
                            value={settings.primaryColor}
                            onChange={(e) => updateSettings('primaryColor', e.target.value)}
                            className="font-mono text-sm border-slate-200"
                          />
                          <p className="text-xs text-slate-500 mt-2">This color will be used for buttons, headers, and accents across your invoices and dashboard.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Footer & Signature Section */}
            {activeSection === 'footer' && (
              <div className="space-y-6">
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                    <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                      <FileSignature className="h-5 w-5" />
                      Footer & Signature
                    </CardTitle>
                    <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                      Add custom footer and signature
                    </CardDescription>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    {/* Show Footer */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <Label className="text-sm font-semibold text-slate-700">Show Footer</Label>
                          <p className="text-xs text-slate-500 mt-1">Display footer text on invoices</p>
                        </div>
                        <Switch
                          checked={settings.showFooter}
                          onCheckedChange={(checked) => updateSettings('showFooter', checked)}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      {settings.showFooter && (
                        <div className="space-y-2 pt-4 border-t">
                          <Label className="text-sm font-medium text-slate-700">Footer Text</Label>
                          <Textarea
                            value={settings.footerText}
                            onChange={(e) => updateSettings('footerText', e.target.value)}
                            placeholder="Thank you for your business!"
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Show Signature */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <Label className="text-sm font-semibold text-slate-700">Show Signature</Label>
                          <p className="text-xs text-slate-500 mt-1">Display signature section</p>
                        </div>
                        <Switch
                          checked={settings.showSignature}
                          onCheckedChange={(checked) => updateSettings('showSignature', checked)}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      {settings.showSignature && (
                        <div className="space-y-4 pt-4 border-t">
                          {/* Signature Image */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Signature Image (Optional)</Label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white hover:border-indigo-400 transition-all">
                              {settings.signatureImage ? (
                                <div className="flex flex-col items-center gap-3">
                                  <div className="relative group">
                                    <div className="w-40 h-20 border border-slate-200 rounded flex items-center justify-center overflow-hidden bg-white">
                                      <img src={settings.signatureImage} alt="Signature" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <button
                                      onClick={removeSignature}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <label htmlFor="signature-upload" className="cursor-pointer">
                                    <div
                                      className="px-3 py-1.5 text-white rounded-md transition-colors text-xs font-medium"
                                      style={{ backgroundColor: settings.primaryColor }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                      Change Signature
                                    </div>
                                    <input
                                      id="signature-upload"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSignatureUpload}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label htmlFor="signature-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                  <Upload className="h-6 w-6" style={{ color: settings.primaryColor }} />
                                  <p className="text-xs text-slate-600">Upload signature (PNG, JPG up to 2MB)</p>
                                  <input
                                    id="signature-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleSignatureUpload}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Signature Text */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">Signature Text</Label>
                            <Input
                              value={settings.signatureText}
                              onChange={(e) => updateSettings('signatureText', e.target.value)}
                              placeholder="Authorized Signatory"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Terms & Notes Section */}
            {activeSection === 'terms' && (
              <div className="space-y-6">
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                    <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                      <Sparkles className="h-5 w-5" />
                      Terms & Notes
                    </CardTitle>
                    <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                      Manage default notes and terms for all invoices
                    </CardDescription>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Default Invoice Notes</Label>
                        <Textarea
                          value={settings.invoiceNotes || ''}
                          onChange={(e) => updateSettings('invoiceNotes', e.target.value)}
                          placeholder="All Subject to Arrah Jurisdiction only. Goods once sold will not be taken back. All works transit will be entertained."
                          rows={4}
                          className="resize-none text-sm border-slate-200"
                        />
                        <p className="text-xs text-slate-500 italic">These notes will appear at the bottom-left of every new invoice.</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        <Label className="text-sm font-semibold text-slate-700 block mb-2">Terms & Conditions (Optional)</Label>
                        <Textarea
                          value={settings.termsAndConditions || ''}
                          onChange={(e) => updateSettings('termsAndConditions', e.target.value)}
                          placeholder="1. Payment is due within 15 days.
2. Please quote invoice number in payment."
                          rows={4}
                          className="resize-none text-sm border-slate-200"
                        />
                        <p className="text-xs text-slate-500 italic">Standard terms that apply to your business transactions.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>

        {/* Bottom Action Bar - Mobile - Only shown when there are changes */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden shadow-lg z-40">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1 gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2" style={{ backgroundColor: settings.primaryColor }}>
                {isSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}