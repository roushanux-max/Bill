/**
 * Calculate the brightness of a hex color
 * Returns a value between 0 (darkest) and 255 (brightest)
 */
export function getColorBrightness(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Using relative luminance formula
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Determine if light or dark text should be used based on background color
 * Returns 'light' for dark backgrounds, 'dark' for light backgrounds
 */
export function getContrastTextColor(hexColor: string): 'light' | 'dark' {
  const brightness = getColorBrightness(hexColor);
  return brightness > 128 ? 'dark' : 'light';
}

/**
 * Get the text color class based on background
 */
export function getTextColorClass(hexColor: string): string {
  const contrast = getContrastTextColor(hexColor);
  return contrast === 'light' ? 'text-white' : 'text-gray-900';
}

/**
 * Get the description text color class based on background
 */
export function getDescriptionColorClass(hexColor: string): string {
  const contrast = getContrastTextColor(hexColor);
  return contrast === 'light' ? 'text-white/80' : 'text-gray-600';
}

/**
 * Get contrast color (white or black) based on hex background
 */
export function getContrastColor(hexcolor: string): string {
  const hex = hexcolor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}
