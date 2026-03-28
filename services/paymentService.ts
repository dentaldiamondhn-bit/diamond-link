import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';
import { currencyConversionService, ConversionResult } from './currencyConversionService';

export interface Payment {
  id: string;
  tratamiento_completado_id: string;
  monto_pago: number;
  moneda: Currency;
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
      let paymentData = {
        ...payment,
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

          // Store the converted amount as the main payment amount
          paymentData = {
            ...paymentData,
            monto_pago: conversion.convertedAmount,
            moneda: treatmentCurrency,
            notas_pago: `${payment.notas_pago || ''} (Original: ${payment.monto_pago} ${payment.moneda} ≈ ${conversion.convertedAmount} ${treatmentCurrency} at ${conversion.exchangeRate})`
          };

          console.log('Currency conversion applied:', conversion);
        } catch (conversionError) {
          console.warn('Currency conversion failed, storing original amount:', conversionError);
          // Continue with original amount if API fails
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
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting payment:', error);
        throw error;
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
        .select('total_final, moneda, monto_pagado, estado_pago')
        .eq('id', tratamientoCompletadoId)
        .single();

      const payments = await this.getPaymentsByTreatmentId(tratamientoCompletadoId);
      
      // Use the database-calculated amounts since trigger handles conversion
      const totalPaid = treatment.monto_pagado || 0;
      const saldoPendiente = Math.max(0, (treatment.total_final || 0) - totalPaid);
      
      let estadoPago: 'pendiente' | 'parcialmente_pagado' | 'pagado' = 'pendiente';
      if (totalPaid >= (treatment.total_final || 0)) estadoPago = 'pagado';
      else if (totalPaid > 0) estadoPago = 'parcialmente_pagado';

      return {
        monto_pagado: totalPaid,
        saldo_pendiente: saldoPendiente,
        estado_pago: estadoPago,
        pagos: payments,
        moneda_principal: treatment.moneda,
        total_tratamiento: treatment.total_final
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
      'deposito_bancario': 'Depósito Bancario',
      'paypal': 'PayPal',
      'otro': 'Otro'
    };
    return methodMap[method] || method;
  }

  // Get payment status badge styling
  static getPaymentStatusBadge(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pendiente': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'parcialmente_pagado': 'bg-blue-100 text-blue-800 border-blue-200',
      'pagado': 'bg-green-100 text-green-800 border-green-200'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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
