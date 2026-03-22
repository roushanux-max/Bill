import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';
import Logo from '@/shared/components/Logo';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/utils/supabase';
import { validateEmail, validatePhone } from '@/shared/utils/validation';
import { safeSet } from '@/shared/utils/storage';

export default function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const checkOnboarding = async () => {
        try {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

          if (error) throw error;

          if (stores && stores.length > 0) {
            safeSet('active_store_id', stores[0].id);
            safeSet('hasCompletedOnboarding', 'true');
            navigate('/dashboard');
          } else {
            navigate('/setup-shop');
          }
        } catch (err) {
          console.error('Routing check error:', err);
          navigate('/onboarding');
        }
      };
      checkOnboarding();
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name || !mobile || !dob) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!validatePhone(mobile)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, name, mobile, '', dob);
    if (error) {
      toast.error(error.message || 'Failed to create account');
      setLoading(false);
    } else {
      toast.success('Account created successfully!');
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
        {/* Left Side: Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-primary)] blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-primary-light)] blur-[120px]" />
          </div>
          <div className="relative z-10 w-full max-w-2xl text-center">
            <div className="bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 mb-8 inline-block">
              <img
                src="/bill_illustration.png?v=2"
                alt="Bill Illustration"
                className="w-full max-w-sm h-auto"
              />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Join the Next Generation</h2>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              Professional GST billing, inventory management, and customer tracking. Setup in less than 60 seconds.
            </p>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full lg:w-1/2 flex flex-col h-full bg-white relative overflow-y-auto">
          {authLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin mb-4" />
              <p className="text-slate-600 text-lg">Checking your account...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 sm:px-12 md:px-24">
              <div className="w-full max-w-xl space-y-8">
                <div className="text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
                  <p className="text-slate-500">Professional billing for your business</p>
                </div>

                <div className="space-y-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold shadow-lg shadow-primary/20 active:scale-[0.98]"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-foreground)',
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-4 bg-white text-slate-400 font-medium tracking-wider">Or email registration</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="John Doe" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="name@company.com" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Mobile Number</label>
                        <input 
                          type="tel" 
                          required 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                          inputMode="tel"
                          maxLength={10}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary" 
                          placeholder="9876543210" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Date of Birth</label>
                        <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="••••••••" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Confirm Password</label>
                        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="••••••••" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        backgroundColor: (name && email && mobile && dob && password && confirmPassword) ? 'var(--color-primary)' : 'white',
                        color: (name && email && mobile && dob && password && confirmPassword) ? 'var(--color-primary-foreground)' : 'var(--color-primary)',
                        border: (name && email && mobile && dob && password && confirmPassword) ? 'none' : '1px solid var(--color-primary)',
                      }}
                      className="w-full py-3.5 rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                      {loading ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  <p className="text-center text-slate-600 text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-bold hover:opacity-80 transition-all">
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-8 text-center border-t border-slate-50 text-xs text-slate-400 lg:text-left lg:px-24">
            © 2026 Bill. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}