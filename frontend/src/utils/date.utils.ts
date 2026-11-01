import { format } from 'date-fns';

/**
 * Normalizes any date string (DD-MM-YYYY, DD/MM/YYYY, ISO, etc.) into YYYY-MM-DD format
 * suitable for HTML5 <input type="date"> and database storage.
 */
export function toIsoDate(val?: string | Date | null): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return format(val, 'yyyy-MM-dd');
  }

  const s = String(val).trim().split('T')[0];
  const parts = s.split(/[-/]/);

  if (parts.length === 3) {
    // YYYY-MM-DD or YYYY/MM/DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // DD-MM-YYYY or DD/MM/YYYY
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  // Fallback to Date parser if standard format
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return format(d, 'yyyy-MM-dd');
    }
  } catch {
    // ignore
  }

  return s;
}

/**
 * Safely formats any date value without throwing RangeError: Invalid time value.
 */
export function safeFormatDate(
  val?: string | Date | null,
  fmt: string = 'dd MMMM yyyy',
  fallback: string = '—'
): string {
  if (!val) return fallback;

  try {
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? fallback : format(val, fmt);
    }

    const iso = toIsoDate(val);
    if (iso) {
      // Split YYYY-MM-DD to construct local Date without timezone offset distortion
      const parts = iso.split('-');
      if (parts.length === 3) {
        const year = Number(parts[0]);
        const month = Number(parts[1]) - 1;
        const day = Number(parts[2]);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return format(d, fmt);
        }
      }
    }

    const directDate = new Date(val);
    if (!isNaN(directDate.getTime())) {
      return format(directDate, fmt);
    }

    return String(val).split('T')[0] || fallback;
  } catch {
    return typeof val === 'string' ? val.split('T')[0] || fallback : fallback;
  }
}

/**
 * Formats standard PDF invoice file name:
 * [Customer Shop Name]- invoice  [DD-MM-YYYY].pdf
 */
export function formatInvoicePdfName(customerName?: string, dateVal?: string | Date | null): string {
  const custName = (customerName || 'Customer').trim();
  const dateStr = safeFormatDate(dateVal, 'dd-MM-yyyy', 'date');
  return `${custName}- invoice  ${dateStr}.pdf`;
}

