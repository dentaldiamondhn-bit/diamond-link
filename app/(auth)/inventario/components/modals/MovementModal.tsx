'use client';

import { useEffect, useState } from 'react';
import { inventoryApi } from '@/services/inventoryApi';
import type { InventarioItem } from '@/types/inventario';

interface MovementModalProps {
  items: InventarioItem[];
  initialItem?: InventarioItem | null;
  initialType?: 'entrada' | 'salida';
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function MovementModal({
  items,
  initialItem,
  initialType = 'entrada',
  onClose,
  onSaved,
}: MovementModalProps) {
  const [inventarioId, setInventarioId] = useState(initialItem?.id ?? '');
  const [tipo, setTipo] = useState<'entrada' | 'salida'>(initialType);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setInventarioId(initialItem?.id ?? '');
    setTipo(initialType);
    setCantidad(1);
    setPrecioUnitario(0);
    setNotas('');
    setError(null);
  }, [initialItem, initialType]);

  const handleSubmit = async () => {
    if (!inventarioId) {
      setError('Selecciona un item');
      return;
    }
    if (cantidad < 1) {
      setError('La cantidad debe ser mayor a cero');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await inventoryApi.addMovement({
        inventario_id: inventarioId,
        tipo,
        cantidad,
        precio_unitario: precioUnitario || null,
        notas: notas || null,
        created_by: null,
        precio: null,
        precio_compra: null,
        fecha_compra: null,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen sm:p-4">
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={onClose}></div>
        <div className="relative z-10 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-6 sm:p-8 overflow-hidden text-slate-900 dark:text-slate-100 max-w-md w-full p-6 relative z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <i className={`fas fa-${tipo === 'entrada' ? 'arrow-down' : 'arrow-up'} mr-2 ${
              tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
            }`}></i>
            Registrar {tipo === 'entrada' ? 'Entrada' : 'Salida'}
          </h3>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <i className="fas fa-exclamation-circle mr-2"></i>{error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item</label>
              <select
                value={inventarioId}
                onChange={(e) => setInventarioId(e.target.value)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              >
                <option value="">Seleccionar item...</option>
                {items.map((item) => {
                  const label = item.codigo || item.insumo?.codigo || item.nombre || item.insumo?.nombre || '';
                  return (
                    <option key={item.id} value={item.id}>
                      {label} (Stock: {item.stock_actual})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'entrada' | 'salida')}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                placeholder="Motivo de la entrada/salida..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !inventarioId || cantidad < 1}
              className={`px-4 py-2 text-white rounded-lg ${
                tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`}></i>
              Registrar {tipo === 'entrada' ? 'Entrada' : 'Salida'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
