import { useAuth } from '@/shared/contexts/AuthContext';
import { useBranding } from '@/shared/contexts/BrandingContext';
import Dashboard from './Dashboard';
import LoadingScreen from '@/shared/components/LoadingScreen';

export default function HomeRoute() {
    const { user, loading: authLoading } = useAuth();
    const { loading: brandingLoading } = useBranding();

    if (authLoading || brandingLoading) {
        return <LoadingScreen message="Loading your business data..." />;
    }

    return <Dashboard />;
}
