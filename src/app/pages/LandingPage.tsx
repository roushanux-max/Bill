import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, FileText, Users, Package, ChevronDown } from 'lucide-react';
import Logo from '../components/Logo';
import Header from '../components/Header';
import { useBranding } from '../contexts/BrandingContext';

// --- Utility: Intersection Observer Hook for scroll animations ---
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setInView(true); },
            { threshold }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [threshold]);
    return { ref, inView };
}

// --- Sub-components ---
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

const features = [
    {
        icon: Zap,
        title: 'Lightning Fast',
        description: 'Create and send a professional invoice in under 60 seconds. Designed for speed.',
        color: '#f59e0b',
        bg: '#fffbeb',
    },
    {
        icon: Shield,
        title: 'Secure by Design',
        description: 'Your data is isolated and encrypted. Built on enterprise-grade cloud infrastructure.',
        color: '#10b981',
        bg: '#f0fdf4',
    },
    {
        icon: FileText,
        title: 'GST Compliant',
        description: 'Full CGST, SGST, and IGST support. Every invoice is ready for Indian tax compliance.',
        color: '#6366f1',
        bg: '#eef2ff',
    },
];

const stats = [
    { value: '60s', label: 'To create an invoice' },
    { value: '100%', label: 'GST compliant' },
    { value: 'Free', label: 'Forever for small businesses' },
];

