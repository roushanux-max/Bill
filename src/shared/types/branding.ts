export interface BrandingSettings {
  // Logo
  logo: string | null;
  logoSize: 'small' | 'medium' | 'large';

  // Colors
  primaryColor: string;

  // Invoice Layout
  headerStyle: 'classic' | 'modern' | 'minimal';
  showBorder: boolean;

  // Typography
  fontSize: 'small' | 'medium' | 'large';

  // Footer
  showFooter: boolean;
  footerText: string;
  invoiceNotes?: string;
  termsAndConditions?: string;

  // Signature
  showSignature: boolean;
  signatureImage: string | null;
  signatureText: string;
  signatureTitle?: string; // Custom designation below the signature line

  // Domain Metadata (Invoice UI Template)
  domain?: 'general' | 'furniture' | 'clothing' | 'hotel' | 'freelance' | 'medical' | 'grocery' | 'electronics' | 'food' | 'retail';

  // New Design Fields
  tagline?: string;
  website?: string;
  paymentDetails?: string;
}

export const defaultBrandingSettings: BrandingSettings = {
  logo: null,
  logoSize: 'medium',
  primaryColor: '#4f46e5',
  headerStyle: 'modern',
  showBorder: true,
  fontSize: 'medium',
  showFooter: true,
  footerText: 'Thank you for your business!',
  invoiceNotes: 'Thank you for your business.',
  termsAndConditions: `1. Goods once sold will not be taken back or exchanged.
2. Please check your goods/services at the time of delivery.
3. Payment is due within 7 days from the invoice date.
4. Interest at 18% per annum will be charged on overdue payments.
5. All disputes are subject to local jurisdiction.`,
  showSignature: true,
  signatureImage: null,
  signatureText: '',
  signatureTitle: 'Authorized Signatory',
  domain: 'general',
  tagline: '',
  website: '',
  paymentDetails: '',
};
