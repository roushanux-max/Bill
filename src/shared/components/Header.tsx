import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import Logo from './Logo';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { getContrastColor } from '@/shared/utils/colorUtils';
import { 
    Home, 
    FileText, 
    PlusCircle, 
    Users, 
    Settings as SettingsIcon, 
    Package, 
    LogOut,
    Shield,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const { user, signOut, isAdmin } = useAuth();
    const { settings, storeInfo } = useBranding();
    const location = useLocation();

    const navItems = [
        { label: 'Home', icon: Home, path: '/dashboard' },
        { label: 'Bills', icon: FileText, path: '/invoices' },
        { label: 'Create Invoice', icon: PlusCircle, path: '/create-invoice' },
        { label: 'Products', icon: Package, path: '/products' },
        { label: 'Clients', icon: Users, path: '/customers' },
        { label: 'Settings', icon: SettingsIcon, path: '/settings' },
    ];

    if (isAdmin) {
        navItems.push({ label: 'Admin', icon: Shield, path: '/admin' });
    }

    const primaryColor = user ? settings.primaryColor : '#6366f1';
    const businessName = (user && storeInfo?.name) ? storeInfo.name : 'Bill';
    const displayLogo = (user && settings.logo) ? settings.logo : null;

    const isLandingPage = location.pathname === '/' && !user;
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navStyles: React.CSSProperties = {
        position: isLandingPage ? 'fixed' : 'sticky',
        top: 0, left: 0, right: 0, zIndex: 1000,
        background: (isLandingPage && !scrolled) ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
        boxShadow: scrolled ? '0 2px 20px -5px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    };

    return (
        <nav style={navStyles}>
            <div className="max-w-6xl mx-auto w-full px-4 h-20 flex items-center justify-between">
                <Link 
                    to={user ? "/dashboard" : "/"} 
                    style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} 
                    className="group"
                >
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!(isLandingPage || isAuthPage) && user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                        width: '44px', height: '44px', borderRadius: '12px',
                                        background: 'var(--color-primary-light)',
                                        color: 'var(--color-primary)',
                                        border: 'none', cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.06)',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)';
                                        (e.currentTarget as HTMLElement).style.color = 'white';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-light)';
                                        (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
                                    }}
                                >
                                    <div style={{ width: '20px', height: '2px', background: 'currentColor', borderRadius: '10px' }} />
                                    <div style={{ width: '14px', height: '2px', background: 'currentColor', borderRadius: '10px' }} />
                                    <div style={{ width: '20px', height: '2px', background: 'currentColor', borderRadius: '10px' }} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 mt-2">
                                <DropdownMenuLabel>
                                    <span className="font-semibold text-slate-800">{businessName}</span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {navItems.map(item => (
                                    <DropdownMenuItem key={item.path} asChild>
                                        <Link
                                            to={item.path}
                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                            className={`flex items-center gap-3 cursor-pointer ${location.pathname === item.path ? 'font-semibold' : ''}`}
                                        >
                                            <item.icon className="w-4 h-4 text-slate-500" />
                                            {item.label}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={signOut}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {!user && !isAuthPage && (
                        <div className="flex items-center gap-3">
                            <Link to="/register" style={{
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', 
                                color: getContrastColor(primaryColor), 
                                padding: '10px 24px', 
                                borderRadius: 12,
                                textDecoration: 'none', fontSize: 15, fontWeight: 700,
                                boxShadow: '0 10px 20px -5px var(--color-primary-light)',
                                transition: 'all 0.2s'
                            }}
                                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
