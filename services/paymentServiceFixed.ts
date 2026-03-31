import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';
import { currencyConversionService } from './currencyConversionService';
import { PatientBalanceService } from './patientBalanceService';

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
  // Positive balance fields
  aplica_saldo_positivo?: boolean;
  monto_saldo_aplicado?: number;
  saldo_restante_despues_pago?: number;
}

export interface PaymentSummary {
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: 'pendiente' | 'parcialmente_pagado' | 'pagado';
  pagos: Payment[];
  moneda_principal?: Currency;
  total_tratamiento?: number;
  // Positive balance information
  saldo_positivo_disponible?: number;
  saldo_positivo_aplicado_total?: number;
}

export class PaymentService {
  static async addPayment(payment: Omit<Payment, 'id' | 'creado_en' | 'actualizado_en'>, treatmentCurrency?: Currency): Promise<Payment> {
    try {
      
      const paymentData = {
        ...payment,
        monto_original: payment.monto_pago,
        moneda_original: payment.moneda,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      // Handle saldo_positivo payments differently
      if (payment.metodo_pago === 'saldo_positivo') {
        // Get patient ID from treatment
        const { data: treatmentData } = await supabase
          .from('tratamientos_completados')
          .select('paciente_id')
          .eq('id', payment.tratamiento_completado_id)
          .single();

        if (!treatmentData?.paciente_id) {
          throw new Error('No se pudo encontrar el paciente para este tratamiento');
        }

        // Get patient's current positive balance
        const { data: balanceData } = await supabase
          .from('patient_balance')
          .select('balance_amount')
          .eq('paciente_id', treatmentData.paciente_id)
          .eq('currency', payment.moneda)
          .single();

        const currentBalance = balanceData?.balance_amount || 0;
        
        // Check if sufficient balance is available
        if (currentBalance < payment.monto_pago) {
          throw new Error(`Saldo positivo insuficiente. Disponible: ${currentBalance} ${payment.moneda}, Solicitado: ${payment.monto_pago} ${payment.moneda}`);
        }

        // Mark as positive balance payment (deducting from balance)
        paymentData.aplica_saldo_positivo = true;
        paymentData.monto_saldo_aplicado = payment.monto_pago;
        paymentData.saldo_restante_despues_pago = 0; // Full amount covered by balance
        
        // Deduct from patient's positive balance
        await PatientBalanceService.updatePositiveBalance(
          treatmentData.paciente_id, 
          payment.monto_pago, 
          payment.moneda, 
          'subtract'
        );
      }

      if (treatmentCurrency && payment.moneda !== treatmentCurrency) {
        try {
          const conversion = await currencyConversionService.convertAmount(payment.monto_pago, payment.moneda, treatmentCurrency);
          paymentData.monto_convertido = conversion.convertedAmount;
          paymentData.moneda_conversion = treatmentCurrency;
          paymentData.tasa_conversion = conversion.exchangeRate;
        } catch (error) {
          console.warn('Currency conversion failed:', error);
        }
      }

      const { data, error } = await supabase.from('payments').insert([paymentData]).select().single();
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  }

  static async getPaymentSummary(tratamientoCompletadoId: string): Promise<PaymentSummary> {
    const { data: treatment } = await supabase
      .from('tratamientos_completados')
      .select('total_final, moneda, monto_pagado, saldo_pendiente, estado_pago, paciente_id, saldo_positivo_aplicado')
      .eq('id', tratamientoCompletadoId)
      .single();

    const payments = await supabase
      .from('payments')
      .select('*')
      .eq('tratamiento_completado_id', tratamientoCompletadoId)
      .order('fecha_pago', { ascending: false });

    // Get patient's current positive balance
    let saldoPositivoDisponible = 0;
    if (treatment?.paciente_id) {
      const { data: balance } = await PatientBalanceService.getCurrentBalance(
        treatment.paciente_id, 
        treatment?.moneda as Currency
      );
      saldoPositivoDisponible = balance || 0;
    }

    // Calculate total positive balance applied to this treatment
    const saldoPositivoAplicadoTotal = payments.data?.reduce((total, payment) => {
      return total + (payment.monto_saldo_aplicado || 0);
    }, 0) || 0;

    return {
      monto_pagado: treatment?.monto_pagado || 0,
      saldo_pendiente: treatment?.saldo_pendiente || 0,
      estado_pago: treatment?.estado_pago,
      pagos: payments.data || [],
      moneda_principal: treatment?.moneda,
      total_tratamiento: treatment?.total_final || 0,
      saldo_positivo_disponible: saldoPositivoDisponible,
      saldo_positivo_aplicado_total: saldoPositivoAplicadoTotal
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
    return ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'cheque', 'deposito_bancario', 'saldo_positivo', 'otro'];
  }

  static formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia',
      'cheque': 'Cheque',
      'deposito_bancario': 'Extra BAC 6meses',
      'saldo_positivo': 'Saldo Positivo',
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
