/**
 * Utility functions for color manipulation and accessibility (WCAG AAA)
 */

/**
 * Get relative luminance of a color
 * @param hex Hex color string (e.g., #ffffff)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Get contrast ratio between two colors
 * @param color1 Hex color string
 * @param color2 Hex color string
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Get AAA-compliant foreground color (black or white) for a given background
 * @param backgroundHex Background color hex
 */
export function getAAAForeground(backgroundHex: string): string {
  const whiteContrast = getContrastRatio('#ffffff', backgroundHex);
  const blackContrast = getContrastRatio('#000000', backgroundHex);

  // Preferred AAA is 7:1, if neither meets it, pick the best one
  return whiteContrast > blackContrast ? '#ffffff' : '#000000';
}

/**
 * Alias for getAAAForeground used in some components
 */
export const getContrastColor = getAAAForeground;

/**
 * Returns a text color class based on the contrast of the provided background color.
 */
export const getTextColorClass = (bgColor: string) => {
  const contrast = getContrastColor(bgColor);
  return contrast === '#FFFFFF' ? 'text-white' : 'text-slate-900';
};

/**
 * Returns a description color class based on the contrast of the provided background color.
 */
export const getDescriptionColorClass = (bgColor: string) => {
  const contrast = getContrastColor(bgColor);
  return contrast === '#FFFFFF' ? 'text-slate-100' : 'text-slate-500';
};

/**
 * Generate a secondary color based on a primary color
 * Usually a lighter or darker version that maintains harmony
 */
export function generateSecondaryColor(primaryHex: string): string {
  const luminance = getLuminance(primaryHex);
  
  // If primary is dark, go lighter. If light, go darker.
  if (luminance < 0.2) {
    return adjustBrightness(primaryHex, 70); // Light highlight
  } else if (luminance > 0.7) {
    return adjustBrightness(primaryHex, -40); // Darker contrast
  } else {
    // Middle ground: usually a soft light version for backgrounds
    return adjustBrightness(primaryHex, 85);
  }
}

/**
 * Adjust brightness of a hex color
 */
export function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let R = (num >> 16) + amt;
  let G = (num >> 8 & 0x00FF) + amt;
  let B = (num & 0x0000FF) + amt;

  R = Math.min(255, Math.max(0, R));
  G = Math.min(255, Math.max(0, G));
  B = Math.min(255, Math.max(0, B));

  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
