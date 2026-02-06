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
  static async addPayment(payment: Omit<Payment, 'id' | 'creado_en' | 'actualizado_en'>, treatmentCurrency?: Currency): Promise<Payment> {
    try {
      console.log('Adding payment:', { payment, treatmentCurrency });
      
      const paymentData = {
        ...payment,
        monto_original: payment.monto_pago,
        moneda_original: payment.moneda,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      if (treatmentCurrency && payment.moneda !== treatmentCurrency) {
        try {
          const conversion = await currencyConversionService.convertAmount(payment.monto_pago, payment.moneda, treatmentCurrency);
          paymentData.monto_convertido = conversion.convertedAmount;
          paymentData.moneda_conversion = treatmentCurrency;
          paymentData.tasa_conversion = conversion.exchangeRate;
          console.log('Currency conversion applied:', conversion);
        } catch (error) {
          console.warn('Currency conversion failed:', error);
        }
      }

      console.log('Final payment data:', paymentData);

      const { data, error } = await supabase.from('payments').insert([paymentData]).select().single();
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Payment added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  }

  static async getPaymentSummary(tratamientoCompletadoId: string) {
    const { data: treatment } = await supabase
      .from('tratamientos_completados')
      .select('total_final, moneda, monto_pagado, saldo_pendiente, estado_pago')
      .eq('id', tratamientoCompletadoId)
      .single();

    const payments = await supabase
      .from('payments')
      .select('*')
      .eq('tratamiento_completado_id', tratamientoCompletadoId)
      .order('fecha_pago', { ascending: false });

    return {
      monto_pagado: treatment.monto_pagado || 0,
      saldo_pendiente: treatment.saldo_pendiente || 0,
      estado_pago: treatment.estado_pago,
      pagos: payments.data || [],
      moneda_principal: treatment.moneda,
      total_tratamiento: treatment.total_final || 0
    };
  }

  static async deletePayment(id: string): Promise<void> {
    try {
      console.log('Attempting to delete payment with ID:', id);
      
      // First try to select the payment to make sure it exists
      const { data: existingPayment, error: selectError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (selectError) {
        console.error('Payment not found:', selectError);
        throw new Error('Payment not found');
      }
      
      console.log('Found existing payment:', existingPayment);
      
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
      const { data: deletedCheck, error: checkError } = await supabase
        .from('payments')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError) {
        console.log('✅ Payment successfully deleted (no longer found)');
      } else {
        console.log('❌ Payment still exists after deletion attempt');
        throw new Error('Payment deletion failed - payment still exists');
      }
      
      console.log('✅ Payment deleted successfully');
    } catch (error) {
      console.error('Unexpected error deleting payment:', error);
      throw error;
    }
  }

  static getPaymentMethods(): string[] {
    return ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'cheque', 'deposito_bancario', 'paypal', 'otro'];
  }

  static formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia',
      'cheque': 'Cheque',
      'deposito_bancario': 'Depósito Bancario',
      'paypal': 'PayPal',
      'otro': 'Otro'
    };
    return methods[method] || method;
  }

  static getPaymentStatusBadge(estado: string): string {
    const badges: { [key: string]: string } = {
      'pagado': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'parcialmente_pagado': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }

  static getPaymentStatusText(estado: string): string {
    const texts: { [key: string]: string } = {
      'pagado': 'Pagado',
      'parcialmente_pagado': 'Parcialmente Pagado',
      'pendiente': 'Pendiente'
    };
    return texts[estado] || estado;
  }
}
