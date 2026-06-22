import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';
import { currencyConversionService } from './currencyConversionService';

export interface Payment {
  id: string;
  tratamiento_completado_id: string;
  monto_pago: number;
  moneda: Currency;
  monto_original?: number;
  moneda_original?: Currency;
  monto_convertido?: number;
  moneda_conversion?: Currency;
  tasa_conversion?: number;
  fecha_pago: string;
  metodo_pago: string;
  notas_pago?: string;
  creado_por?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface PaymentSummary {
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: 'pendiente' | 'parcialmente_pagado' | 'pagado';
  pagos: Payment[];
  moneda_principal?: Currency;
  total_tratamiento?: number;
}

export class PaymentService {
  // Get all payments for a completed treatment
  static async getPaymentsByTreatmentId(tratamientoCompletadoId: string): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tratamiento_completado_id', tratamientoCompletadoId)
        .order('fecha_pago', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching payments:', error);
      throw error;
    }
  }

  // Add a new payment with automatic currency conversion
  static async addPayment(
    payment: Omit<Payment, 'id' | 'creado_en' | 'actualizado_en'>,
    treatmentCurrency?: Currency
  ): Promise<Payment> {
    try {
      const paymentData: any = {
        ...payment,
        monto_original: payment.monto_pago,
        moneda_original: payment.moneda,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      // If currencies differ, convert the amount
      if (treatmentCurrency && payment.moneda !== treatmentCurrency) {
        try {
          const conversion = await currencyConversionService.convertAmount(
            payment.monto_pago,
            payment.moneda,
            treatmentCurrency
          );

          paymentData.monto_convertido = conversion.convertedAmount;
          paymentData.moneda_conversion = treatmentCurrency;
          paymentData.tasa_conversion = conversion.exchangeRate;

          // Update main amount/currency to match treatment currency for consistency
          paymentData.monto_pago = conversion.convertedAmount;
          paymentData.moneda = treatmentCurrency;
          paymentData.notas_pago = `${payment.notas_pago || ''} (Original: ${payment.monto_pago} ${payment.moneda})`;
        } catch (conversionError) {
          console.warn('Currency conversion failed, storing original amount:', conversionError);
        }
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single();

      if (error) {
        console.error('Error adding payment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error adding payment:', error);
      throw error;
    }
  }

  // Update a payment
  static async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({
          ...updates,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error updating payment:', error);
      throw error;
    }
  }

  // Delete a payment
  static async deletePayment(id: string): Promise<void> {
    try {
      console.log('Attempting to delete payment with ID:', id);

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting payment:', error);
        throw error;
      }

      console.log('✅ Payment deleted successfully');
    } catch (error) {
      console.error('Unexpected error deleting payment:', error);
      throw error;
    }
  }

  // Get payment summary for a treatment
  static async getPaymentSummary(tratamientoCompletadoId: string): Promise<PaymentSummary> {
    try {
      const { data: treatment, error: treatmentError } = await supabase
        .from('tratamientos_completados')
        .select('total_final, moneda, monto_pagado, saldo_pendiente, estado_pago')
        .eq('id', tratamientoCompletadoId)
        .single();

      if (treatmentError) {
        console.error('Error fetching treatment for summary:', treatmentError);
        throw treatmentError;
      }

      const payments = await this.getPaymentsByTreatmentId(tratamientoCompletadoId);
      
      return {
        monto_pagado: treatment.monto_pagado || 0,
        saldo_pendiente: treatment.saldo_pendiente || 0,
        estado_pago: treatment.estado_pago,
        pagos: payments || [],
        moneda_principal: treatment.moneda,
        total_tratamiento: treatment.total_final || 0
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      throw error;
    }
  }

  // Get payment methods
  static getPaymentMethods(): string[] {
    return [
      'efectivo',
      'tarjeta_credito',
      'tarjeta_debito',
      'transferencia',
      'cheque',
      'deposito_bancario',
      'paypal',
      'otro'
    ];
  }

  // Format payment method for display
  static formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria',
      'cheque': 'Cheque',
      'deposito_bancario': 'Depósito Bancario (BAC)',
      'paypal': 'PayPal',
      'otro': 'Otro'
    };
    return methodMap[method] || method;
  }

  // Get payment status badge styling
  static getPaymentStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200',
      'parcialmente_pagado': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200',
      'pagado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200';
  }

  // Get payment status text
  static getPaymentStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'parcialmente_pagado': 'Parcialmente Pagado',
      'pagado': 'Pagado'
    };
    return statusMap[status] || status;
  }
}
