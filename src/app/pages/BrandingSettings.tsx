import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Eye, Save, Upload, ImageIcon, Palette, LayoutGrid, Type, FileSignature, Sparkles, CheckCircle2, X, Building2 } from 'lucide-react';
import { getTextColorClass, getDescriptionColorClass, getContrastColor } from '../../utils/colorUtils';
import { BrandingSettings, defaultBrandingSettings } from '../types/branding';
import { StoreInfo } from '../types/invoice';
import { getBrandingSettings, saveBrandingSettings, getStoreInfo, saveStoreInfo } from '../utils/storage';
import { useBranding } from '../contexts/BrandingContext';
import { toast } from 'sonner';

export default function BrandingSettingsPage() {
  const navigate = useNavigate();
  const { refreshBranding, updateSettings: updateGlobalSettings } = useBranding();
  const [settings, setSettings] = useState<BrandingSettings>(defaultBrandingSettings);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('store');

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
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
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
        toast.error('File size should be less than 2MB');
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
    await saveBrandingSettings(settings);
    updateGlobalSettings(settings);
    if (storeInfo) {
      await saveStoreInfo(storeInfo);
    }
    setHasChanges(false);
    toast.success('Branding settings saved successfully!', {
      description: 'Your changes have been applied to all invoices.',
      icon: <CheckCircle2 className="h-5 w-5" />,
      duration: 4000,
    });
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave without saving?')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all branding settings to default?')) {
      setSettings(defaultBrandingSettings);
      updateGlobalSettings(defaultBrandingSettings);
      await saveBrandingSettings(defaultBrandingSettings);
      setHasChanges(true);
      toast.success('Branding settings reset to default!');
    }
  };

  const updateSettings = async (key: keyof BrandingSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateGlobalSettings(newSettings);
    await saveBrandingSettings(newSettings); // Autosave immediately
    setHasChanges(false); // Reset changes since it's saved
  };


  const updateStoreDetails = async (key: keyof StoreInfo, value: any) => {
    if (!storeInfo) return;
    const newStoreInfo = { ...storeInfo, [key]: value };
    setStoreInfo(newStoreInfo);
    await saveStoreInfo(newStoreInfo); // Autosave immediately
    await refreshBranding(); // Trigger global refresh for Header/Dashboard
    setHasChanges(false);
  };

  const sections = [
    { id: 'store', label: 'Store Details', icon: Building2 },
    { id: 'logo', label: 'Logo & Brand', icon: ImageIcon },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'layout', label: 'Layout', icon: LayoutGrid },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'footer', label: 'Footer & Sign', icon: FileSignature },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header with Glassmorphism */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-4 sm:py-5 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="h-9 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: settings.primaryColor }} />
                  Store Settings
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">Manage your store information and branding</p>
              </div>
            </div>
            {/* Desktop only buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {hasChanges && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" />
                  Unsaved changes
                </span>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
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

                  localStorage.setItem('previewInvoice', JSON.stringify(previewInvoice));
                  // Also store preview settings so invoice preview can render unsaved changes
                  localStorage.setItem('previewBrandingSettings', JSON.stringify(settings));
                  if (storeInfo) localStorage.setItem('previewStoreInfo', JSON.stringify(storeInfo));
                  // Navigate to preview
                  navigate('/invoice-preview?return=/branding');
                } catch (e) {
                  console.error('Failed to prepare preview', e);
                  toast.error('Failed to prepare preview');
                }
              }}>
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
              <Button onClick={handleSave} size="sm" className="gap-2" style={{ backgroundColor: settings.primaryColor, color: 'white' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                <Save className="h-4 w-4" />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:py-8 max-w-7xl mx-auto pb-24 lg:pb-8">
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
                        <Label className="text-sm font-semibold text-slate-700">Business Name</Label>
                        <Input
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
                        <Label className="text-sm font-semibold text-slate-700">Phone Number</Label>
                        <Input
                          value={storeInfo.phone}
                          onChange={(e) => updateStoreDetails('phone', e.target.value)}
                          placeholder="e.g. 8507329056"
                          className="text-sm border-slate-200"
                        />
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
                  <p className="text-sm text-slate-500 mt-2">You haven't set up your store yet. Store details are required for invoices and branding.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button onClick={() => navigate('/setup-shop')}>Setup Shop</Button>
                    <Button variant="outline" onClick={async () => {
                      // Try reloading store info from backend
                      const si = await getStoreInfo();
                      setStoreInfo(si);
                      if (!si) toast('No store found. Please complete setup.');
                    }}>Reload</Button>
                  </div>
                </Card>
              )
            )}

            {/* Logo & Brand Section */}
            {activeSection === 'logo' && (
              <div className="space-y-6">
                <Card className="shadow-lg border-0 overflow-hidden">
                  <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                    <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                      <ImageIcon className="h-5 w-5" />
                      Logo & Brand Identity
                    </CardTitle>
                    <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                      Upload and customize your business logo
                    </CardDescription>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    {/* Logo Upload Area */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Business Logo</Label>
                      <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50/50 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all">
                        {settings.logo ? (
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative group">
                              <div className={`border-2 border-slate-200 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-md ${settings.logoSize === 'small' ? 'w-24 h-24' :
                                settings.logoSize === 'medium' ? 'w-40 h-40' :
                                  'w-56 h-56'
                                } transition-all duration-300`}>
                                <img src={settings.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                              </div>
                              <button
                                onClick={removeLogo}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Current size: <span className="font-semibold capitalize">{settings.logoSize}</span>
                            </p>
                            <div className="flex gap-2">
                              <label htmlFor="logo-upload" className="cursor-pointer">
                                <div
                                  className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                  style={{ backgroundColor: settings.primaryColor }}
                                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                  <Upload className="h-4 w-4" />
                                  Change Logo
                                </div>
                                <input
                                  id="logo-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                  className="hidden"
                                />
                              </label>
                            </div>
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
                            <input
                              id="logo-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Logo Size */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Logo Size</Label>
                      <p className="text-xs text-slate-500 mb-2">Select size to see how your logo will appear on invoices</p>
                      <div className="grid grid-cols-3 gap-3">
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => updateSettings('logoSize', size)}
                            className={`p-4 rounded-lg border-2 transition-all ${settings.logoSize === size
                              ? 'shadow-md ring-2'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'
                              }`}
                            style={{
                              borderColor: settings.logoSize === size ? settings.primaryColor : '',
                              backgroundColor: settings.logoSize === size ? `${settings.primaryColor}10` : '',
                              '--ring-color': settings.logoSize === size ? `${settings.primaryColor}40` : '',
                            } as any}
                          >
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <div className={`rounded bg-gradient-to-br from-blue-400 to-indigo-400 ${size === 'small' ? 'w-6 h-6' : size === 'medium' ? 'w-10 h-10' : 'w-14 h-14'
                                  } transition-all duration-300`} />
                              </div>
                              <p className="text-xs font-medium text-slate-700 capitalize">{size}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {size === 'small' ? '96px' : size === 'medium' ? '160px' : '224px'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Colors Section */}
            {activeSection === 'colors' && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                    <Palette className="h-5 w-5" />
                    Color Palette
                  </CardTitle>
                  <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                    Define your brand colors for invoices
                  </CardDescription>
                </div>
                <CardContent className="p-6 space-y-5">
                  {[
                    { key: 'primaryColor', label: 'Primary Color', description: 'Headers and important elements' }
                  ].map((color) => (
                    <div key={color.key} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Label className="text-sm font-semibold text-slate-700 mb-2 block">{color.label}</Label>
                      <div className="flex gap-3 items-center">
                        <div className="relative">
                          <input
                            type="color"
                            value={settings[color.key as keyof BrandingSettings] as string}
                            onChange={(e) => updateSettings(color.key as keyof BrandingSettings, e.target.value)}
                            className="w-14 h-14 rounded-lg cursor-pointer border-2 border-white shadow-md"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            type="text"
                            value={settings[color.key as keyof BrandingSettings] as string}
                            onChange={(e) => updateSettings(color.key as keyof BrandingSettings, e.target.value)}
                            placeholder="#000000"
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-slate-500 mt-1">{color.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Layout Section */}
            {activeSection === 'layout' && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                    <LayoutGrid className="h-5 w-5" />
                    Invoice Layout
                  </CardTitle>
                  <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                    Customize the structure and style
                  </CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Header Style */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Header Style</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['classic', 'modern', 'minimal'] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => updateSettings('headerStyle', style)}
                          className={`p-4 rounded-lg border-2 transition-all ${settings.headerStyle === style
                            ? 'border-green-600 bg-green-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                        >
                          <div className="text-center">
                            <div className="mb-2 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded flex items-center justify-center">
                              <div className={`w-full h-2 ${style === 'classic' ? 'bg-slate-400' : style === 'modern' ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-slate-300'
                                }`} />
                            </div>
                            <p className="text-xs font-medium text-slate-700 capitalize">{style}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Show Borders */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex-1">
                      <Label className="text-sm font-semibold text-slate-700">Show Borders</Label>
                      <p className="text-xs text-slate-500 mt-1">Display borders around invoice sections</p>
                    </div>
                    <Switch
                      checked={settings.showBorder}
                      onCheckedChange={(checked) => updateSettings('showBorder', checked)}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Typography Section */}
            {activeSection === 'typography' && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <div style={{ backgroundColor: settings.primaryColor, color: getContrastColor(settings.primaryColor) }} className="px-6 py-4">
                  <CardTitle className="flex items-center gap-2" style={{ color: 'inherit' }}>
                    <Type className="h-5 w-5" />
                    Typography
                  </CardTitle>
                  <CardDescription className="opacity-90 mt-1" style={{ color: 'inherit' }}>
                    Choose fonts that match your brand
                  </CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Font Family */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Font Family</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['aptos', 'inter', 'roboto', 'lato', 'opensans'] as const).map((font) => (
                        <button
                          key={font}
                          onClick={() => updateSettings('fontFamily', font)}
                          className={`p-4 rounded-lg border-2 transition-all ${settings.fontFamily === font
                            ? 'border-orange-600 bg-orange-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                        >
                          <p className="text-sm font-medium capitalize" style={{ fontFamily: font === 'aptos' ? "'Aptos', 'Segoe UI', system-ui, sans-serif" : font }}>
                            {font}
                          </p>
                          <p className="text-xs text-slate-500 mt-1" style={{ fontFamily: font === 'aptos' ? "'Aptos', 'Segoe UI', system-ui, sans-serif" : font }}>
                            The quick brown fox
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">Font Size</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['small', 'medium', 'large'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => updateSettings('fontSize', size)}
                          className={`p-4 rounded-lg border-2 transition-all ${settings.fontSize === size
                            ? 'border-orange-600 bg-orange-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                        >
                          <p className={`font-medium capitalize ${size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
                            }`}>
                            {size}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                        <>
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
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-medium text-slate-700">Default Invoice Notes</Label>
                            <Textarea
                              value={settings.invoiceNotes || ''}
                              onChange={(e) => updateSettings('invoiceNotes', e.target.value)}
                              placeholder="All Subject to Arrah Jurisdiction only. Goods once sold will not be taken back. All works transit will be entertained."
                              rows={3}
                              className="resize-none"
                            />
                            <p className="text-xs text-slate-500">These notes will appear by default on all new invoices.</p>
                          </div>
                        </>
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
          </div>
        </div>

        {/* Bottom Action Bar - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 lg:hidden shadow-lg z-40">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1 gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 gap-2" style={{ backgroundColor: settings.primaryColor }}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}