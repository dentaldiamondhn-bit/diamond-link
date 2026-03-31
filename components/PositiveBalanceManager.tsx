import React, { useState, useEffect } from 'react';
import { PatientBalanceService, PatientBalance } from '../services/patientBalanceService';
import { formatCurrency, Currency } from '../utils/currencyUtils';
import { Plus, CreditCard, AlertCircle, TrendingUp, Users, DollarSign } from 'lucide-react';

interface PositiveBalanceManagerProps {
  pacienteId: string;
  pacienteNombre: string;
  currency: Currency;
  onBalanceUpdated?: () => void;
}

export const PositiveBalanceManager: React.FC<PositiveBalanceManagerProps> = ({
  pacienteId,
  pacienteNombre,
  currency,
  onBalanceUpdated
}) => {
  const [balance, setBalance] = useState<PatientBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBalance();
  }, [pacienteId, currency]);

  const loadBalance = async () => {
    try {
      setLoading(true);
      const { data, error } = await PatientBalanceService.getPatientBalance(pacienteId, currency);
      
      if (error) {
        console.error('Error loading balance:', error);
      } else {
        setBalance(data);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBalance = async () => {
    try {
      setError('');
      setSuccess('');
      setSubmitting(true);

      const amount = parseFloat(addAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Por favor ingrese un monto válido');
        return;
      }

      const { success, error } = await PatientBalanceService.addPositiveBalance(
        pacienteId,
        amount,
        currency,
        'system' // You can pass the actual user ID here
      );

      if (success) {
        setSuccess(`Saldo positivo de ${formatCurrency(amount, currency)} agregado exitosamente`);
        setAddAmount('');
        setAddNotes('');
        setShowAddModal(false);
        loadBalance();
        onBalanceUpdated?.();
      } else {
        setError('Error al agregar saldo positivo: ' + (error?.message || 'Error desconocido'));
      }
    } catch (error) {
      setError('Error al agregar saldo positivo: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Saldo Positivo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Crédito disponible para futuros tratamientos</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(balance?.balance_amount || 0, currency)}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-1 flex items-center space-x-1 text-sm emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Saldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Balance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Agregar Saldo Positivo
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pacienteNombre}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto a agregar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    {currency === 'HNL' ? 'L' : '$'}
                  </span>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Notas sobre este saldo positivo..."
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                  setSuccess('');
                  setAddAmount('');
                  setAddNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddBalance}
                disabled={submitting || !addAmount}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Agregando...' : 'Agregar Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Component to display positive balance usage in payment details
export const PositiveBalanceUsage: React.FC<{
  payment: any;
  currency: Currency;
}> = ({ payment, currency }) => {
  if (!payment.aplica_saldo_positivo || !payment.monto_saldo_aplicado) {
    return null;
  }

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Saldo Positivo Aplicado
          </span>
        </div>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(payment.monto_saldo_aplicado, currency)}
        </span>
      </div>
      {payment.saldo_restante_despues_pago !== undefined && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          Pago restante: {formatCurrency(payment.saldo_restante_despues_pago, currency)}
        </div>
      )}
    </div>
  );
};

// Component to show patient's positive balance summary
export const PatientBalanceSummary: React.FC<PatientBalanceSummaryProps> = ({
  pacienteId,
  currency
}) => {
  const [balance, setBalance] = useState<PatientBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const { data } = await PatientBalanceService.getPatientBalance(pacienteId, currency);
        setBalance(data);
      } catch (error) {
        console.error('Error loading patient balance:', error);
      } finally {
        setLoading(false);
      }
    };

    if (pacienteId) {
      loadBalance();
    }
  }, [pacienteId, currency]);

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-gray-400">Cargando...</span>
      </div>
    );
  }

  if (!balance || balance.balance_amount <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
        Saldo: {formatCurrency(balance.balance_amount, currency)}
      </span>
    </div>
  );
};
