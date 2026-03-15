import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, Plus, Users, Settings, Package } from 'lucide-react';
import { cn } from './ui/utils';
import { useBranding } from '../contexts/BrandingContext';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useBranding();

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Bills', icon: FileText, path: '/invoices' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Clients', icon: Users, path: '/customers' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  // Hidden on setup-shop or other full-screen onboarding pages if needed
  const hideOnPaths = ['/setup-shop', '/invoice-preview'];
  if (hideOnPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
      {/* Background with Glassmorphism */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50" />
      
      <div className="relative flex items-center justify-around h-20 px-4 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center transition-all px-2",
                isActive ? "text-[var(--color-primary)]" : "text-slate-500"
              )}
            >
              <Icon 
                className={cn("w-6 h-6 mb-1 transition-transform", isActive ? "scale-110" : "")} 
                style={isActive ? { color: settings.primaryColor } : {}}
              />
              <span className={cn("text-xs font-medium transition-opacity", isActive ? "opacity-100" : "opacity-70")}>
                {item.label}
              </span>
              
              {/* Active Indicator Dot */}
              {isActive && (
                <div 
                  className="absolute bottom-4 w-1 h-1 rounded-full animate-pulse"
                  style={{ backgroundColor: settings.primaryColor }}
                />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Gmail-style Floating Action Button for Create Invoice */}
      <NavLink
        to="/create-invoice"
        className={({ isActive }) => cn(
          "fixed bottom-28 right-5 w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-95 z-[110] md:hidden",
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
