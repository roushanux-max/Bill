export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return /^[6-9]\d{9}$/.test(phone);
};

export const sanitizePhone = (value: string): string => {
  // Allow only digits and limit to 10
  return value.replace(/\D/g, '').slice(0, 10);
};
