/**
 * Currency Conversion Service
 * Handles automatic currency conversion for payments
 */

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  conversionDate: Date;
}

class CurrencyConversionService {
  private static instance: CurrencyConversionService;
  private readonly HNL_TO_USD_RATE = 24.5; // Fixed fallback rate (1 USD = 24.5 HNL)

  static getInstance(): CurrencyConversionService {
    if (!CurrencyConversionService.instance) {
      CurrencyConversionService.instance = new CurrencyConversionService();
    }
    return CurrencyConversionService.instance;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    // No conversion needed if currencies are the same
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        targetCurrency: toCurrency,
        exchangeRate: 1,
        conversionDate: new Date()
      };
    }

    try {
      // Get exchange rate
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount * rate;

      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount,
        targetCurrency: toCurrency,
        exchangeRate: rate,
        conversionDate: new Date()
      };
    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  private async getExchangeRate(from: string, to: string): Promise<number> {
    try {
      // Using exchangerate-api.com (free tier)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rates || !data.rates[to]) {
        throw new Error(`Rate not found`);
      }

      return data.rates[to];
    } catch (error) {
      console.warn('API failed, using fallback rate');
      
      // Use fallback rate for HNL/USD conversions
      if ((from === 'HNL' && to === 'USD') || (from === 'USD' && to === 'HNL')) {
        return from === 'HNL' ? 1 / this.HNL_TO_USD_RATE : this.HNL_TO_USD_RATE;
      }
      
      throw new Error(`No exchange rate for ${from} to ${to}`);
    }
  }

  /**
   * Get current exchange rate info
   */
  async getExchangeRateInfo(from: string, to: string): Promise<{
    rate: number;
    lastUpdated: Date;
    source: 'api' | 'fallback';
  }> {
    try {
      const rate = await this.getExchangeRate(from, to);
      return {
        rate,
        lastUpdated: new Date(),
        source: 'api'
      };
    } catch (error) {
      if ((from === 'HNL' && to === 'USD') || (from === 'USD' && to === 'HNL')) {
        const rate = from === 'HNL' ? 1 / this.HNL_TO_USD_RATE : this.HNL_TO_USD_RATE;
        return {
          rate,
          lastUpdated: new Date(),
          source: 'fallback'
        };
      }
      throw error;
    }
  }
}

export const currencyConversionService = CurrencyConversionService.getInstance();
