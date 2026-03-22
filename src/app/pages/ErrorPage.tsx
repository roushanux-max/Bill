import { useNavigate, useLocation, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { Home, RefreshCw, ChevronLeft, AlertCircle, Search, Settings, Link2Off, Bug, ShieldAlert, Cpu, Globe, Database } from 'lucide-react';

interface ErrorPageProps {
  type?: '404' | 'maintenance' | 'offline' | 'error' | 'security';
  title?: string;
  message?: string;
}

export default function ErrorPage({ type: manualType, title, message }: ErrorPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const error = useRouteError();

  // Determine error details
  let type = manualType;
  let statusCode = "";
  let technicalMessage = "";

  if (!type && error) {
    if (isRouteErrorResponse(error)) {
      statusCode = error.status.toString();
      technicalMessage = error.statusText || (typeof error.data === 'string' ? error.data : error.data?.message);
      
      if (error.status === 404) type = '404';
      else if (error.status === 403 || error.status === 401) type = 'security';
      else if (error.status >= 500) type = 'error';
      else type = 'error';
    } else if (error instanceof Error) {
      technicalMessage = error.message;
      type = 'error';
    } else if (typeof error === 'string') {
      technicalMessage = error;
      type = 'error';
    }
  }

  if (!type) type = '404'; // Default fallback

  const config = {
    '404': {
      icon: Search,
      title: title || "Page Went Missing",
      message: message || "We searched everywhere but couldn't find the page you're looking for. It might have been moved or deleted.",
      buttonText: "Back to Home",
      insight: "The URL might be mistyped or the content was relocated during a recent update.",
      action: () => navigate('/')
    },
    'maintenance': {
      icon: Cpu,
      title: title || "New Code Arriving",
      message: message || "We're currently pushing some fresh code to the platform. This machine needs a quick restart and will be back in less than a minute.",
      buttonText: "Check Progress",
      insight: "Git deployment in progress. The server is updating to the latest stable version.",
      action: () => window.location.reload()
    },
    'offline': {
      icon: Link2Off,
      title: title || "Connection Lost",
      message: message || "It looks like your device is offline. Please check your internet connection and try again.",
      buttonText: "Reconnect",
      insight: "Your browser is unable to reach our servers. This is usually due to local network issues.",
      action: () => window.location.reload()
    },
    'security': {
      icon: ShieldAlert,
      title: title || "Access Denied",
      message: message || "You don't have permission to access this resource. Please ensure you are logged in correctly.",
      buttonText: "Login Again",
      insight: "Authentication tokens may have expired or your account lacks the necessary roles.",
      action: () => navigate('/login')
    },
    'error': {
      icon: Bug,
      title: title || "System Glitch",
      message: message || "An unexpected error occurred while processing your request. Our team has been notified.",
      buttonText: "Try Again",
      insight: "The server encountered an unhandled exception. This is likely a temporary backend issue.",
      action: () => window.location.reload()
    }
  }[type];

  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-10 animate-in fade-in zoom-in duration-500">
        {/* Icon Container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-indigo-50/50 group hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-[2.5rem]" />
            <div className="relative flex items-center justify-center w-24 h-24 bg-indigo-50 rounded-3xl group-hover:rotate-6 transition-transform duration-500">
              <Icon className="w-12 h-12 text-indigo-600 animate-float" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4 relative">
          <div className="flex items-center justify-center gap-2 mb-2">
             {statusCode && (
               <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 tracking-wider">
                 ERROR {statusCode}
               </span>
             )}
             <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 tracking-wider uppercase">
               {type}
             </span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {config.title}
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-[340px] mx-auto">
            {config.message}
          </p>
        </div>

        {/* Technical Insight Card */}
        <div className="bg-white/40 border border-slate-200/60 rounded-3xl p-5 text-left space-y-3 backdrop-blur-sm">
           <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Cpu className="w-4 h-4 text-indigo-500" />
              What's happening?
           </div>
           <p className="text-slate-500 text-xs leading-relaxed italic">
              "{config.insight}"
           </p>
           {technicalMessage && (
             <div className="pt-2 border-t border-slate-100 mt-2">
                <code className="text-[10px] text-slate-400 font-mono block break-all">
                   Error: {technicalMessage}
                </code>
             </div>
           )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Button 
            onClick={config.action}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 h-12 shadow-lg shadow-indigo-200 transition-all active:scale-95 text-base font-semibold"
          >
            {type === '404' ? <Home className="w-5 h-5 mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
            {config.buttonText}
          </Button>
          
          {type !== '404' && (
             <Button 
              variant="outline"
              onClick={() => navigate('/')}
              size="lg"
              className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl px-8 h-12 transition-all active:scale-95 text-base font-semibold"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Home
            </Button>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 opacity-60">
            <Globe className="w-3 h-3" />
            {window.location.hostname}
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <Database className="w-3 h-3" />
            Supabase Region: Bombay
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <AlertCircle className="w-3 h-3" />
            Path: {location.pathname}
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px] animate-pulse-slow" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-10px) rotate(-5deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 10s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
