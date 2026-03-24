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
  fontFamily: 'aptos' | 'inter' | 'roboto' | 'lato' | 'opensans';
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

  // Domain Metadata (Invoice UI Template)
  domain?: 'general' | 'furniture' | 'clothing' | 'hotel';

  // New Design Fields
  tagline?: string;
  website?: string;
  paymentDetails?: string;
}

export const defaultBrandingSettings: BrandingSettings = {
  logo: null,
  logoSize: 'medium',
  primaryColor: '#0f172a',
  headerStyle: 'modern',
  showBorder: true,
  fontFamily: 'aptos',
  fontSize: 'medium',
  showFooter: true,
  footerText: 'Thank you for your business!',
  invoiceNotes: 'All Subject to Arrah Jurisdiction only.\nGoods once sold will not be taken back.\nAll works transit will be entertained.',
  termsAndConditions: '',
  showSignature: true,
  signatureImage: null,
  signatureText: 'Authorized Signatory',
  domain: 'general',
  tagline: '',
  website: '',
  paymentDetails: '',
};