import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/shared/contexts/NavigationContext';
import UnifiedInvoiceBuilder from '@/features/invoices/components/UnifiedInvoiceBuilder';

export default function CreateInvoice() {
  const { smartBack } = useNavigation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
       <main className="max-w-[1100px] mx-auto pt-8 px-4">
          {/* Back button on the left, above title */}
          <div className="mb-3">
            <Button
              variant="ghost"
              className="gap-1.5 text-slate-500 hover:text-slate-800 pl-0"
              onClick={() => smartBack('/')}
            >
              <ArrowLeft size={16} /> Back
            </Button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black text-slate-900">Create Invoice</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {user ? 'Edit branding and invoice details inline. Changes auto-save.' : 'Temporary session — download before closing this tab.'}
            </p>
          </div>

          <UnifiedInvoiceBuilder />
       </main>
    </div>
  );
}
