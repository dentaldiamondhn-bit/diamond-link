'use client';

import { useState } from 'react';
import ItemCard from '../ItemCard';
import { isLowStock } from '@/lib/inventory/domain';
import type { InventarioItem } from '@/types/inventario';

type StatusFilter = 'todos' | 'bajo' | 'inactivos';

interface ItemsTabProps {
  items: InventarioItem[];
  onEdit: (item: InventarioItem) => void;
  onAddStock: (item: InventarioItem) => void;
  onDelete: (item: InventarioItem) => void;
  refreshing?: boolean;
}

export default function ItemsTab({ items, onEdit, onAddStock, onDelete, refreshing }: ItemsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'bajo' && !isLowStock(item)) return false;
    if (statusFilter === 'inactivos' && item.activo !== false) return false;
    if (!searchTerm) return true;

    const name = (item.nombre || item.insumo?.nombre || '').toLowerCase();
    const code = (item.codigo || item.insumo?.codigo || '').toLowerCase();
    const marca = (item.marca || '').toLowerCase();
    const location = (item.ubicacion || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    return name.includes(query) || code.includes(query) || marca.includes(query) || location.includes(query);
  });

  return (
    <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código, marca o ubicación..."
            className="w-full h-11 px-4 pl-10 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
          />
          <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
        >
          <option value="todos">Todos</option>
          <option value="bajo">Stock bajo</option>
          <option value="inactivos">Inactivos</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <i className="fas fa-box-open text-5xl mb-4"></i>
            <p className="text-lg">No hay items que coincidan con los filtros</p>
            <p className="text-sm mt-2">Ajusta la búsqueda o presiona "Nuevo Item" para agregar uno</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onEdit={onEdit}
              onAddStock={onAddStock}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
