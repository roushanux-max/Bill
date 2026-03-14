import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import Dashboard from './Dashboard';
import LoadingScreen from '../components/LoadingScreen';

export default function HomeRoute() {
    const { user, loading: authLoading } = useAuth();
    const { loading: brandingLoading } = useBranding();

    if (authLoading || brandingLoading) {
        return <LoadingScreen message="Loading your business data..." />;
    }

    return <Dashboard />;
}
