/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Format currency in Indian Rupees (₹ INR) using the Indian numbering system (en-IN).
 * e.g. 49900 paise -> ₹499
 *      249900 paise -> ₹2,499
 *      799900 paise -> ₹7,999
 */
export function formatINR(amount: number, isMinorUnits: boolean = true): string {
  const rupees = isMinorUnits ? Math.round(amount / 100) : Math.round(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Format currency with exact paise when necessary (e.g. in checkout fee breakdown).
 */
export function formatINRWithDecimals(amount: number, isMinorUnits: boolean = true): string {
  const rupees = isMinorUnits ? amount / 100 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format date in Indian style e.g. "Sat, 14 Mar 2026"
 */
export function formatIndianDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format time in IST e.g. "6:30 PM IST"
 */
export function formatIndianTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${time} IST`;
  } catch {
    return 'IST';
  }
}
