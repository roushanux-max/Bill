import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/utils/supabase';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { safeGet, safeSet, safeRemove } from '@/shared/utils/storage';
import { validateInput, ValidationRules } from '@/shared/utils/validation';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { settings } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = safeGet('bill_saved_email');
    const isRemembered = safeGet('bill_remember_me') === 'true';

    if (savedEmail && isRemembered) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already logged in (Handled by AuthContext and ProtectedRoute)
  useEffect(() => {
    if (!authLoading && user) {
      // Just wait for AuthContext to settle store state
      // No manual navigate() here to avoid race conditions with ProtectedRoute
    }
  }, [user, authLoading]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = ValidationRules.email.format(e.target.value);
    setEmail(val);
    setEmailError(validateInput('email', val));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordError(validateInput('password', val));
  };

  const isFormValid =
    !emailError && !passwordError && email.trim() !== '' && password.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);

    // Save credentials if "Remember Me" is checked
    if (rememberMe) {
      safeSet('bill_saved_email', email);
      safeSet('bill_remember_me', 'true');
    } else {
      // Clear saved credentials if unchecked
      safeRemove('bill_saved_email');
      safeRemove('bill_remember_me');
    }

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message || 'Failed to sign in');
      setLoading(false);
    } else {
      toast.success('Welcome back!');
      // Navigation will be handled by the auth state change
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Platform Preview */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
          {/* Subtle Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--brand-color)] blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--brand-color-light)] blur-[120px]" />
          </div>

          <div className="relative z-10 w-full max-w-lg transform hover:scale-[1.02] transition-transform duration-700">
            <div className="rounded-3xl p-4 flex justify-center items-center">
              <img
                src="/bill_illustration.png?v=2"
                alt="Invoice Platform Illustration"
                className="w-full max-w-sm h-auto drop-shadow-2xl"
              />
            </div>

            <div className="mt-8 text-center text-slate-900">
              <h2 className="text-3xl font-bold mb-4">Streamline Your Business</h2>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                Professional GST invoicing, inventory management, and customer tracking in one
                simple platform.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col h-full bg-white relative">
          {authLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mb-4" />
              <p className="text-slate-600 text-lg">Checking your account...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 md:px-24">
              <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center lg:text-left relative mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                  <p className="text-slate-500">Sign in to manage your business</p>
                </div>

                {/* Auth Actions */}
                <div className="space-y-6">
                  {/* Google Login - PRIMARY */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold shadow-lg shadow-primary/20 active:scale-[0.98]"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                    }}
                    title={
                      isOffline
                        ? 'You appear to be offline. Google Sign-in requires an internet connection.'
                        : ''
                    }
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-4 bg-white text-slate-400 font-medium tracking-wider">
                        Or email login
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={handleEmailChange}
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 ${
                          emailError
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-200 focus:border-primary'
                        }`}
                        placeholder="name@company.com"
                      />
                      {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="password"
                          className="block text-sm font-semibold text-slate-700"
                        >
                          Password
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 pr-12 ${
                            passwordError
                              ? 'border-red-500 focus:border-red-500'
                              : 'border-slate-200 focus:border-primary'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <label
                        htmlFor="rememberMe"
                        className="text-sm text-slate-600 cursor-pointer select-none"
                      >
                        Keep me logged in
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !isFormValid}
                      style={{
                        borderColor: 'var(--brand-color)',
                        color: 'var(--brand-color)',
                      }}
                      className="w-full py-3.5 rounded-xl font-semibold border hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In with Email'
                      )}
                    </button>
                  </form>

                  <p className="text-center text-slate-600 text-sm">
                    New to Invoice?{' '}
                    <Link
                      to="/register"
                      className="text-primary font-bold hover:opacity-80 transition-all"
                    >
                      Create an account
                    </Link>
                  </p>

                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-4 bg-white text-slate-400 font-medium">
                        Temporary Access
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/create-invoice')}
                    className="w-full py-3 rounded-xl font-bold border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col items-center justify-center gap-1"
                  >
                    <span>Try without signing up (Guest Mode)</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Data will not be saved after session ends
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simple Footer */}
          <div className="p-8 text-center border-t border-slate-50 text-xs text-slate-400 lg:text-left lg:px-24">
            © 2026 Invoice. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
