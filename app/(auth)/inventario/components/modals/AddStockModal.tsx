'use client';

import { useEffect, useState } from 'react';
import { inventoryApi } from '@/services/inventoryApi';
import { getCurrencySymbol, type Currency } from '@/utils/currencyUtils';
import type { InventarioItem } from '@/types/inventario';

interface AddStockModalProps {
  item: InventarioItem | null;
  items: InventarioItem[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function AddStockModal({ item, items, onClose, onSaved }: AddStockModalProps) {
  const [selectedId, setSelectedId] = useState(item?.id ?? '');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(item?.precio ?? item?.insumo?.precio ?? 0);
  const [precioCompra, setPrecioCompra] = useState(item?.precio_compra ?? 0);
  const [fechaCompra, setFechaCompra] = useState(item?.fecha_compra || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedId(item?.id ?? '');
    setCantidad(1);
    setPrecio(item?.precio ?? item?.insumo?.precio ?? 0);
    setPrecioCompra(item?.precio_compra ?? 0);
    setFechaCompra(item?.fecha_compra || '');
    setError(null);
  }, [item]);

  const selectedItem = items.find((entry) => entry.id === selectedId) ?? (item?.id === selectedId ? item : null);
  const currency = (selectedItem?.moneda || selectedItem?.insumo?.moneda || 'HNL') as Currency;

  const handleItemChange = (id: string) => {
    setSelectedId(id);
    const next = items.find((entry) => entry.id === id) ?? null;
    if (!next) return;
    setPrecio(next.precio ?? next.insumo?.precio ?? 0);
    setPrecioCompra(next.precio_compra ?? 0);
    setFechaCompra(next.fecha_compra || '');
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
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
        inventario_id: selectedItem.id,
        tipo: 'entrada',
        cantidad,
        precio_unitario: precioCompra || null,
        notas: 'Agregado manualmente',
        created_by: null,
        precio,
        precio_compra: precioCompra,
        fecha_compra: fechaCompra || null,
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar stock');
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
            <i className="fas fa-plus-circle mr-2 text-green-600"></i>
            Agregar Stock
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
                value={selectedId}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              >
                <option value="">Seleccionar item...</option>
                {items.map((entry) => {
                  const label = entry.codigo || entry.insumo?.codigo || entry.nombre || entry.insumo?.nombre || '';
                  return (
                    <option key={entry.id} value={entry.id}>
                      {label} (Stock: {entry.stock_actual})
                    </option>
                  );
                })}
              </select>
              {selectedItem && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {selectedItem.nombre || selectedItem.insumo?.nombre} — Stock actual: <strong>{selectedItem.stock_actual}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad a agregar</label>
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Venta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(currency)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Compra</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(currency)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
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
              disabled={saving || !selectedItem || cantidad < 1}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'} mr-2`}></i>
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
