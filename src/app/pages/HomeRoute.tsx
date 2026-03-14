import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

export default function HomeRoute() {
    const { user, loading: authLoading } = useAuth();
    const { loading: brandingLoading } = useBranding();

    if (authLoading || brandingLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Loading your business data...</p>
            </div>
        );
    }

    return <Dashboard />;
}
