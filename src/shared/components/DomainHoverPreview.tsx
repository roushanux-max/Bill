import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import InvoiceTemplate from '@/features/invoices/components/InvoiceTemplate';
import { BrandingSettings, defaultBrandingSettings } from '@/shared/types/branding';
import { Invoice, StoreInfo } from '@/features/invoices/types/invoice';
import { AnimatePresence, motion } from 'framer-motion';

// Generate safe dummy data based on domain
const getDummyDataForDomain = (domainId: string) => {
  const baseInvoice: Partial<Invoice> = {
    id: 'preview',
    invoiceNumber: 'PRV-001',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: {
      id: 'c1',
      name: 'Preview Customer',
      address: '123 Street, City',
      phone: '9876543210',
      email: 'customer@example.com',
      gstin: '29ABCDE1234F2Z5',
      state: 'Karnataka',
      createdAt: new Date().toISOString(),
    },
    subtotal: 0,
    discountTotal: 0,
    transportCharges: 0,
    grandTotal: 0,
    templateId: 'standard',
  } as Invoice & { templateId?: string };

  const baseSettings: BrandingSettings = {
    ...defaultBrandingSettings,
    domain: domainId as any,
    primaryColor: '#6366f1',
  };

  const baseStore: StoreInfo = {
    name: 'Sample Business',
    ownerName: 'Owner',
    phone: '1234567890',
    email: 'business@example.com',
    address: 'Business Address St.',
    gstin: '29ABCDE1234F2Z5',
    state: 'Karnataka',
  };

  let items: any[] = [];

  switch (domainId) {
    case 'furniture':
      items = [
        {
          id: '1',
          productName: 'Oak Dining Table',
          quantity: 1,
          unitPrice: 25000,
          material: 'Oak Wood',
          taxRate: 18,
        },
        {
          id: '2',
          productName: 'Premium Sofa',
          quantity: 1,
          unitPrice: 35000,
          material: 'Teak/Fabric',
          taxRate: 18,
        },
      ];
      break;
    case 'clothing':
      items = [
        {
          id: '1',
          productName: 'Cotton T-Shirt',
          quantity: 3,
          unitPrice: 800,
          size: 'L',
          color: 'Blue',
          taxRate: 5,
        },
        {
          id: '2',
          productName: 'Denim Jeans',
          quantity: 2,
          unitPrice: 2500,
          size: '32',
          color: 'Black',
          taxRate: 12,
        },
      ];
      break;
    case 'freelance':
      items = [
        { id: '1', productName: 'Web Development', quantity: 40, unitPrice: 1500, taxRate: 18 },
        { id: '2', productName: 'UI/UX Design', quantity: 20, unitPrice: 2000, taxRate: 18 },
      ];
      break;
    case 'medical':
      items = [
        { id: '1', productName: 'Consultation Fee', quantity: 1, unitPrice: 500, taxRate: 0 },
        { id: '2', productName: 'Blood Test', quantity: 1, unitPrice: 1200, taxRate: 0 },
      ];
      break;
    case 'hotel':
      items = [
        { id: '1', productName: 'Deluxe Room Stay', quantity: 2, unitPrice: 4500, taxRate: 12 },
        { id: '2', productName: 'Room Service', quantity: 1, unitPrice: 850, taxRate: 5 },
      ];
      break;
    case 'grocery':
      items = [
        {
          id: '1',
          productName: 'Organic Rice',
          quantity: 5,
          unitPrice: 120,
          taxRate: 5,
          unit: 'kg',
          hsn: '1006',
        },
        {
          id: '2',
          productName: 'Pulses',
          quantity: 2,
          unitPrice: 150,
          taxRate: 5,
          unit: 'kg',
          hsn: '0713',
        },
        {
          id: '3',
          productName: 'Cooking Oil',
          quantity: 3,
          unitPrice: 180,
          taxRate: 5,
          unit: 'ltr',
          hsn: '1512',
        },
      ];
      break;
    case 'electronics':
      items = [
        {
          id: '1',
          productName: 'Smartphone XS',
          quantity: 1,
          unitPrice: 45000,
          taxRate: 18,
          hsn: '8517',
          serialNo: 'SN-X-9982',
          warranty: '1 Year',
        },
        {
          id: '2',
          productName: 'Wireless Earbuds',
          quantity: 2,
          unitPrice: 3500,
          taxRate: 18,
          hsn: '8518',
          serialNo: 'E-882-B',
          warranty: '6 Months',
        },
      ];
      break;
    case 'food':
      items = [
        {
          id: '1',
          productName: 'Margherita Pizza',
          quantity: 2,
          unitPrice: 350,
          taxRate: 5,
          foodType: 'Veg',
        },
        {
          id: '2',
          productName: 'Pasta Alfredo',
          quantity: 1,
          unitPrice: 280,
          taxRate: 5,
          foodType: 'Non-Veg',
        },
      ];
      break;
    case 'retail':
      items = [
        {
          id: '1',
          productName: 'Running Shoes',
          quantity: 1,
          unitPrice: 3500,
          taxRate: 12,
          hsn: '6404',
          barcode: 'SKU-SH-01',
        },
        {
          id: '2',
          productName: 'Sports Socks',
          quantity: 3,
          unitPrice: 200,
          taxRate: 12,
          hsn: '6115',
          barcode: 'SKU-SO-05',
        },
      ];
      break;
    case 'water':
      items = [
        {
          id: '1',
          productName: '20L Water Jar',
          quantity: 10,
          unitPrice: 40,
          taxRate: 0,
          hsn: '2201',
          jarsDue: '2',
          deposit: '100',
        },
        {
          id: '2',
          productName: 'Dispenser Rental',
          quantity: 1,
          unitPrice: 500,
          taxRate: 0,
          hsn: '8418',
        },
      ];
      break;
    case 'barber':
      items = [
        {
          id: '1',
          productName: 'Haircut & Styling',
          quantity: 1,
          unitPrice: 300,
          taxRate: 0,
          stylist: 'John',
          appointmentTime: '10:30 AM',
        },
        {
          id: '2',
          productName: 'Beard Trim',
          quantity: 1,
          unitPrice: 150,
          taxRate: 0,
          stylist: 'Mike',
          appointmentTime: '11:15 AM',
        },
      ];
      break;
    default:
      items = [
        { id: '1', productName: 'Standard Service 1', quantity: 1, unitPrice: 1000, taxRate: 18 },
        { id: '2', productName: 'Product 2', quantity: 2, unitPrice: 500, taxRate: 18 },
      ];
  }

  // Calculate totals
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const totalTax = items.reduce(
    (acc, item) => acc + (item.quantity * item.unitPrice * item.taxRate) / 100,
    0
  );
  baseInvoice.items = items;
  baseInvoice.subtotal = subtotal;
  baseInvoice.grandTotal = subtotal + totalTax;

  return { invoice: baseInvoice as Invoice, settings: baseSettings, storeInfo: baseStore };
};

