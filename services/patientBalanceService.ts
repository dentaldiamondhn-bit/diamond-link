import { supabase } from '../lib/supabase';
import { Currency } from '../utils/currencyUtils';

export interface PatientBalance {
  id: string;
  paciente_id: string;
  balance_amount: number;
  currency: Currency;
  last_updated: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithBalance {
  id: string;
  tratamiento_completado_id: string;
  monto_pago: number;
  moneda: Currency;
  aplica_saldo_positivo: boolean;
  monto_saldo_aplicado: number;
  saldo_restante_despues_pago: number;
  fecha_pago: string;
  metodo_pago: string;
  notas_pago?: string;
  creado_por?: string;
  creado_en: string;
  actualizado_en: string;
}

export class PatientBalanceService {
  // Get patient's positive balance
  static async getPatientBalance(pacienteId: string, currency: Currency = 'HNL'): Promise<{ data: PatientBalance | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('patient_balance')
        .select('*')
        .eq('paciente_id', pacienteId)
        .eq('currency', currency)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Add positive balance to patient account
  static async addPositiveBalance(
    pacienteId: string, 
    amount: number, 
    currency: Currency = 'HNL', 
    createdBy?: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase.rpc('add_patient_positive_balance', {
        paciente_uuid: pacienteId,
        amount: amount,
        currency_param: currency,
        created_by_user: createdBy
      });

      return { success: !error, error };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Get current balance using RPC function
  static async getCurrentBalance(pacienteId: string, currency: Currency = 'HNL'): Promise<{ data: number; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_patient_positive_balance', {
        paciente_uuid: pacienteId,
        currency_param: currency
      });

      return { data: data || 0, error };
    } catch (error) {
      return { data: 0, error };
    }
  }

  // Get patient's balance history with treatments
  static async getPatientBalanceWithTreatments(pacienteId: string, currency: Currency = 'HNL'): Promise<{
    balance: PatientBalance | null;
    recentTreatments: any[];
    error: any;
  }> {
    try {
      // Get current balance
      const { data: balance, error: balanceError } = await this.getPatientBalance(pacienteId, currency);
      
      // Get recent treatments that used positive balance
      const { data: treatments, error: treatmentsError } = await supabase
        .from('tratamientos_completados')
        .select(`
          id,
          paciente_id,
          nombre_paciente,
          total_final,
          moneda,
          fecha_tratamiento,
          saldo_positivo_aplicado,
          saldo_positivo_restante,
          estado_pago,
          payments(
            id,
            monto_pago,
            moneda,
            aplica_saldo_positivo,
            monto_saldo_aplicado,
            saldo_restante_despues_pago,
            fecha_pago,
            metodo_pago
          )
        `)
        .eq('paciente_id', pacienteId)
        .eq('moneda', currency)
        .gt('saldo_positivo_aplicado', 0)
        .order('fecha_tratamiento', { ascending: false })
        .limit(10);

      return {
        balance,
        recentTreatments: treatments || [],
        error: balanceError || treatmentsError
      };
    } catch (error) {
      return { balance: null, recentTreatments: [], error };
    }
  }

  // Update patient balance (for manual adjustments)
  static async updatePatientBalance(
    pacienteId: string,
    amount: number,
    currency: Currency = 'HNL',
    operation: 'add' | 'subtract' = 'add',
    updatedBy?: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase.rpc('update_patient_positive_balance', {
        paciente_uuid: pacienteId,
        amount_change: amount,
        currency_param: currency,
        operation_type: operation
      });

      if (!error && updatedBy) {
        // Update the created_by field if needed
        await supabase
          .from('patient_balance')
          .update({ created_by: updatedBy, updated_at: new Date().toISOString() })
          .eq('paciente_id', pacienteId)
          .eq('currency', currency);
      }

      return { success: !error, error };
    } catch (error) {
      return { success: false, error };
    }
  }

  // Get all patients with positive balances
  static async getAllPatientsWithPositiveBalances(currency?: Currency): Promise<{
    data: (PatientBalance & { patient_name?: string })[];
    error: any;
  }> {
    try {
      let query = supabase
        .from('patient_balance')
        .select('*, patients!inner(nombre_completo)')
        .gt('balance_amount', 0)
        .order('updated_at', { ascending: false });

      if (currency) {
        query = query.eq('currency', currency);
      }

      const { data, error } = await query;

      // Transform the data to include patient name
      const transformedData = data?.map(item => ({
        ...item,
        patient_name: item.patients?.nombre_completo
      })) || [];

      return { data: transformedData, error };
    } catch (error) {
      return { data: [], error };
    }
  }

  // Get balance summary for a patient across all currencies
  static async getPatientBalanceSummary(pacienteId: string): Promise<{
    balances: { currency: Currency; amount: number }[];
    totalInHNL: number;
    totalInUSD: number;
    error: any;
  }> {
    try {
      const { data, error } = await supabase
        .from('patient_balance')
        .select('currency, balance_amount')
        .eq('paciente_id', pacienteId)
        .gt('balance_amount', 0);

      const balances = data || [];
      
      // Calculate totals (you might want to add currency conversion here)
      const totalInHNL = balances
        .filter(b => b.currency === 'HNL')
        .reduce((sum, b) => sum + Number(b.balance_amount), 0);
      
      const totalInUSD = balances
        .filter(b => b.currency === 'USD')
        .reduce((sum, b) => sum + Number(b.balance_amount), 0);

      return {
        balances: balances.map(b => ({
          currency: b.currency as Currency,
          amount: Number(b.balance_amount)
        })),
        totalInHNL,
        totalInUSD,
        error
      };
    } catch (error) {
      return { balances: [], totalInHNL: 0, totalInUSD: 0, error };
    }
  }
}
