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
    Menu,
    X
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        background: (isLandingPage && !scrolled && !isMenuOpen) ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: isMenuOpen ? 'none' : 'none',
        boxShadow: 'none',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    };

    return (
        <nav style={navStyles}>
            <div className="max-w-6xl mx-auto w-full px-4 h-20 flex items-center justify-between relative z-[1001]">
                <Link 
                    to={user ? "/dashboard" : "/"} 
                    style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} 
                    className="group"
                    onClick={() => setIsMenuOpen(false)}
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
                    {!(isLandingPage || isAuthPage) && (
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            style={{
                                position: 'relative',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: isMenuOpen ? 'var(--color-primary)' : 'var(--color-primary-light)',
                                color: isMenuOpen ? 'white' : 'var(--color-primary)',
                                border: 'none', cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isMenuOpen ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 2px 4px -1px rgba(0,0,0,0.06)',
                                zIndex: 1002
                            }}
                        >
                            {isMenuOpen ? (
                                <X className="w-6 h-6 animate-in fade-in zoom-in duration-300" />
                            ) : (
                                <div className="flex flex-col gap-[4px] animate-in fade-in zoom-in duration-300">
                                    <div style={{ width: '22px', height: '2.5px', background: 'currentColor', borderRadius: '10px' }} />
                                    <div style={{ width: '22px', height: '2.5px', background: 'currentColor', borderRadius: '10px' }} />
                                    <div style={{ width: '22px', height: '2.5px', background: 'currentColor', borderRadius: '10px' }} />
                                </div>
                            )}
                        </button>
                    )}

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

            {/* Full-Page Overlay Menu */}
            <div 
                className={`fixed inset-0 bg-white/98 backdrop-blur-xl z-[1000] flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.16, 1, 0.3, 1)] ${
                    isMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
                }`}
            >
                <div className="flex flex-col items-center gap-8 w-full max-w-lg px-6">
                    <div className="w-full space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6">Navigation</p>
                        {navItems.map((item, idx) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={`flex items-center gap-4 p-4 rounded-2xl w-full transition-all duration-300 hover:bg-slate-50 group ${
                                    location.pathname === item.path ? 'bg-slate-50' : ''
                                }`}
                                style={{
                                    transitionDelay: `${idx * 50}ms`,
                                    transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                                    opacity: isMenuOpen ? 1 : 0
                                }}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${
                                    location.pathname === item.path 
                                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-primary/20' 
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-md'
                                }`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-xl font-bold transition-colors ${
                                    location.pathname === item.path ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                                }`}>
                                    {item.label}
                                </span>
                            </Link>
                        ))}
                    </div>

                    <div 
                        className="w-full pt-8 mt-4 border-t border-slate-100"
                        style={{
                            transitionDelay: `${navItems.length * 50}ms`,
                            transform: isMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                            opacity: isMenuOpen ? 1 : 0
                        }}
                    >
                        {user && (
                            <button
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    signOut();
                                }}
                                className="flex items-center justify-center gap-3 w-full p-4 rounded-2xl bg-red-50 text-red-600 font-bold text-lg transition-all hover:bg-red-600 hover:text-white group"
                            >
                                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                Sign Out
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
