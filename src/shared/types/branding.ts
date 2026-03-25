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
  domain?: 'general' | 'furniture' | 'clothing' | 'hotel' | 'freelance' | 'medical';

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
  fontFamily: 'aptos',
  fontSize: 'medium',
  showFooter: true,
  footerText: 'Thank you for your business!',
  invoiceNotes: 'All Subject to Arrah Jurisdiction only.\nGoods once sold will not be taken back.\nAll works transit will be entertained.',
  termsAndConditions: `Terms & Conditions:
1. All invoices generated are for record-keeping purposes.
2. Users are responsible for ensuring the accuracy of entered data.
3. The platform is not liable for any financial or legal discrepancies.
4. Ensure invoices are downloaded and stored securely.
5. Usage of this platform implies acceptance of these terms.`,
  showSignature: true,
  signatureImage: null,
  signatureText: 'Authorized Signatory',
  domain: 'general',
  tagline: '',
  website: '',
  paymentDetails: '',
};