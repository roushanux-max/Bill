import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, PlusCircle, Users, Settings, Package } from 'lucide-react';
import { cn } from './ui/utils';
import { useBranding } from '../contexts/BrandingContext';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const { settings } = useBranding();

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Bills', icon: FileText, path: '/invoices' },
    { label: 'Create', icon: PlusCircle, path: '/create-invoice', isCenter: true },
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

          if (item.isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "relative -top-5 flex flex-col items-center justify-center transition-transform active:scale-95",
                  isActive ? "scale-110" : "hover:scale-105"
                )}
              >
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl shadow-primary/20"
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.primaryColor}dd)`,
                  }}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <span className="text-[10px] font-bold mt-2 text-slate-900 uppercase tracking-widest">
                  {item.label}
                </span>
              </NavLink>
            );
          }

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
              <span className={cn("text-[10px] font-medium transition-opacity", isActive ? "opacity-100" : "opacity-70")}>
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
    </nav>
  );
};

export default MobileNav;
