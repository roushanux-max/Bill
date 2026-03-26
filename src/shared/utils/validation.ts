/**
 * Central utility for platform-wide input validation and formatting rules.
 */

export const ValidationRules = {
  // Mobile: Exactly 10 digits
  mobile: {
    pattern: /^\d{10}$/,
    message: 'Enter a valid 10-digit mobile number',
    format: (val: string) => val.replace(/[^\d]/g, '').slice(0, 10),
    maxLength: 10,
  },

  // PIN Code: Exactly 6 digits
  pin: {
    pattern: /^\d{6}$/,
    message: 'Enter a valid 6-digit PIN code',
    format: (val: string) => val.replace(/[^\d]/g, '').slice(0, 6),
    maxLength: 6,
  },

  // Email: Standard email format
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: 'Enter a valid email address',
    format: (val: string) => val.trim().toLowerCase(),
  },

  // Amount/Price: Numeric, up to 2 decimal places
  amount: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: 'Enter a valid amount',
    format: (val: string) => {
      // Allow only numbers and a single decimal point
      let cleaned = val.replace(/[^\d.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      return cleaned;
    },
  },

  // Quantity: Positive integer only
  quantity: {
    pattern: /^[1-9]\d*$/,
    message: 'Enter a valid quantity',
    format: (val: string) => val.replace(/[^\d]/g, ''),
  },

  // GST Number: 15 alphanumeric characters, uppercase
  gst: {
    pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i,
    message: 'Enter a valid GST number',
    format: (val: string) =>
      val
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 15),
    maxLength: 15,
  },

  // Name: Letters and spaces only
  name: {
    pattern: /^[a-zA-Z\s]+$/,
    message: 'Enter a valid name',
    format: (val: string) => val.replace(/[^a-zA-Z\s]/g, ''),
  },

  // Password: Minimum 6 characters
  password: {
    pattern: /^.{6,}$/,
    message: 'Password must be at least 6 characters',
  },
};

/**
 * Validates a value against a specific rule.
 * @param type The type of validation rule to apply
 * @param value The value to validate
 * @returns An error message string if invalid, or null if valid/empty
 */
export const validateInput = (
  type: keyof typeof ValidationRules,
  value: string | undefined | null
): string | null => {
  if (!value || value.trim() === '') return null; // Let required fields handle emptiness

  const rule = ValidationRules[type];
  if (!rule.pattern.test(value)) {
    return rule.message;
  }
  return null;
};
