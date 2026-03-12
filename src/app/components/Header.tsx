import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { User, LogOut } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';
import { getContrastColor } from '../../utils/colorUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const { user, displayEmail, signOut } = useAuth();
    const { settings, storeInfo } = useBranding();
    const location = useLocation();
    const navigate = useNavigate();

    const primaryColor = user ? settings.primaryColor : '#FF0000';
    const contrastColor = getContrastColor(primaryColor);
    const businessName = user && storeInfo?.name ? storeInfo.name : 'BillMint';
    const displayLogo = user && settings.logo ? settings.logo : null;

    const isLandingPage = location.pathname === '/' && !user;
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

    const navStyles: React.CSSProperties = {
        position: isLandingPage ? 'fixed' : 'sticky',
        top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '16px max(24px, calc((100vw - 1200px)/2))',
        background: (isLandingPage && !scrolled) ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    };

    return (
        <nav style={navStyles}>
            <Link to={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} className="group">
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid var(--color-primary-light)',
                    overflow: 'hidden'
                }} className="transition-transform group-hover:scale-105 shadow-sm">
                    {displayLogo ? (
                        <img src={displayLogo} alt={businessName} className="w-full h-full object-contain" />
                    ) : (
                        <Logo className="w-7 h-7" />
                    )}
                </div>
                <span style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px', color: 'var(--color-text, #111)' }}>
                    {businessName}
                </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center' }}>
                {user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="focus:outline-none">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold overflow-hidden"
                                    style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                                >
                                    {user.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : <User size={16} />}
                                </div>
                                <span className="text-sm font-medium text-slate-700 hidden sm:block pr-2">
                                    {user.user_metadata?.name?.split(' ')[0] || 'Account'}
                                </span>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user.user_metadata?.name || 'User'}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link to="/dashboard" className="cursor-pointer w-full flex items-center">
                                    Dashboard
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/branding" className="cursor-pointer w-full flex items-center">
                                    Branding & Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <div className="hidden md:flex items-center gap-3">
                        {location.pathname !== '/login' && (
                            <Link to="/login" style={{
                                color: '#475569', fontSize: 15, fontWeight: 600,
                                textDecoration: 'none', padding: '8px 16px',
                                borderRadius: 10, transition: 'color 0.2s'
                            }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
                            >
                                Sign in
                            </Link>
                        )}
                        <Link to="/register" style={{
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', color: contrastColor, padding: '10px 24px', borderRadius: 12,
                            textDecoration: 'none', fontSize: 15, fontWeight: 700,
                            boxShadow: '0 15px 30px -10px var(--color-primary-light)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 20px 40px -10px var(--color-primary-light)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 15px 30px -10px var(--color-primary-light)';
                            }}
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
