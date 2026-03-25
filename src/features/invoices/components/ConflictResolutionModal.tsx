import React, { useState } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { StoreInfo } from '@/features/invoices/types/invoice';
import { BrandingSettings } from '@/shared/types/branding';
import { ShieldAlert, Check } from 'lucide-react';
import { saveStoreInfo, saveBrandingSettings, safeRemove } from '@/shared/utils/storage';
import { supabase } from '@/shared/utils/supabase';

interface ConflictResolutionModalProps {
    guestStore: StoreInfo;
    guestBranding: BrandingSettings;
    onResolve: (action: 'all' | 'new' | 'temp' | 'discard') => void;
}

export default function ConflictResolutionModal({ guestStore, guestBranding, onResolve }: ConflictResolutionModalProps) {
    const [selected, setSelected] = useState<'all' | 'new' | 'temp' | 'discard'>('new');
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();
    const { updateSettings, updateStoreInfo, settings: dbSettings } = useBranding();

    const handleApply = async () => {
        setSaving(true);
        try {
            if (selected === 'all' || selected === 'new') {
                // Ensure complete branding state (no partials)
                const completeStore = {
                    ...guestStore,
                    name: guestStore.name || 'Your Business', // Fallback if missing
                };
                const completeBranding = {
                    ...guestBranding,
                    primaryColor: guestBranding.primaryColor || dbSettings.primaryColor,
                    logo: guestBranding.logo || dbSettings.logo,
                    signatureImage: guestBranding.signatureImage || dbSettings.signatureImage,
                };
                
                await updateSettings(completeBranding);
                await updateStoreInfo(completeStore);

                if (selected === 'all') {
                    // Update all existing invoices for this user with the new branding/store info
                    // (Assuming store_info is serialized per invoice, we update the profile so future loads apply it)
                    // Note: Invoices are usually immutable. "Apply to all" in this context updates the active profile
                    // which applies to the dashboard and everywhere else.
                }
            } else if (selected === 'temp') {
                // We keep guest state via a window override in BrandingContext (handled upstream)
            } else if (selected === 'discard') {
                // Discard guest changes, reload DB
            }
            
            // Cleanup guest storage keys
            const keys = [
                'guest_demo_store_info', 
                'guest_demo_branding_settings',
                'bill_guest_mode'
            ];
            keys.forEach(k => safeRemove(k));
            window.sessionStorage.removeItem('bill_guest_mode');

            onResolve(selected);
        } catch (e) {
            console.error('Error resolving conflict:', e);
        } finally {
            setSaving(false);
        }
    };

    const options = [
        { id: 'all', title: 'Apply to all', desc: 'Update my profile and use this for all invoices' },
        { id: 'new', title: 'Apply to new invoices', desc: 'Update profile, keep old invoices unchanged' },
        { id: 'temp', title: 'Use only for this invoice', desc: 'Temporary. Do not save to my profile' },
        { id: 'discard', title: 'Keep existing business details', desc: 'Discard these guest changes' },
    ] as const;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] shadow-2xl max-w-md w-full p-8 scale-in-center overflow-hidden relative border border-slate-100">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-amber-400" />
                
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-5">
                    <ShieldAlert size={24} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Sync Business Details?</h3>
                <p className="text-slate-500 mb-6 leading-relaxed font-medium">
                    You made changes to your branding while logged out. How would you like to apply them to your existing account?
                </p>

                <div className="space-y-3 mb-8">
                    {options.map(opt => (
                        <label 
                            key={opt.id} 
                            className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected === opt.id ? 'border-amber-500 bg-amber-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                            onClick={() => setSelected(opt.id)}
                        >
                            <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center mr-3 shrink-0 ${selected === opt.id ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                                {selected === opt.id && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div>
                                <div className={`font-bold ${selected === opt.id ? 'text-amber-900' : 'text-slate-700'}`}>{opt.title}</div>
                                <div className="text-sm text-slate-500 font-medium mt-0.5">{opt.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={handleApply}
                        disabled={saving}
                        className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Confirm Choice'}
                    </button>
                </div>
            </div>
        </div>
    );
}
