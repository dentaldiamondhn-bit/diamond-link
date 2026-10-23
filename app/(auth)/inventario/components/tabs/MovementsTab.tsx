'use client';

import { formatCurrency, type Currency } from '@/utils/currencyUtils';
import { formatDateForDisplay } from '@/utils/dateUtils';
import type { InventarioItem, MovimientoInventario } from '@/types/inventario';

export interface MovementFilters {
  accion: string;
  tipo: string;
  inventario_id: string;
}

interface MovementsTabProps {
  movements: MovimientoInventario[];
  items: InventarioItem[];
  loading: boolean;
  filters: MovementFilters;
  onFilterChange: (patch: Partial<MovementFilters>) => void;
  onNewMovement: (tipo: 'entrada' | 'salida') => void;
}

function getAccionLabel(mov: MovimientoInventario) {
  if (mov.accion) {
    const labels: Record<string, string> = {
      entrada_stock: 'Entrada',
      salida_stock: 'Salida',
      item_creado: 'Item Creado',
      item_editado: 'Item Editado',
      item_eliminado: 'Item Eliminado',
      marca_creada: 'Marca Creada',
      marca_editada: 'Marca Editada',
      marca_eliminada: 'Marca Eliminada',
    };
    return labels[mov.accion] || mov.accion;
  }
  if (mov.tipo === 'entrada') return 'Entrada';
  if (mov.tipo === 'salida') return 'Salida';
  if (mov.entidad_tipo === 'marca') return 'Marca';
  if (mov.entidad_tipo === 'inventario') return 'Item';
  return 'Movimiento';
}

function getAccionColor(mov: MovimientoInventario) {
  const action = mov.accion || mov.tipo || '';
  if (action === 'entrada_stock' || action === 'entrada') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (action === 'salida_stock' || action === 'salida') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action === 'item_creado') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (action === 'item_editado') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (action === 'item_eliminado') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (action === 'marca_creada') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (action === 'marca_editada') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
  if (action === 'marca_eliminada') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
}

export default function MovementsTab({
  movements,
  items,
  loading,
  filters,
  onFilterChange,
  onNewMovement,
}: MovementsTabProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.accion}
          onChange={(e) => onFilterChange({ accion: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
        >
          <option value="">Todas las actividades</option>
          <option value="entrada_stock">Entradas Stock</option>
          <option value="salida_stock">Salidas Stock</option>
          <option value="item_creado">Items Creados</option>
          <option value="item_editado">Items Editados</option>
          <option value="item_eliminado">Items Eliminados</option>
          <option value="marca_creada">Marcas Creadas</option>
          <option value="marca_editada">Marcas Editadas</option>
          <option value="marca_eliminada">Marcas Eliminadas</option>
        </select>
        <select
          value={filters.tipo}
          onChange={(e) => onFilterChange({ tipo: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
        >
          <option value="">Entrada / Salida</option>
          <option value="entrada">Solo Entradas</option>
          <option value="salida">Solo Salidas</option>
        </select>
        <select
          value={filters.inventario_id}
          onChange={(e) => onFilterChange({ inventario_id: e.target.value })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white flex-1 max-w-xs"
        >
          <option value="">Todos los items</option>
          {items.map((item) => {
            const label = item.codigo || item.insumo?.codigo || item.nombre || item.insumo?.nombre || '';
            return (
              <option key={item.id} value={item.id}>
                {label}
              </option>
            );
          })}
        </select>
        <button
          onClick={() => onNewMovement('entrada')}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <i className="fas fa-plus mr-1"></i>Entrada
        </button>
        <button
          onClick={() => onNewMovement('salida')}
          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          <i className="fas fa-minus mr-1"></i>Salida
        </button>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl shadow-black/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-white/[0.02]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Detalle</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Precio U.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                movements.map((mov) => {
                  const actionLabel = getAccionLabel(mov);
                  const actionColor = getAccionColor(mov);
                  const detail = mov.detalle || mov.entidad_nombre || mov.inventario?.nombre || mov.insumo?.nombre || '-';
                  const currency = (mov.inventario?.moneda ?? 'HNL') as Currency;

                  return (
                    <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDateForDisplay(mov.created_at, { includeTime: true })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${actionColor}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[250px] truncate">
                        {detail}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {mov.tipo && mov.cantidad > 0 ? mov.cantidad : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {mov.precio_unitario ? formatCurrency(mov.precio_unitario, currency) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {mov.precio_unitario && mov.cantidad > 0
                          ? formatCurrency(mov.precio_unitario * mov.cantidad, currency)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                        {mov.notas || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
