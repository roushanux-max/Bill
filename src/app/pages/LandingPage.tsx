import React, { useState, useEffect, useRef } from 'react';
// Rebuild for effortless title update
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Shield,
  Zap,
  FileText,
  Users,
  Package,
  ChevronDown,
  Download,
  Sparkles,
  Briefcase,
  Sofa,
  Scissors,
  ShoppingCart,
  Stethoscope,
  Hotel,
  Code2,
  Cpu,
  Utensils,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/shared/components/Logo';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { defaultBrandingSettings } from '@/shared/types/branding';
import { supabase } from '@/shared/utils/supabase';
import InvoiceForm from '@/features/invoices/components/InvoiceForm';

// --- Utility: Intersection Observer Hook for scroll animations ---
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// --- Sub-components ---
function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const stats = [
  { value: '60s', label: 'To create an invoice' },
  { value: '100%', label: 'GST compliant' },
  { value: 'Free', label: 'Forever for small businesses' },
];

const DOMAINS = [
  { id: 'furniture',    label: 'Furniture',           icon: Sofa,         color: '#92400e', bg: '#fef3c7', desc: 'Material, HSN & dimensions' },
  { id: 'clothing',     label: 'Clothing & Fashion',   icon: Scissors,     color: '#be185d', bg: '#fdf2f8', desc: 'Size, color & fabric details' },
  { id: 'grocery',      label: 'Grocery / Kirana',     icon: ShoppingCart,  color: '#15803d', bg: '#f0fdf4', desc: 'Units, batch & FMCG billing' },
  { id: 'medical',      label: 'Medical / Pharmacy',   icon: Stethoscope,  color: '#0369a1', bg: '#f0f9ff', desc: 'Patient & prescription fields' },
  { id: 'hotel',        label: 'Hotel & Restaurant',   icon: Hotel,        color: '#b45309', bg: '#fffbeb', desc: 'Rooms, covers & stay billing' },
  { id: 'freelance',    label: 'Freelance & Services', icon: Code2,        color: '#7c3aed', bg: '#f5f3ff', desc: 'Hourly & project-based' },
  { id: 'electronics',  label: 'Electronics',          icon: Cpu,          color: '#0f172a', bg: '#f8fafc', desc: 'Serial numbers & warranty' },
  { id: 'food',         label: 'Food & Catering',      icon: Utensils,     color: '#c2410c', bg: '#fff7ed', desc: 'Bulk orders & catering' },
  { id: 'retail',       label: 'Retail / Shop',        icon: ShoppingBag,  color: '#0891b2', bg: '#ecfeff', desc: 'Multi-product retail billing' },
  { id: 'general',      label: 'General Business',     icon: Briefcase,    color: '#6366f1', bg: '#f5f3ff', desc: 'Works for any business type' },
];

