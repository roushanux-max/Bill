import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { ArrowRight, ArrowLeft, Store, CheckCircle2, Loader2, Building2, MapPin, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { getUserKey, saveStoreInfo, saveBrandingSettings } from '../utils/storage';
import { StoreInfo } from '../types/invoice';
import { defaultBrandingSettings } from '../types/branding';
// Helper to determine active step
const steps = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'basic', title: 'Basic Info', icon: Building2 },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'tax', title: 'Tax Details', icon: Hash },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function SetupShop() {
  const navigate = useNavigate();
  const { user, displayEmail, refreshHasStore } = useAuth();
  const { refreshBranding } = useBranding();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [savingLater, setSavingLater] = useState(false);
  const [hasExistingStore, setHasExistingStore] = useState(false);

  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  });

  // Sync basic user info when auth completes
  useEffect(() => {
    if (user && !formData.email) {
      setFormData(prev => ({
        ...prev,
        ownerName: prev.ownerName || user.user_metadata?.name || '',
        email: prev.email || displayEmail || user.email || '',
      }));
    }
  }, [user, displayEmail]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#6366f1] animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Verifying account...</p>
      </div>
    );
  }

  // Load existing store as a draft so the user can edit
  useEffect(() => {
    const loadExisting = async () => {
      if (!user) return;
      try {
        // 1. Try checking by user_id
        let { data, error } = await supabase
          .from('stores')
          .select('id, business_name, email, phone, address, city, state, pincode, gstin, owner_name')
          .eq('user_id', user.id)
          .limit(1);

        // 2. Fallback to ID check (old setup pattern)
        if (!data || data.length === 0 || error) {
          const fallback = await supabase
            .from('stores')
            .select('id, business_name, email, phone, address, city, state, pincode, gstin, owner_name')
            .eq('id', user.id)
            .limit(1);
          data = fallback.data;
        }

        if (data && data.length > 0) {
          setHasExistingStore(true);
          const s = data[0];
          localStorage.setItem(getUserKey('active_store_id'), s.id);
          setFormData(prev => ({
            ...prev,
            shopName: s.business_name || prev.shopName,
            email: s.email || prev.email,
            phone: s.phone || prev.phone,
            address: s.address || prev.address,
            city: s.city || prev.city,
            state: s.state || prev.state,
            pincode: s.pincode || prev.pincode,
            gstin: s.gstin || prev.gstin,
            ownerName: s.owner_name || prev.ownerName,
          }));
        }
      } catch (err) {
        console.error('Error loading existing store:', err);
      }
    };
    loadExisting();
  }, [user]);

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(getUserKey('shopSetupDraft'));
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsedDraft }));
      } catch (e) {
        console.error('Error parsing shop setup draft:', e);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    localStorage.setItem(getUserKey('shopSetupDraft'), JSON.stringify(newFormData));

    // Auto-fetch location if pincode is 6 digits
    if (name === 'pincode' && value.length === 6 && /^\d{6}$/.test(value)) {
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

        setFormData(prev => {
          const updated = { ...prev, city, state };
          localStorage.setItem(getUserKey('shopSetupDraft'), JSON.stringify(updated));
          return updated;
        });
        toast.success(`Location identified: ${city}, ${state}`);
      }
    } catch (e) {
      console.error('Pincode fetch error:', e);
    } finally {
      setFetchingPincode(false);
    }
  };

  const handleNext = () => {
    // Basic validation per step
    if (currentStepIndex === 1) { // Basic Info
      if (!formData.shopName || !formData.phone) {
        toast.error('Please fill in required fields');
        return;
      }
      if (!/^[6-9]\d{9}$/.test(formData.phone)) {
        toast.error('Please enter a valid 10-digit phone number');
        return;
      }
    } else if (currentStepIndex === 2) { // Location
      if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
        toast.error('Please fill in all location details');
        return;
      }
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(curr => curr + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(curr => curr - 1);
    }
  };

  const createInitialStore = async (isSkipped = false) => {
    if (!user) {
      toast.error('You must be logged in to create a store');
      return false;
    }

    try {
      const storeData: StoreInfo = {
        name: isSkipped ? (formData.shopName || 'My Business') : formData.shopName,
        ownerName: formData.ownerName || '',
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        gstin: formData.gstin ? formData.gstin.toUpperCase() : '',
        authDistributors: '',
      };

      // Use unified helper which handles:
      // 1. Local storage prefixing
      // 2. User-ID pivot if no storeId exists
      // 3. Supabase upsert with proper user_id linking
      await saveStoreInfo(storeData);

      // Also save default branding if it's a new setup
      await saveBrandingSettings(defaultBrandingSettings);

      // Mark onboarding complete and remove draft
      localStorage.setItem(getUserKey('hasCompletedOnboarding'), 'true');
      localStorage.removeItem(getUserKey('shopSetupDraft'));

      return true;

    } catch (error: any) {
      console.error('Error in store setup:', error);
      toast.error('Failed to finish setup. Please try again.');
      return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const success = await createInitialStore(false);
    setLoading(false);

    if (success) {
      toast.success('Shop created successfully!');
      await refreshHasStore();
      await refreshBranding();
      navigate('/dashboard');
    }
  };

  const handleSkip = async () => {
    setSavingLater(true);

    // Create a barebones local store to allow user to bypass
    const existingId = localStorage.getItem(getUserKey('active_store_id')) || `offline-${Date.now()}`;
    localStorage.setItem(getUserKey('active_store_id'), existingId);

    // Just save enough locally to make the app work
    const storeInfo = {
      name: formData.shopName || 'My Business',
      gstin: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      email: '',
    };
    localStorage.setItem(getUserKey('bill_store_info'), JSON.stringify(storeInfo));
    localStorage.setItem(getUserKey('hasCompletedOnboarding'), 'true');
    localStorage.removeItem(getUserKey('shopSetupDraft'));

    // Optionally try to tell Supabase in the background, but never block on it
    if (user) {
      (async () => {
        try {
          await supabase.from('stores').upsert([{
            id: existingId.startsWith('offline-') ? undefined : existingId,
            user_id: user.id,
            business_name: storeInfo.name
          }]);
        } catch (e) {
          // ignore
        }
      })();
    }

    setSavingLater(false);
    toast('Reminder: You can complete your profile later in Settings.');
    await refreshHasStore();
    await refreshBranding();
    navigate('/dashboard');
  };

  // --- Render Steps ---

  const renderWelcome = () => (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center mx-auto mb-6">
        <Store className="w-10 h-10 text-[var(--color-primary)]" />
      </div>
      <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to Bill</h2>
      <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
        Let's get your business set up. We just need a few details to start generating professional invoices.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={handleNext}
          className="w-full sm:w-auto px-8 py-3.5 bg-[var(--color-primary)] text-white text-lg font-semibold rounded-xl shadow-lg shadow-[var(--color-primary)]/30 hover:shadow-[var(--color-primary)]/40 hover:-translate-y-0.5 transition-all"
        >
          Get Started
        </button>
        <button
          onClick={handleSkip}
          disabled={savingLater}
          className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-600 text-lg font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex justify-center"
        >
          {savingLater ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Skip for now'}
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-500">You can always add these details later in Settings.</p>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Business/Shop Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="shopName"
            value={formData.shopName}
            onChange={handleChange}
            placeholder="e.g. Acme Electronics"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Owner Name
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="Full Name"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Business Address <span className="text-red-500">*</span>
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={2}
            placeholder="Shop No, Building, Street"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 resize-none"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <select
              name="state"
              value={formData.state}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all"
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              PIN Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                maxLength={6}
                placeholder="6 digits"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400"
              />
              {fetchingPincode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTax = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            GSTIN (Optional)
          </label>
          <div className="relative">
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="w-full px-4 py-3 uppercase bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-400 placeholder:normal-case font-mono"
              autoFocus
            />
            {formData.gstin && formData.gstin.length === 15 && (
              <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            If you provide a GST number, invoices will be generated as Tax Invoices. Otherwise, they will be standard Bills of Supply.
          </p>
        </div>
      </div>
    </div>
  );

  const CurrentStepIcon = steps[currentStepIndex].icon || Building2;

  if (hasExistingStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-12 md:pt-24 px-4 items-center">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Store Already Configured</h2>
            <p className="text-slate-600 mb-8">
              Your store details are already set up. You can manage your business information, upload a logo, and customize invoice templates in the Store Settings.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/branding')}
                className="w-full px-6 py-3.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-[var(--color-primary)]/20 hover:-translate-y-0.5 transition-all"
              >
                Edit Store Details
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full px-6 py-3.5 bg-white text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-12 md:pt-24 px-4 overflow-x-hidden">

      {/* Top Navigation / Progress */}
      {currentStepIndex > 0 && (
        <div className="w-full max-w-2xl mb-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => {
              if (idx === 0) return null; // Skip welcome dot
              return (
                <div
                  key={step.id}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentStepIndex ? 'w-8 bg-primary' :
                    idx < currentStepIndex ? 'w-2 bg-primary/40' : 'w-2 bg-slate-200'
                    }`}
                />
              );
            })}
          </div>
          <button
            onClick={handleSkip}
            disabled={savingLater}
            className="text-[var(--color-primary)] hover:opacity-80 font-medium transition-colors"
          >
            Skip Setup
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className={`w-full max-w-2xl ${currentStepIndex === 0 ? 'bg-transparent shadow-none' : 'bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden'}`}>

        {currentStepIndex > 0 && (
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CurrentStepIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{steps[currentStepIndex].title}</h2>
                <p className="text-sm text-slate-500">Step {currentStepIndex} of {steps.length - 1}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">
          {currentStepIndex === 0 && renderWelcome()}
          {currentStepIndex === 1 && renderBasicInfo()}
          {currentStepIndex === 2 && renderLocation()}
          {currentStepIndex === 3 && renderTax()}
        </div>

        {/* Footer Actions */}
        {currentStepIndex > 0 && (
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl hover:opacity-90 hover:shadow-lg hover:shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : currentStepIndex === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Finish Setup
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}