export default function LandingPage() {
    const { settings } = useBranding();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });

        // Silent SEO Optimization
        document.title = "BillMint | Professional GST Billing Software for Indian Businesses";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Generate GST-compliant invoices in seconds. BillMint is a fast, free, and secure business management tool designed specifically for Indian small enterprises and freelancers.");
        }

        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute("content", "Free GST Billing Software India, Invoice Generator for Small Business India, GST Compliant Bill Maker, Professional Invoicing Tool, Business Management App India, Offline First PWA Billing");

        return () => {
            window.removeEventListener('scroll', onScroll);
        };
    }, []);

    return (
        <div style={{ fontFamily: `var(--font-family, ${settings.fontFamily}), 'Google Sans', 'Inter', system-ui, sans-serif`, background: '#fff', color: '#1a1a2e', minHeight: '100vh', position: 'relative' }}>


            {/* ─── Navbar ─── */}
            <Header />

            {/* ─── Hero ─── */}
            <header style={{
                paddingTop: 140, paddingBottom: 100, textAlign: 'center', padding: '140px max(24px, calc((100vw - 800px)/2)) 100px', position: 'relative', overflow: 'hidden', zIndex: 2
            }}>
                {/* Gradient orbs */}
                <div style={{
                    position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
                    width: 700, height: 500,
                    background: 'radial-gradient(ellipse at center, var(--color-primary-light, #FFEDED) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />

                <div style={{ opacity: 1, animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Pill badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--color-primary-light, #FFEDED)',
                        opacity: 0.9,
                        border: '1px solid var(--color-primary, #FF0000)',
                        borderRadius: 100, padding: '6px 16px', marginBottom: 32,
                        fontSize: 13, fontWeight: 500, color: 'var(--color-primary, #FF0000)',
                    }}>
                        <Zap size={14} fill="currentColor" className="animate-pulse" />
                        <span>Proprietary PWA technology • 100% Free</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(42px, 7vw, 76px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2.5px', color: '#0f172a', margin: '0 0 24px' }}>
                        Invoicing made<br />
                        <span style={{
                            background: 'linear-gradient(135deg, var(--color-primary, #FF0000) 0%, var(--color-primary-hover, #CC0000) 50%, var(--color-primary-light, #FFEDED) 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            effortless.
                        </span>
                    </h1>

                    <p style={{ fontSize: 'clamp(17px, 2vw, 21px)', color: '#475569', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.6, fontWeight: 400 }}>
                        Generate GST-compliant bills in seconds. Built for speed, precision, and simplicity. No hidden costs. No clutter.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 80 }}>
                        <Link to="/register" style={{
                            fontSize: 18, fontWeight: 700, color: 'white', textDecoration: 'none',
                            background: 'linear-gradient(135deg, var(--color-primary, #FF0000), var(--color-primary-hover, #CC0000))',
                            padding: '16px 36px', borderRadius: 16,
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 15px 30px -10px var(--color-primary-light, #FFEDED)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px var(--color-primary-light, #FFEDED)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 15px 30px -10px var(--color-primary-light, #FFEDED)'; }}
                        >
                            Start Billing Now <ArrowRight size={20} />
                        </Link>
                        <a href="#features" style={{
                            fontSize: 18, fontWeight: 700, color: '#0f172a', textDecoration: 'none',
                            background: '#fff', border: '1.5px solid #e2e8f0',
                            padding: '16px 36px', borderRadius: 16,
                            transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                        >
                            Explore Features
                        </a>
                    </div>

                    {/* Scroll hint */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#9ca3af', animation: 'bounce 2s infinite' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Scroll</span>
                        <ChevronDown size={16} />
                    </div>
                </div>
            </header>

            {/* ─── Stats ─── */}
            <section style={{ padding: '0 max(24px, calc((100vw - 1100px)/2)) 80px', position: 'relative', zIndex: 2 }}>
                <AnimatedSection>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 1, background: '#f1f5f9', borderRadius: 24, overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                    }}>
                        {stats.map((s, i) => (
                            <div key={i} style={{
                                background: '#fff', padding: '40px 32px', textAlign: 'center',
                                transition: 'background 0.2s',
                            }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#6366f1', letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
                                <div style={{ fontSize: 14, color: '#64748b', marginTop: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </AnimatedSection>
            </section>

            <section id="features" style={{ padding: '160px max(24px, calc((100vw - 1100px)/2))', position: 'relative', zIndex: 2 }}>
                <div style={{ textAlign: 'center', marginBottom: 80 }}>
                    <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-1.5px', marginBottom: 20 }}>
                        Engineered for modern business.
                    </h2>
                    <p style={{ fontSize: 18, color: '#475569', maxWidth: 600, margin: '0 auto' }}>
                        BillMint provides a powerful suite of tools to manage your invoicing, customers, and inventory with zero friction.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
                    {[
                        {
                            icon: FileText,
                            title: 'GST-Compliant Billing',
                            desc: 'Automatically calculate CGST, SGST, and IGST. Generate HSN-ready tax invoices that meet all Indian regulatory standards.',
                            color: '#6366f1', bg: '#f5f3ff'
                        },
                        {
                            icon: Users,
                            title: 'Customer Management',
                            desc: 'Save unlimited customer details, track their purchase history, and manage their GSTINs for recurring professional billing.',
                            color: '#10b981', bg: '#f0fdf4'
                        },
                        {
                            icon: Package,
                            title: 'Product Catalog',
                            desc: 'Quickly add products with predefined HSN codes and GST rates. Auto-populate invoice items for ultra-fast bill creation.',
                            color: '#f59e0b', bg: '#fffbeb'
                        },
                        {
                            icon: Shield,
                            title: 'Privacy First',
                            desc: 'Your business data stays in your browser. We prioritize your privacy with local storage and secure cloud-based data isolation.',
                            color: '#ef4444', bg: '#fef2f2'
                        },
                        {
                            icon: Zap,
                            title: 'Offline Optimized (PWA)',
                            desc: 'Install BillMint on your phone or desktop. Works perfectly offline, so you can continue billing even without an internet connection.',
                            color: '#8b5cf6', bg: '#f5f3ff'
                        },
                        {
                            icon: ArrowRight,
                            title: 'Premium Branding',
                            desc: 'Customize invoices with your company logo, signature, and theme colors. Make your brand stand out on every document.',
                            color: '#334155', bg: '#f8fafc'
                        }
                    ].map((feature, i) => (
                        <div key={i} style={{
                            background: '#fff', border: '1px solid #f1f5f9', borderRadius: 24, padding: 40,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)'
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: 16,
                                background: feature.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28,
                            }}>
                                <feature.icon size={26} color={feature.color} />
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>{feature.title}</h3>
                            <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>


            {/* ─── Footer ─── */}
            <footer style={{
                borderTop: '1px solid #f1f5f9',
                padding: '48px max(24px, calc((100vw - 1100px)/2))',
                background: '#fff', position: 'relative', zIndex: 2
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Logo className="w-6 h-6" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 18, color: '#111' }}>BillMint</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, maxWidth: 500, marginBottom: 40 }}>
                        The simplest, fastest way to bill your customers. GST-compliant and proudly made for Indian small businesses.
                    </p>

                    <div style={{ borderTop: '1px solid #f1f5f9', width: '100%', paddingTop: 32 }}>
                        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8 }}>
                            © 2026 BillMint. All rights reserved. • Powered by LocalStorage Technology • Design and Developed by <a href="https://roushan.framer.website" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>roushan.framer.website</a>
                        </p>
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
        </div >
    );
}
