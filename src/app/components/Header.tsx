import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { useBranding } from '../contexts/BrandingContext';
import { getContrastColor } from '../../utils/colorUtils';
import { 
    Home, 
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
        { label: 'Home', icon: Home, path: '/dashboard' },
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
        background: (isLandingPage && !scrolled) ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: 'none',
        boxShadow: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    };

    return (
        <nav style={navStyles}>
            <div className="max-w-6xl mx-auto w-full px-4 h-20 flex items-center justify-between">
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'var(--color-primary-light)',
                                color: 'var(--color-primary)',
                                border: 'none', cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: '0 2px 4px -1px rgba(0,0,0,0.06)'
                            }} onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                            }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.06)';
                                }}>
                                <div style={{ width: '20px', height: '2.5px', background: 'currentColor', borderRadius: '10px' }} />
                                <div style={{ width: '12px', height: '2.5px', background: 'currentColor', borderRadius: '10px', marginLeft: 'auto' }} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            {user ? (
                                <>
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
                                </>
                            ) : (
                                <>
                                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <Link to="/login" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <DropdownMenuItem className="cursor-pointer gap-2 py-2.5">
                                            <LogOut className="w-4 h-4 text-slate-500 rotate-180" />
                                            <span>Sign In</span>
                                        </DropdownMenuItem>
                                    </Link>
                                    <Link to="/register" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <DropdownMenuItem className="cursor-pointer gap-2 py-2.5">
                                            <PlusCircle className="w-4 h-4 text-slate-500" />
                                            <span>Get Started</span>
                                        </DropdownMenuItem>
                                    </Link>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {!user && (
                        <div className="hidden md:flex items-center gap-3">
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
