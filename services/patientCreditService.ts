import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';

export interface PatientCredit {
  id: string;
  paciente_id: string;
  monto: number;
  moneda: Currency;
  origen_pago_id?: string;
  tratamiento_completado_id?: string;
  usado_en_pago_id?: string;
  estado: 'disponible' | 'usado' | 'cancelado';
  notas?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface PatientCreditSummary {
  disponible_hnl: number;
  disponible_usd: number;
  total_disponible: number;
  credits: PatientCredit[];
}

export class PatientCreditService {
  /**
   * Get available (disponible) credits for a patient
   */
  static async getAvailableCredits(pacienteId: string, moneda?: Currency): Promise<PatientCredit[]> {
    try {
      let query = supabase
        .from('patient_credits')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('estado', 'disponible')
        .order('creado_en', { ascending: false });

      if (moneda) {
        query = query.eq('moneda', moneda);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching patient credits:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching patient credits:', error);
      throw error;
    }
  }

  /**
   * Get credit summary for a patient (totals by currency)
   */
  static async getCreditSummary(pacienteId: string): Promise<PatientCreditSummary> {
    try {
      const credits = await this.getAvailableCredits(pacienteId);

      const disponible_hnl = credits
        .filter(c => c.moneda === 'HNL')
        .reduce((sum, c) => sum + c.monto, 0);

      const disponible_usd = credits
        .filter(c => c.moneda === 'USD')
        .reduce((sum, c) => sum + c.monto, 0);

      return {
        disponible_hnl,
        disponible_usd,
        total_disponible: disponible_hnl + disponible_usd,
        credits
      };
    } catch (error) {
      console.error('Error getting credit summary:', error);
      throw error;
    }
  }

  /**
   * Apply patient credit to a treatment as a payment record
   * Creates a payment with method 'saldo_positivo' and marks the credit as used
   */
  static async applyCredit(
    pacienteId: string,
    tratamientoCompletadoId: string,
    amount: number,
    moneda: Currency,
    notas?: string
  ): Promise<{ payment: any; credit: PatientCredit }> {
    // 1. Verify enough credit available
    const availableCredits = await this.getAvailableCredits(pacienteId, moneda);
    const totalAvailable = availableCredits.reduce((sum, c) => sum + c.monto, 0);

    if (totalAvailable < amount) {
      throw new Error(`Crédito insuficiente. Disponible: ${totalAvailable}, Solicitado: ${amount}`);
    }

    // 2. Create a payment record with method 'saldo_positivo'
    const paymentData = {
      tratamiento_completado_id: tratamientoCompletadoId,
      monto_pago: amount,
      moneda: moneda,
      metodo_pago: 'saldo_positivo',
      notas_pago: notas || 'Pago con saldo positivo (crédito de paciente)',
      fecha_pago: new Date().toISOString(),
      creado_por: 'system',
      creado_en: new Date().toISOString(),
      actualizado_en: new Date().toISOString()
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating credit payment:', paymentError);
      throw paymentError;
    }

    // 3. Mark credits as used (consume oldest first)
    let remaining = amount;
    for (const credit of availableCredits) {
      if (remaining <= 0) break;

      const useAmount = Math.min(credit.monto, remaining);

      if (useAmount >= credit.monto) {
        // Fully consume this credit
        const { error: updateError } = await supabase
          .from('patient_credits')
          .update({
            estado: 'usado',
            usado_en_pago_id: payment.id,
            actualizado_en: new Date().toISOString()
          })
          .eq('id', credit.id);

        if (updateError) {
          console.error('Error marking credit as used:', updateError);
        }
      } else {
        // Partially consume: split the credit
        // Mark old credit as used for the partial amount
        const { error: updateError } = await supabase
          .from('patient_credits')
          .update({
            monto: credit.monto - useAmount,
            actualizado_en: new Date().toISOString()
          })
          .eq('id', credit.id);

        if (updateError) {
          console.error('Error partially consuming credit:', updateError);
        }
      }

      remaining -= useAmount;
    }

    return { payment, credit: availableCredits[0] };
  }

  /**
   * Manually add credit to a patient (e.g., refund, adjustment)
   */
  static async addCredit(
    pacienteId: string,
    monto: number,
    moneda: Currency,
    notas?: string
  ): Promise<PatientCredit> {
    const { data, error } = await supabase
      .from('patient_credits')
      .insert([{
        paciente_id: pacienteId,
        monto,
        moneda,
        estado: 'disponible',
        notas: notas || 'Crédito agregado manualmente',
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding patient credit:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all credits (for admin view)
   */
  static async getAllCredits(pacienteId: string): Promise<PatientCredit[]> {
    try {
      const { data, error } = await supabase
        .from('patient_credits')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('creado_en', { ascending: false });

      if (error) {
        console.error('Error fetching all patient credits:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching all patient credits:', error);
      throw error;
    }
  }
}
