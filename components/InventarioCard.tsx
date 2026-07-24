'use client';

import React from 'react';
import { InventarioItem } from '@/types/inventario';
import { formatCurrency } from '@/utils/currencyUtils';

interface InventarioCardProps {
  item: InventarioItem;
  onEdit: (item: InventarioItem) => void;
  onAddStock: (item: InventarioItem) => void;
  onDelete: (item: InventarioItem) => void;
}

export default function InventarioCard({ item, onEdit, onAddStock, onDelete }: InventarioCardProps) {
  const nombre = item.nombre || item.insumo?.nombre || 'Desconocido';
  const codigo = item.codigo || item.insumo?.codigo || '';
  const precio = item.precio ?? item.insumo?.precio ?? 0;
  const moneda = item.moneda || item.insumo?.moneda || 'HNL';
  const stockBajo = item.stock_actual < item.stock_minimo;
  const sinStock = item.stock_actual === 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
      item.activo === false ? 'border-red-300 dark:border-red-700 opacity-70' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Image */}
      <div className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {item.imagen_url ? (
          <img
            src={item.imagen_url}
            alt={nombre}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <i className="fas fa-box-open text-5xl mb-2"></i>
            <p className="text-xs">Sin imagen</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {nombre}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {codigo}
            </p>
            {item.marca && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                <i className="fas fa-tag mr-1"></i>{item.marca}
              </p>
            )}
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            item.activo === false
              ? 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-300'
              : sinStock
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : stockBajo
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}>
            {item.activo === false ? 'Inactivo' : sinStock ? 'Sin stock' : stockBajo ? 'Stock bajo' : 'Disponible'}
          </span>
        </div>

        {/* Stock bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Stock</span>
            <span className={`font-medium ${
              sinStock ? 'text-red-600' : stockBajo ? 'text-yellow-600' : 'text-gray-900 dark:text-white'
            }`}>
              {item.stock_actual} / {item.stock_minimo} min
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                sinStock ? 'bg-red-500' : stockBajo ? 'bg-yellow-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.min(100, (item.stock_actual / Math.max(item.stock_minimo, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Price & Location */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Precio:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(precio, moneda as any)}
            </span>
          </div>
          {item.precio_compra > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Ganancia:</span>
              <span className={`font-medium ${
                precio > item.precio_compra ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(precio - item.precio_compra, moneda as any)}
                <span className="ml-1 text-xs">
                  ({item.precio_compra > 0 ? Math.round(((precio - item.precio_compra) / item.precio_compra) * 100) : 0}%)
                </span>
              </span>
            </div>
          )}
          {item.ubicacion && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Ubicación:</span>
              <span className="text-gray-700 dark:text-gray-300">{item.ubicacion}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/20 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <i className="fas fa-edit mr-1"></i>Editar
          </button>
          <button
            onClick={() => onAddStock(item)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
          >
            <i className="fas fa-plus-circle mr-1"></i>Agregar
          </button>
          <button
            onClick={() => onDelete(item)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