export default function LandingPage() {
  const { settings } = useBranding();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasFormData, setHasFormData] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: any }) => setUser(data.user));
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Silent SEO Optimization
    document.title = 'Invoice | Professional GST Billing Software for Indian Businesses';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Generate GST-compliant invoices in seconds. Invoice is a fast, free, and secure business management tool designed specifically for Indian small enterprises and freelancers.'
      );
    }

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute(
      'content',
      'Roushan Kumar, roushan.framer.website, Free GST Billing Software India, Invoice Generator for Small Business India, GST Compliant Invoice Maker, Professional Invoicing Tool, Business Management App India, Offline First PWA Billing'
    );

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      style={{
        background: '#fff',
        color: '#1a1a2e',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* ─── Hero ─── */}
      <header
        style={{
          textAlign: 'center',
          padding: '100px max(16px, calc((100vw - 800px)/2)) 40px',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 500,
            background:
              'radial-gradient(ellipse at center, var(--color-primary-light, #f5f3ff) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />

        <div
          style={{
            opacity: 1,
            animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Pill badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-primary-light, #f5f3ff)',
              opacity: 0.9,
              border: '1px solid var(--color-primary)',
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 32,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--color-primary)',
            }}
          >
            <Zap size={14} fill="currentColor" className="animate-pulse" />
            <span>Proprietary PWA technology • 100% Free</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 8vw, 76px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-2.5px',
              color: '#0f172a',
              margin: '0 0 24px',
            }}
          >
            Invoicing made
            <br />
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary, #6366f1) 0%, var(--color-primary-hover, #4f46e5) 50%, var(--color-primary-light, #f5f3ff) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              effortless.
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(17px, 2vw, 21px)',
              color: '#475569',
              maxWidth: 640,
              margin: '0 auto 32px',
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Generate GST-compliant bills in seconds. Built for speed, precision, and simplicity. No
            hidden costs. No clutter.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <Link
              to="/register"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--color-primary-foreground, white)',
                textDecoration: 'none',
                background:
                  'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                height: '60px',
                padding: '0 40px',
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 12px 24px -8px var(--color-primary-light)',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px -12px var(--color-primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 12px 24px -8px var(--color-primary-light)';
              }}
            >
              Start Invoicing Now <ArrowRight size={20} />
            </Link>
          </div>

          {/* Scroll hint */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              color: '#9ca3af',
              animation: 'bounce 2s infinite',
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Scroll
            </span>
            <ChevronDown size={16} />
          </div>
        </div>
      </header>

      {/* ─── Interactive Demo / Experience ─── */}
      <section
        id="experience"
        style={{
          padding: '40px max(16px, calc((100vw - 1152px)/2)) 10px',
          background: 'radial-gradient(circle at 50% 110%, #f5f3ff 0%, #fff 100%)',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '-2px',
              marginBottom: 12,
            }}
          >
            Experience the Speed.
          </h2>
          <p style={{ fontSize: 20, color: '#64748b', maxWidth: 660, margin: '0 auto 24px' }}>
            Create, customize, and download a professional GST invoice in real-time. No registration
            required to try.
          </p>

          {/* Prominent Guest Message - ONLY shown if user has data */}
          {!user && hasFormData && (
            <div className="flex flex-col items-center gap-3">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 20px',
                  background: '#f0f9ff',
                  borderRadius: 100,
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <Shield size={18} fill="#0ea5e9" color="#fff" />
                <span>Create invoices instantly. Register to save and access them anytime — guest invoices are temporary.</span>
              </div>
              
              <p className="text-sm font-medium text-slate-500 max-w-md">
                Guest invoices are deleted after 10 minutes or on page refresh. Download before leaving.
              </p>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 py-2 md:py-4 my-1 md:my-2">
          <InvoiceForm onInteractionChange={setHasFormData} />
        </div>
      </section>

      {/* ─── Registration Benefits CTA ─── */}
      {!user && (
        <section
          style={{
            padding: '40px max(16px, calc((100vw - 1100px)/2)) 20px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <AnimatedSection>
            <div
              style={{
                background: 'linear-gradient(145deg, #ffffff, #f9fafb)',
                borderRadius: 32,
                padding: '48px 32px',
                textAlign: 'center',
                border: '1px solid #f1f5f9',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03)',
                maxWidth: 900,
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
              }}
            >
              <div
                style={{
                  padding: '12px',
                  background: '#f5f3ff',
                  borderRadius: 100,
                  color: 'var(--color-primary)',
                  marginBottom: 8,
                }}
              >
                <Sparkles size={28} fill="currentColor" strokeWidth={1} style={{ opacity: 0.8 }} />
              </div>
              <h3
                style={{
                  fontSize: 'clamp(24px, 4vw, 36px)',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-1px',
                  lineHeight: 1.2,
                }}
              >
                Go beyond basics.
                <br />
                <span style={{ color: 'var(--color-primary)' }}>Register your business today.</span>
              </h3>
              <p
                style={{
                  fontSize: 'clamp(16px, 1.5vw, 19px)',
                  color: '#64748b',
                  maxWidth: 580,
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                Unlock <strong>industry-specific invoice domains</strong> (Furniture, Clothing, Medical, and more) plus access to our full library of <strong>professional templates</strong>.
              </p>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--color-primary)',
                  color: 'white',
                  padding: '16px 36px',
                  borderRadius: 16,
                  fontWeight: 800,
                  fontSize: 16,
                  textDecoration: 'none',
                  boxShadow: '0 10px 25px -5px var(--color-primary-light)',
                  transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                  marginTop: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.background = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.background = 'var(--color-primary)';
                }}
              >
                Create Your Free Account <ArrowRight size={20} />
              </Link>
            </div>
          </AnimatedSection>
        </section>
      )}


      {/* ─── Stats ─── */}
      <section
        style={{
          padding: '0 max(16px, calc((100vw - 1152px)/2)) 40px',
          marginTop: '16px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <AnimatedSection>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 1,
              background: '#f1f5f9',
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
            }}
          >
            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  padding: '32px 24px',
                  textAlign: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <div
                  style={{
                    fontSize: 'clamp(28px, 4vw, 40px)',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                    letterSpacing: '-1px',
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginTop: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Industry Domains Showcase ─── */}
      <section
        id="industries"
        style={{
          padding: '60px max(16px, calc((100vw - 1200px)/2))',
          position: 'relative',
          zIndex: 2,
          background: 'linear-gradient(180deg, #fff 0%, #f8fafc 100%)',
        }}
      >
        <AnimatedSection>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--color-primary-light, #f5f3ff)',
                border: '1px solid var(--color-primary)',
                borderRadius: 100,
                padding: '6px 16px',
                marginBottom: 20,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-primary)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={12} fill="currentColor" />
              Register to unlock
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px, 4vw, 48px)',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-1.5px',
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Built for <em style={{ fontStyle: 'normal', color: 'var(--color-primary)' }}>your</em> industry.
            </h2>
            <p style={{ fontSize: 18, color: '#64748b', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
              Every business is different. Register to get domain-specific invoice fields, column layouts, and templates tailored to your trade.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 48,
            }}
          >
            {DOMAINS.map((domain, i) => {
              const Icon = domain.icon;
              return (
                <div
                  key={domain.id}
                  style={{
                    background: '#fff',
                    border: '1.5px solid #f1f5f9',
                    borderRadius: 20,
                    padding: '20px 18px',
                    cursor: 'default',
                    transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                    animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 50}ms both`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = domain.color + '60';
                    e.currentTarget.style.boxShadow = `0 12px 32px -8px ${domain.color}25`;
                    e.currentTarget.style.background = domain.bg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#f1f5f9';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = '#fff';
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: domain.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={22} color={domain.color} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 4, lineHeight: 1.3 }}>
                    {domain.label}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, fontWeight: 500 }}>
                    {domain.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))',
                color: 'white',
                padding: '14px 32px',
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: '0 8px 20px -5px var(--color-primary-light)',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
            >
              Choose Your Business Vertical <ArrowRight size={18} />
            </Link>
            <p style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Free forever. No credit card required.</p>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Features ─── */}

      <section
        id="features"
        style={{
          padding: '80px max(16px, calc((100vw - 1152px)/2))',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-1.5px',
              marginBottom: 24,
            }}
          >
            Engineered for modern business.
          </h2>
          <p
            style={{
              fontSize: 20,
              color: '#475569',
              maxWidth: 640,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Invoice provides a powerful suite of tools to manage your invoicing, customers, and
            inventory with zero friction.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 32,
          }}
        >
          {[
            {
              icon: FileText,
              title: 'GST-Compliant Invoicing',
              desc: 'Automatically calculate CGST, SGST, and IGST. Generate HSN-ready tax invoices that meet all Indian regulatory standards.',
              color: 'var(--color-primary)',
              bg: 'var(--color-primary-light)',
            },
            {
              icon: Users,
              title: 'Customer Management',
              desc: 'Save unlimited customer details, track their purchase history, and manage their GSTINs for recurring professional invoicing.',
              color: '#10b981',
              bg: '#f0fdf4',
            },
            {
              icon: Package,
              title: 'Product Catalog',
              desc: 'Quickly add products with predefined HSN codes and GST rates. Auto-populate invoice items for ultra-fast invoice creation.',
              color: '#f59e0b',
              bg: '#fffbeb',
            },
            {
              icon: Shield,
              title: 'Privacy First',
              desc: 'Your business data stays in your browser. We prioritize your privacy with local storage and secure cloud-based data isolation.',
              color: 'var(--color-primary)',
              bg: 'var(--color-primary-light)',
            },
            {
              icon: Zap,
              title: 'Offline Optimized (PWA)',
              desc: 'Install Invoice on your phone or desktop. Works perfectly offline, so you can continue invoicing even without an internet connection.',
              color: '#8b5cf6',
              bg: 'var(--color-primary-light)',
            },
            {
              icon: Sparkles,
              title: 'Premium Branding',
              desc: 'Customize invoices with your company logo, signature, and theme colors. Make your brand stand out on every document.',
              color: '#334155',
              bg: '#f8fafc',
            },
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid #f1f5f9',
                borderRadius: 24,
                padding: 32,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: feature.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 28,
                }}
              >
                <feature.icon size={26} color={feature.color} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          borderTop: '1px solid #f1f5f9',
          padding: '32px max(16px, calc((100vw - 1152px)/2))',
          background: '#fff',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <Logo className="w-5 h-5" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Invoice</span>
            </div>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>
              © 2026 Invoice. All rights reserved.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 13,
              color: '#94a3b8',
            }}
          >
            <span className="font-medium">
              Designed & Developed by
              <a
                href="https://roushan.framer.website"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors ml-1.5"
                style={{
                  textDecoration: 'none',
                }}
              >
                Roushan Kumar
              </a>
            </span>
            <span style={{ color: '#e2e8f0' }}>|</span>
            <a
              href="https://www.linkedin.com/in/roushankuma/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-1 rounded-md transition-all hover:bg-slate-50 active:scale-95 group"
            >
              <img 
                src="https://img.icons8.com/fluency/48/linkedin.png" 
                alt="LinkedIn" 
                className="w-[20px] h-[20px] transition-transform group-hover:scale-110"
              />
            </a>
            <a
              href="https://www.behance.net/roushankuma"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-1 rounded-md transition-all hover:bg-slate-50 active:scale-95 group"
            >
              <img 
                src="https://img.icons8.com/fluency/48/behance.png" 
                alt="Behance" 
                className="w-[20px] h-[20px] transition-transform group-hover:scale-110"
              />
            </a>
            <a
              href="https://dribbble.com/roushankr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-1 rounded-md transition-all hover:bg-slate-50 active:scale-95 group"
            >
              <img 
                src="https://img.icons8.com/fluency/48/dribbble.png" 
                alt="Dribbble" 
                className="w-[20px] h-[20px] transition-transform group-hover:scale-110"
              />
            </a>
          </div>
        </div>
      </footer>

      <style>{`
                html {
                    scroll-behavior: smooth;
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                body {
                    margin: 0;
                    overflow-x: hidden;
                }
                * {
                    box-sizing: border-box;
                }
            `}</style>
    </div>
  );
}
