import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, FileText, Users, Package, ChevronDown, Plus, Trash2, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '@/shared/components/Logo';
import { useBranding } from '@/shared/contexts/BrandingContext';
import { generateInvoicePDF, getInvoiceFilename } from '@/features/invoices/utils/generateInvoicePDF';
import { defaultBrandingSettings } from '@/shared/types/branding';
import { supabase } from '@/shared/utils/supabase';

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
    const [user, setUser] = useState<any>(null);

    // Demo Invoice State
    const [demoItems, setDemoItems] = useState([
        { id: '1', productName: 'Professional Consulting', quantity: 1, unitPrice: 15000, taxRate: 18, totalAmount: 15000 },
        { id: '2', productName: 'Website Development', quantity: 1, unitPrice: 25000, taxRate: 18, totalAmount: 25000 }
    ]);
    const [clientName, setClientName] = useState('John Doe');

    useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: any }) => setUser(data.user));
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });

        // Silent SEO Optimization
        document.title = "Bill | Professional GST Billing Software for Indian Businesses";
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute("content", "Generate GST-compliant invoices in seconds. Bill is a fast, free, and secure business management tool designed specifically for Indian small enterprises and freelancers.");
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



            {/* ─── Hero ─── */}
            <header style={{
                paddingTop: 140, paddingBottom: 100, textAlign: 'center', padding: '140px max(24px, calc((100vw - 800px)/2)) 100px', position: 'relative', overflow: 'hidden', zIndex: 2
            }}>
                {/* Gradient orbs */}
                <div style={{
                    position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
                    width: 700, height: 500,
                    background: 'radial-gradient(ellipse at center, var(--color-primary-light, #f5f3ff) 0%, transparent 70%)',
                    pointerEvents: 'none',
                    zIndex: -1
                }} />

                <div style={{ opacity: 1, animation: 'fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Pill badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'var(--color-primary-light, #f5f3ff)',
                        opacity: 0.9,
                        border: '1px solid var(--color-primary, #6366f1)',
                        borderRadius: 100, padding: '6px 16px', marginBottom: 32,
                        fontSize: 13, fontWeight: 500, color: 'var(--color-primary, #6366f1)',
                    }}>
                        <Zap size={14} fill="currentColor" className="animate-pulse" />
                        <span>Proprietary PWA technology • 100% Free</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(36px, 8vw, 76px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2.5px', color: '#0f172a', margin: '0 0 24px' }}>
                        Invoicing made<br />
                        <span style={{
                            background: 'linear-gradient(135deg, var(--color-primary, #6366f1) 0%, var(--color-primary-hover, #4f46e5) 50%, var(--color-primary-light, #f5f3ff) 100%)',
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
                            background: 'linear-gradient(135deg, var(--color-primary, #6366f1), var(--color-primary-hover, #4f46e5))',
                            padding: '16px 36px', borderRadius: 16,
                            display: 'flex', alignItems: 'center', gap: 8,
                            boxShadow: '0 15px 30px -10px var(--color-primary-light, #f5f3ff)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px var(--color-primary-light, #f5f3ff)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 15px 30px -10px var(--color-primary-light, #f5f3ff)'; }}
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

            <section id="features" style={{ padding: '200px max(24px, calc((100vw - 1100px)/2))', position: 'relative', zIndex: 2 }}>
                <div style={{ textAlign: 'center', marginBottom: 100 }}>
                    <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-1.5px', marginBottom: 24 }}>
                        Engineered for modern business.
                    </h2>
                    <p style={{ fontSize: 20, color: '#475569', maxWidth: 640, margin: '0 auto' }}>
                        Bill provides a powerful suite of tools to manage your invoicing, customers, and inventory with zero friction.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48 }}>
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
                            color: '#6366f1', bg: '#f5f3ff'
                        },
                        {
                            icon: Zap,
                            title: 'Offline Optimized (PWA)',
                            desc: 'Install Bill on your phone or desktop. Works perfectly offline, so you can continue billing even without an internet connection.',
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

            {/* ─── Interactive Demo / Experience ─── */}
            <section id="experience" style={{ padding: '120px max(24px, calc((100vw - 1100px)/2))', background: '#fcfdfe', position: 'relative' }}>
                <div style={{ textAlign: 'center', marginBottom: 80 }}>
                    <div style={{ 
                        display: 'inline-flex', padding: '8px 16px', background: '#eef2ff', borderRadius: 100, 
                        color: '#6366f1', fontSize: 13, fontWeight: 700, marginBottom: 24, letterSpacing: '0.05em'
                    }}>
                        LIVE INTERACTIVE DEMO
                    </div>
                    <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-2px', marginBottom: 20 }}>
                        Experience the Speed.
                    </h2>
                    <p style={{ fontSize: 20, color: '#64748b', maxWidth: 600, margin: '0 auto' }}>
                        Don't just take our word for it. Try creating an invoice right here. 
                        Edit anything and see the magic happen.
                    </p>
                </div>

                <div style={{ 
                    maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 'clamp(16px, 4vw, 32px)', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1), 0 10px 20px -5px rgba(0,0,0,0.05)',
                    border: '1px solid #f1f5f9', overflow: 'hidden', position: 'relative'
                }}>
                    {/* Header of Editor */}
                    <div style={{ padding: 'clamp(20px, 5vw, 32px) clamp(16px, 5vw, 40px)', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #fcfdfe, #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 6 }}>BILL TO</div>
                            <input 
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#1e293b', background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%' }}
                                placeholder="Client Name"
                            />
                        </div>
                        <div style={{ textAlign: 'left', flex: '0 0 auto' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>INVOICE DATE</div>
                            <div style={{ fontSize: 'clamp(14px, 3vw, 18px)', fontWeight: 700, color: '#6366f1' }}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div style={{ padding: '0 clamp(16px, 5vw, 40px)', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '24px 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>ITEM DESCRIPTION</th>
                                    <th style={{ textAlign: 'right', padding: '24px 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 80 }}>QTY</th>
                                    <th style={{ textAlign: 'right', padding: '24px 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 120 }}>PRICE</th>
                                    <th style={{ textAlign: 'right', padding: '24px 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {demoItems.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '20px 0' }}>
                                            <input 
                                                type="text"
                                                value={item.productName}
                                                onChange={(e) => {
                                                    const newItems = [...demoItems];
                                                    newItems[idx].productName = e.target.value;
                                                    setDemoItems(newItems);
                                                }}
                                                style={{ width: '100%', fontWeight: 600, color: '#334155', border: 'none', outline: 'none', background: 'transparent' }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '20px 0' }}>
                                            <input 
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...demoItems];
                                                    newItems[idx].quantity = Number(e.target.value);
                                                    newItems[idx].totalAmount = newItems[idx].quantity * newItems[idx].unitPrice;
                                                    setDemoItems(newItems);
                                                }}
                                                style={{ width: 60, textAlign: 'right', fontWeight: 600, color: '#334155', border: 'none', outline: 'none', background: 'transparent' }}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '20px 0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                                <span style={{ color: '#94a3b8' }}>₹</span>
                                                <input 
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => {
                                                        const newItems = [...demoItems];
                                                        newItems[idx].unitPrice = Number(e.target.value);
                                                        newItems[idx].totalAmount = newItems[idx].quantity * newItems[idx].unitPrice;
                                                        setDemoItems(newItems);
                                                    }}
                                                    style={{ width: 90, textAlign: 'right', fontWeight: 700, color: '#334155', border: 'none', outline: 'none', background: 'transparent' }}
                                                />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button 
                                                onClick={() => setDemoItems(demoItems.filter((_, i) => i !== idx))}
                                                style={{ color: '#cbd5e1', cursor: 'pointer', border: 'none', background: 'none' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e1'}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <button 
                            onClick={() => setDemoItems([...demoItems, { id: Math.random().toString(), productName: 'New Item', quantity: 1, unitPrice: 0, taxRate: 18, totalAmount: 0 }])}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, padding: '10px 16px', 
                                background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 12, 
                                color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                        >
                            <Plus size={16} /> Add Item
                        </button>
                    </div>

                    {/* Summary and Actions */}
                    <div style={{ 
                        padding: 'clamp(24px, 5vw, 40px)', background: '#fcfdfe', borderTop: '1px solid #f1f5f9', marginTop: 40, 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap-reverse', gap: 32 
                    }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    const subtotal = demoItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                                    const tax = subtotal * 0.18;
                                    const demoInvoice: any = {
                                        invoiceNumber: 'DEMO-01',
                                        date: new Date().toISOString().split('T')[0],
                                        customer: { name: clientName },
                                        items: demoItems,
                                        subtotal,
                                        taxTotal: tax,
                                        discountTotal: 0,
                                        grandTotal: subtotal + tax,
                                        transportCharges: 0,
                                        notes: 'Generated via Live Demo'
                                    };
                                    const doc = generateInvoicePDF(demoInvoice, { name: 'Sample Business', gstin: '27AAAAA0000A1Z5', address: 'Demo St, Mumbai', phone: '9876543210', email: 'hello@bill.com', state: 'Maharashtra' }, defaultBrandingSettings);
                                    doc.save(getInvoiceFilename(demoInvoice));
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', 
                                    background: '#1e293b', borderRadius: 12, color: '#fff', 
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none'
                                }}
                            >
                                <Download size={18} /> Download PDF
                            </button>
                            
                            <button 
                                onClick={() => {
                                    if (!user) {
                                        toast.info("Save & Personalize", {
                                            description: "To save invoices, customize branding with your logo, and manage real customers, you'll need a free account.",
                                            action: {
                                                label: "Login / Register",
                                                onClick: () => window.location.href = '/register'
                                            }
                                        });
                                    } else {
                                        toast.success("Ready to save!", {
                                            description: "Head over to the Dashboard to create and save permanent invoices."
                                        });
                                    }
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', 
                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, 
                                    color: '#334155', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                <Shield size={18} /> Save Invoice
                            </button>
                        </div>
                        
                        <div style={{ textAlign: 'right', flex: '1 1 auto' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 4 }}>ESTIMATED GRAND TOTAL</div>
                            <div style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 900, color: '#0f172a' }}>
                                ₹{Math.round(demoItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 1.18).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Inclusive of 18% GST</div>
                        </div>
                    </div>
                </div>
                
                {/* Floating Hint */}
                <div style={{ textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Zap size={14} color="#6366f1" fill="#6366f1" /> Safe to use — No data is saved to our servers until you login.
                    </span>
                </div>
            </section>


            {/* ─── Footer ─── */}
            <footer style={{
                borderTop: '1px solid #f1f5f9',
                padding: '32px max(24px, calc((100vw - 1100px)/2))',
                background: '#fff', position: 'relative', zIndex: 2
            }}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-10">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                                <Logo className="w-5 h-5" />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>Bill</span>
                        </div>
                        <span style={{ fontSize: 13, color: '#94a3b8' }}>© 2026 Bill. All rights reserved.</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#94a3b8' }}>
                        <span>
                            Designed & Developed by 
                            <a href="https://roushan.framer.website" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, marginLeft: 4 }}>roushan.framer.website</a>
                        </span>
                        <span style={{ color: '#e2e8f0' }}>|</span>
                        <a 
                            href="https://www.linkedin.com/in/roushankuma/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                                color: '#0077b5', 
                                textDecoration: 'none', 
                                display: 'flex', 
                                alignItems: 'center',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
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
        </div >
    );
}
