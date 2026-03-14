import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { useBranding } from '../contexts/BrandingContext';
import { getContrastColor } from '../../utils/colorUtils';
import { 
    LayoutDashboard, 
    FileText, 
    PlusCircle, 
    Users, 
    Settings as SettingsIcon, 
    Package, 
    LogOut,
    Menu
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
    const { user, signOut } = useAuth();
    const { settings, storeInfo } = useBranding();
    const location = useLocation();

    const navItems = [
        { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Bills', icon: FileText, path: '/invoices' },
        { label: 'Create Invoice', icon: PlusCircle, path: '/create-invoice' },
        { label: 'Products', icon: Package, path: '/products' },
        { label: 'Clients', icon: Users, path: '/customers' },
        { label: 'Settings', icon: SettingsIcon, path: '/settings' },
    ];

    const primaryColor = user ? settings.primaryColor : '#6366f1';
    // Only show store brand when user is fully authenticated - prevents data leak to landing page
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
                    <div className="hidden md:flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 16px', borderRadius: '12px',
                                    background: 'var(--color-primary-light)',
                                    color: 'var(--color-primary)',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: 14,
                                    transition: 'all 0.2s'
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <Menu className="w-5 h-5" />
                                    <span>Menu</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 mt-2">
                                <DropdownMenuLabel>Quick Access</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {navItems.map((item) => (
                                    <Link key={item.path} to={item.path} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <DropdownMenuItem className="cursor-pointer gap-2 py-2.5">
                                            <item.icon className="w-4 h-4 text-slate-500" />
                                            <span>{item.label}</span>
                                        </DropdownMenuItem>
                                    </Link>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="cursor-pointer gap-2 py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => signOut()}
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
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
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))', color: getContrastColor(primaryColor), padding: '10px 24px', borderRadius: 12,
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
