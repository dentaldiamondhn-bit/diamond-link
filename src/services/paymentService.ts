import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';
import { currencyConversionService, ConversionResult } from './currencyConversionService';
import { PatientCreditService, PatientCreditSummary, PatientCredit } from './patientCreditService';
import {
  PaymentProcessingMode,
  processPaymentWithAdvance
} from './paymentAdvance';

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
  credito_disponible?: PatientCreditSummary;
}

export interface AdvancePaymentInfo {
  monto: number;
  moneda: Currency;
  credito: PatientCredit;
}

export interface AddPaymentResult {
  payment: Payment | null;
  advance: AdvancePaymentInfo | null;
  cashEntryCreated: boolean;
  mode: PaymentProcessingMode;
}

export class PaymentService {
  /**
   * Centralized: Calculate payment status from total and paid amounts
   */
  static calculatePaymentStatus(totalFinal: number, totalPaid: number): 'pendiente' | 'parcialmente_pagado' | 'pagado' {
    if (totalFinal <= 0) return 'pagado';
    if (totalPaid >= totalFinal) return 'pagado';
    if (totalPaid > 0) return 'parcialmente_pagado';
    return 'pendiente';
  }

  /**
   * Centralized: Calculate pending balance (never negative)
   */
  static calculatePendingBalance(totalFinal: number, totalPaid: number): number {
    return Math.max(0, totalFinal - totalPaid);
  }
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

  // Add a new payment with automatic currency conversion.
  // The full amount received is recorded as a cash entry on the receipt date;
  // any overpayment is captured automatically as a patient credit by the DB
  // trigger `handle_overpayment_credit` and surfaced in the result for the UI.
  static async addPayment(
    payment: Omit<Payment, 'id' | 'creado_en' | 'actualizado_en' | 'monto_original' | 'moneda_original' | 'monto_convertido' | 'moneda_conversion' | 'tasa_conversion'>,
    treatmentCurrency?: Currency
  ): Promise<AddPaymentResult> {
    try {
      const processed = await processPaymentWithAdvance<Payment, PatientCredit>(
        {
          getTreatment: async (tratamientoCompletadoId: string) => {
            const { data, error } = await supabase
              .from('tratamientos_completados')
              .select('id, total_final, moneda, paciente_id')
              .eq('id', tratamientoCompletadoId)
              .maybeSingle();

            if (error) {
              console.error('Error fetching treatment for payment:', error);
              return null;
            }
            if (!data) return null;

            return {
              id: data.id,
              total_final: Number(data.total_final) || 0,
              moneda: data.moneda,
              paciente_id: data.paciente_id
            };
          },
          getExistingPayments: async (tratamientoCompletadoId: string) => {
            const { data, error } = await supabase
              .from('payments')
              .select('monto_pago, monto_convertido')
              .eq('tratamiento_completado_id', tratamientoCompletadoId);

            if (error) {
              console.error('Error fetching existing payments for split:', error);
              return null;
            }
            return data || [];
          },
          insertPayment: async (row: Record<string, any>) => {
            const { data, error } = await supabase
              .from('payments')
              .insert([row])
              .select()
              .single();

            if (error) {
              console.error('Error adding payment:', error);
              throw error;
            }
            return data as Payment;
          },
          fetchAdvanceCredit: async (input) =>
            PatientCreditService.getCreditByPaymentId(input.origen_pago_id),
          convertAmount: async (amount: number, from: string, to: string) => {
            try {
              const conversion: ConversionResult = await currencyConversionService.convertAmount(amount, from, to);
              return {
                convertedAmount: conversion.convertedAmount,
                exchangeRate: conversion.exchangeRate
              };
            } catch (conversionError) {
              console.warn('Currency conversion failed:', conversionError);
              return null;
            }
          }
        },
        payment as any,
        treatmentCurrency
      );

      return {
        payment: processed.payment,
        advance: processed.advance
          ? {
              monto: processed.advance.monto,
              moneda: processed.advance.moneda as Currency,
              credito: processed.advance.credit
            }
          : null,
        cashEntryCreated: Boolean(processed.payment),
        mode: processed.mode
      };
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
      // First confirm the payment exists
      const { data: existing, error: selectError } = await supabase
        .from('payments')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking payment:', selectError);
        throw selectError;
      }

      if (!existing) {
        throw new Error('Payment not found');
      }

      // Clean up associated patient credits BEFORE deleting the payment row.
      // The payments->patient_credits FK uses ON DELETE SET NULL, so once the
      // payment is gone the credit's origen/usado reference is nulled and the
      // DB cleanup trigger can no longer match it, leaving orphaned credits.
      //  - Credits generated by this overpayment are cancelled.
      //  - Credits consumed by this saldo-positivo application are released
      //    back to "disponible" (the overpayment still belongs to the patient).
      await supabase
        .from('patient_credits')
        .update({ estado: 'cancelado', actualizado_en: new Date().toISOString() })
        .eq('origen_pago_id', id)
        .eq('estado', 'disponible');

      await supabase
        .from('patient_credits')
        .update({ estado: 'disponible', usado_en_pago_id: null, actualizado_en: new Date().toISOString() })
        .eq('usado_en_pago_id', id)
        .eq('estado', 'usado');

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
      const { data: check, error: checkError } = await supabase
        .from('payments')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        console.error('Error verifying payment deletion:', checkError);
      }

      if (check) {
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
        .select('total_final, moneda, monto_pagado, estado_pago, saldo_pendiente, paciente_id')
        .eq('id', tratamientoCompletadoId)
        .single();

      const payments = await this.getPaymentsByTreatmentId(tratamientoCompletadoId);

      const totalPaid = treatment?.monto_pagado || 0;
      const totalFinal = treatment?.total_final || 0;
      const saldoPendiente = this.calculatePendingBalance(totalFinal, totalPaid);
      const estadoPago = this.calculatePaymentStatus(totalFinal, totalPaid);

      // Get available patient credit if treatment has a paciente_id
      let creditoDisponible: PatientCreditSummary | undefined;
      if (treatment?.paciente_id) {
        try {
          creditoDisponible = await PatientCreditService.getCreditSummary(treatment.paciente_id);
        } catch (creditError) {
          console.warn('Could not load patient credit info:', creditError);
        }
      }

      return {
        monto_pagado: totalPaid,
        saldo_pendiente: saldoPendiente,
        estado_pago: estadoPago,
        pagos: payments,
        moneda_principal: treatment?.moneda,
        total_tratamiento: totalFinal,
        credito_disponible: creditoDisponible
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
      'saldo_positivo',
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
      'saldo_positivo': 'Saldo Positivo',
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
