/**
 * Currency formatting utilities for Honduran Lempira (L.) and US Dollar ($)
 */

export type Currency = 'HNL' | 'USD';

export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: Record<Currency, CurrencyInfo> = {
  HNL: {
    code: 'HNL',
    symbol: 'L.',
    locale: 'es-HN',
    name: 'Lempira Hondureño'
  },
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'Dólar Americano'
  }
};

/**
 * Format a number with specified currency
 * @param amount - The amount to format
 * @param currency - The currency to use (default: HNL)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | string, currency: Currency = 'HNL'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return `${CURRENCIES[currency].symbol} 0.00`;
  }

  const currencyInfo = CURRENCIES[currency];
  
  // Use Intl.NumberFormat for proper currency formatting
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currencyInfo.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with currency symbol (simplified version)
 * @param amount - The amount to format
 * @param currency - The currency to use (default: HNL)
 * @returns Formatted currency string with symbol
 */
export function formatCurrencySimple(amount: number | string, currency: Currency = 'HNL'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return `${CURRENCIES[currency].symbol} 0.00`;
  }

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${CURRENCIES[currency].symbol} ${formatted}`;
}

/**
 * Get currency symbol by code
 * @param currency - The currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: Currency = 'HNL'): string {
  return CURRENCIES[currency].symbol;
}

/**
 * Get currency name by code
 * @param currency - The currency code
 * @returns Currency name
 */
export function getCurrencyName(currency: Currency = 'HNL'): string {
  return CURRENCIES[currency].name;
}

/**
 * Get all available currencies
 * @returns Array of currency info objects
 */
export function getAvailableCurrencies(): CurrencyInfo[] {
  return Object.values(CURRENCIES);
}

/**
 * Format a number with comma separators (no currency symbol)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatNumber(amount: number | string, decimals: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return '0.00';
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a formatted currency string back to number
 * @param formatted - The formatted currency string (e.g., "L. 1,234.56" or "$1,234.56")
 * @returns Parsed number
 */
export function parseCurrency(formatted: string): number {
  // Remove currency symbol and commas, then parse
  const clean = formatted.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
