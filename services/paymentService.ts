import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';
import { currencyConversionService, ConversionResult } from './currencyConversionService';

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
    payment: Omit<Payment, 'id' | 'creado_en' | 'actualizado_en' | 'monto_original' | 'moneda_original' | 'monto_convertido' | 'moneda_conversion' | 'tasa_conversion'>,
    treatmentCurrency?: Currency
  ): Promise<Payment> {
    try {
      const paymentData = {
        ...payment,
        monto_original: payment.monto_pago,
        moneda_original: payment.moneda,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      // If currencies differ, convert the amount before storing
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
        } catch (conversionError) {
          console.warn('Currency conversion failed:', conversionError);
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
      // First try to select the payment to make sure it exists
      const { error: selectError } = await supabase
        .from('payments')
        .select('id')
        .eq('id', id)
        .single();

      if (selectError) {
        console.error('Payment not found:', selectError);
        throw new Error('Payment not found');
      }

      // Now delete it
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      // Verify deletion by trying to select again
      const { error: checkError } = await supabase
        .from('payments')
        .select('id')
        .eq('id', id)
        .single();

      if (!checkError) {
        throw new Error('Payment deletion failed - payment still exists');
      }
    } catch (error) {
      console.error('Unexpected error deleting payment:', error);
      throw error;
    }
  }

  // Get payment summary for a treatment
  static async getPaymentSummary(tratamientoCompletadoId: string): Promise<PaymentSummary> {
    try {
      const { data: treatment } = await supabase
        .from('tratamientos_completados')
        .select('total_final, moneda, monto_pagado, estado_pago, saldo_pendiente')
        .eq('id', tratamientoCompletadoId)
        .single();

      const payments = await this.getPaymentsByTreatmentId(tratamientoCompletadoId);

      const totalPaid = treatment?.monto_pagado || 0;
      const saldoPendiente = treatment?.saldo_pendiente ?? Math.max(0, (treatment?.total_final || 0) - totalPaid);

      let estadoPago: 'pendiente' | 'parcialmente_pagado' | 'pagado' = 'pendiente';
      if (totalPaid >= (treatment?.total_final || 0)) estadoPago = 'pagado';
      else if (totalPaid > 0) estadoPago = 'parcialmente_pagado';

      return {
        monto_pagado: totalPaid,
        saldo_pendiente: saldoPendiente,
        estado_pago: estadoPago,
        pagos: payments,
        moneda_principal: treatment?.moneda,
        total_tratamiento: treatment?.total_final
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
      'paypal',
      'extra_bac_6meses',
      'extra_bac_3meses',
      'extra_bac_9meses',
      'otro'
    ];
  }

  static formatPaymentMethod(method: string): string {
    if (!method) return 'Otro';

    const normalizedMethod = method.toLowerCase();

    const methodMap: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria',
      'cheque': 'Cheque',
      'paypal': 'PayPal',
      'otro': 'Otro',
      'extra_bac_6meses': 'Extra BAC 6meses',
      'extra_bac_3meses': 'Extra BAC 3meses',
      'extra_bac_9meses': 'Extra BAC 9meses'
    };

    if (methodMap[normalizedMethod]) {
      return methodMap[normalizedMethod];
    }

    if (normalizedMethod.includes('extra') && normalizedMethod.includes('bac')) {
      if (normalizedMethod.includes('3meses')) {
        return 'Extra BAC 3meses';
      }
      if (normalizedMethod.includes('9meses')) {
        return 'Extra BAC 9meses';
      }
      return 'Extra BAC 6meses';
    }
    if (normalizedMethod.includes('deposito') || normalizedMethod.includes('depósito')) {
      return 'Extra BAC 6meses';
    }

    return method;
  }

  // Get payment status badge styling
  static getPaymentStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      'parcialmente_pagado': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      'pagado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700';
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