interface DomainHoverPreviewProps {
  domainId: string;
  children: React.ReactNode;
}

export default function DomainHoverPreview({ domainId, children }: DomainHoverPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 400); // 400ms delay to prevent accidental/flickering popups
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Keep track of mouse position so portal can follow or position
    // We only update if hovered down so we lock position, or we can update live
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const dummyData = React.useMemo(() => getDummyDataForDomain(domainId), [domainId]);

  // Adjust placement to keep it within viewport
  const popupWidth = 320; // Approximately scaled width
  const popupHeight = 420;

  let left = mousePos.x + 20;
  let top = mousePos.y + 20;

  if (typeof window !== 'undefined') {
    if (left + popupWidth > window.innerWidth) left = window.innerWidth - popupWidth - 20;
    if (top + popupHeight > window.innerHeight) top = window.innerHeight - popupHeight - 20;
    if (left < 0) left = 20;
    if (top < 0) top = 20;
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className="h-full w-full block"
      >
        {children}
      </div>

      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  left,
                  top,
                  zIndex: 99999,
                  pointerEvents: 'none',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(0,0,0,0.05)',
                  borderRadius: '12px',
                  background: '#fff',
                  // Fixed visible dimensions (0.35 * A4 pixel equivalent ~793.7 x 1122.5) => 278px x 393px
                  width: '278px',
                  height: '393px',
                  overflow: 'hidden',
                  transformOrigin: 'top left',
                }}
              >
                <div
                  style={{
                    // A4 standard at 96PPI is roughly 794x1123
                    width: '794px',
                    height: '1123px',
                    transform: 'scale(0.35)',
                    transformOrigin: 'top left',
                    backgroundColor: '#fff',
                  }}
                >
                  <InvoiceTemplate
                    invoice={dummyData.invoice}
                    settings={dummyData.settings}
                    storeInfo={dummyData.storeInfo}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
