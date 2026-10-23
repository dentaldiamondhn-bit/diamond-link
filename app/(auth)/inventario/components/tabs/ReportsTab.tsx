'use client';

import { inventoryValuation, isLowStock } from '@/lib/inventory/domain';
import { formatCurrency } from '@/utils/currencyUtils';
import type { InventarioItem } from '@/types/inventario';

interface ReportsTabProps {
  items: InventarioItem[];
}

export default function ReportsTab({ items }: ReportsTabProps) {
  const valuation = inventoryValuation(items);
  const lowStockItems = items.filter(isLowStock);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-slate-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Valor al costo</h3>
          <i className="fas fa-coins text-2xl text-blue-600"></i>
        </div>
        <p className="text-3xl font-bold text-blue-600">{formatCurrency(valuation.cost, 'HNL')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Stock actual × precio de compra</p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-slate-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Valor de venta</h3>
          <i className="fas fa-dollar-sign text-2xl text-teal-600"></i>
        </div>
        <p className="text-3xl font-bold text-teal-600">{formatCurrency(valuation.retail, 'HNL')}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Stock actual × precio de venta</p>
      </div>

      <div className="bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-slate-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Items con stock bajo</h3>
          <i className="fas fa-exclamation-triangle text-2xl text-yellow-500"></i>
        </div>
        <p className="text-3xl font-bold text-yellow-500">{lowStockItems.length}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">En o por debajo del stock mínimo</p>
      </div>

      <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          <i className="fas fa-list mr-2 text-yellow-500"></i>
          Items con Stock Bajo - Detalle
        </h3>
        {lowStockItems.length === 0 ? (
          <p className="text-center py-4 text-gray-500 dark:text-gray-400">
            <i className="fas fa-check-circle text-green-500 mr-2"></i>
            Todos los items tienen stock suficiente
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock Mínimo</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Déficit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.codigo || item.insumo?.codigo || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.nombre || item.insumo?.nombre || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">{item.stock_actual}</td>
                    <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">{item.stock_minimo}</td>
                    <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                      -{Math.max(0, item.stock_minimo - item.stock_actual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
