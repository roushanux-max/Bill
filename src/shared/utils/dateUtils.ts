export const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Fallback if already formatted or invalid
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
  } catch (e) {
    return dateStr;
  }
};

export const parseDateFromDisplay = (displayDate: string): string => {
  if (!displayDate) return new Date().toISOString().split('T')[0];

  // Check if it's already ISO
  if (displayDate.includes('-')) return displayDate;

  // Check for DD.MM.YY format
  const parts = displayDate.split('.');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }

  return displayDate;
};
