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
} from './ui/dropdown-menu';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const { settings, storeInfo } = useBranding();
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Invoices', icon: FileText, path: '/invoices' },
    { label: 'Create Invoice', icon: PlusCircle, path: '/create-invoice' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Customers', icon: Users, path: '/customers' },
    { label: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin', icon: Shield, path: '/admin' });
  }

  const primaryColor = user ? settings.primaryColor : '#6366f1';
  const businessName = user && storeInfo?.name ? storeInfo.name : 'Invoice';
  const displayLogo = user && settings.logo ? settings.logo : null;

  const isLandingPage = location.pathname === '/' && !user;
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyles: React.CSSProperties = {
    position: isLandingPage ? 'fixed' : 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: isLandingPage && !scrolled ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : 'none',
    boxShadow: scrolled ? '0 2px 20px -5px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <nav style={navStyles}>
      <div className="max-w-6xl mx-auto w-full px-4 h-20 flex items-center justify-between">
        <Link
          to={user ? '/dashboard' : '/'}
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
          className="group"
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-primary-light)',
              overflow: 'hidden',
            }}
            className="transition-transform group-hover:scale-105 shadow-sm"
          >
            {displayLogo ? (
              <img src={displayLogo} alt={businessName} className="w-full h-full object-contain" />
            ) : (
              <Logo className="w-7 h-7" />
            )}
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: '-0.5px',
              color: 'var(--color-text, #111)',
            }}
          >
            {businessName}
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!(isLandingPage || isAuthPage) && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'var(--brand-color-light)',
                    color: 'var(--brand-color)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--brand-color)';
                    (e.currentTarget as HTMLElement).style.color =
                      'var(--brand-color-foreground, white)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--brand-color-light)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--brand-color)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '2px',
                      background: 'currentColor',
                      borderRadius: '10px',
                    }}
                  />
                  <div
                    style={{
                      width: '14px',
                      height: '2px',
                      background: 'currentColor',
                      borderRadius: '10px',
                    }}
                  />
                  <div
                    style={{
                      width: '20px',
                      height: '2px',
                      background: 'currentColor',
                      borderRadius: '10px',
                    }}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <DropdownMenuLabel>
                  <span className="font-semibold text-slate-800">{businessName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link
                      to={item.path}
                      style={{ textDecoration: 'none' }}
                      className={`flex items-center gap-3 cursor-pointer py-3 px-3 rounded-xl transition-all ${
                        location.pathname === item.path
                          ? 'font-bold text-slate-900 bg-slate-50 shadow-sm border border-slate-100'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 transition-colors ${
                          location.pathname === item.path ? 'text-[var(--brand-color)]' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-[14px]">{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer py-3 px-3 rounded-xl transition-all border border-transparent"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  <span className="text-[14px]">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!user && !isAuthPage && (
            <div className="flex items-center gap-3">
              <Link
                to="/register"
                style={{
                  background:
                    'linear-gradient(135deg, var(--brand-color), var(--brand-color-hover))',
                  color: getContrastColor(primaryColor),
                  height: '48px',
                  padding: '0 28px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: '0 8px 16px -4px var(--brand-color-light)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
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
