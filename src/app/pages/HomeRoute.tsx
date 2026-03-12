import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import LandingPage from './LandingPage';
import { Loader2 } from 'lucide-react';
import UserThemeProvider from '../components/UserThemeProvider';

export default function HomeRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Loading BillMint...</p>
            </div>
        );
    }

    return user ? (
        <UserThemeProvider>
            <Dashboard />
        </UserThemeProvider>
    ) : (
        <LandingPage />
    );
}
