import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Home, FileText, Plus, Users, Settings, Package, Shield } from 'lucide-react';
import { cn } from './ui/utils';
import { useBranding } from '@/shared/contexts/BrandingContext';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { settings } = useBranding();

  const baseItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Invoices', icon: FileText, path: '/invoices' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Customers', icon: Users, path: '/customers' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const navItems = isAdmin 
    ? [...baseItems, { label: 'Admin', icon: Shield, path: '/admin' }]
    : baseItems;

  const hideOnPaths = ['/invoice-preview', '/login', '/register', '/'];
  if (hideOnPaths.some(p => location.pathname === p || location.pathname.startsWith('/invoice-preview'))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50" />
      
      <div className="relative flex items-center justify-around h-20 px-4 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center transition-all px-2 relative",
                isActive ? "text-[var(--color-primary)]" : "text-slate-500"
              )}
            >
              <Icon 
                className={cn("w-6 h-6 mb-1 transition-transform", location.pathname === item.path ? "scale-110" : "")} 
                style={location.pathname === item.path ? { color: settings.primaryColor } : {}}
              />
              <span className={cn("text-[10px] font-medium transition-opacity", location.pathname === item.path ? "opacity-100" : "opacity-70")}>
                {item.label}
              </span>
              
              {location.pathname === item.path && (
                <div 
                  className="absolute -bottom-1 w-1 h-1 rounded-full animate-pulse"
                  style={{ backgroundColor: settings.primaryColor }}
                />
              )}
            </NavLink>
          );
        })}
      </div>

      <NavLink
        to="/create-invoice"
        className={({ isActive }) => cn(
          "fixed bottom-28 right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-95 z-[110]",
          isActive ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        style={{ 
          backgroundColor: '#fff',
          color: settings.primaryColor,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <Plus className="w-8 h-8" style={{ color: settings.primaryColor }} strokeWidth={3} />
      </NavLink>
    </nav>
  );
};

export default MobileNav;
