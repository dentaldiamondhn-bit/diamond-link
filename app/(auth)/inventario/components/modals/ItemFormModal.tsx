'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { inventoryApi } from '@/services/inventoryApi';
import { getAvailableCurrencies, getCurrencySymbol, type Currency } from '@/utils/currencyUtils';
import type { InventarioItem } from '@/types/inventario';
import type { Marca } from '@/types/marcas';

interface ItemFormModalProps {
  item: InventarioItem | null;
  brands: Marca[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface ItemForm {
  codigo: string;
  nombre: string;
  precio: number;
  precio_compra: number;
  fecha_compra: string;
  moneda: Currency;
  marca_id: string;
  marca: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  imagen_url: string;
  activo: boolean;
}

function initialForm(item: InventarioItem | null): ItemForm {
  if (!item) {
    return {
      codigo: '',
      nombre: '',
      precio: 0,
      precio_compra: 0,
      fecha_compra: '',
      moneda: 'HNL',
      marca_id: '',
      marca: '',
      stock_actual: 0,
      stock_minimo: 5,
      ubicacion: '',
      imagen_url: '',
      activo: true,
    };
  }

  return {
    codigo: item.codigo || '',
    nombre: item.nombre || item.insumo?.nombre || '',
    precio: item.precio ?? item.insumo?.precio ?? 0,
    precio_compra: item.precio_compra ?? 0,
    fecha_compra: item.fecha_compra || '',
    moneda: (item.moneda || item.insumo?.moneda || 'HNL') as Currency,
    marca_id: item.marca_id || '',
    marca: item.marca || '',
    stock_actual: item.stock_actual,
    stock_minimo: item.stock_minimo,
    ubicacion: item.ubicacion || '',
    imagen_url: item.imagen_url || '',
    activo: item.activo ?? true,
  };
}

function brandLabel(brand: Marca): string {
  return `${brand.codigo} - ${brand.nombre}${brand.tipo ? ` (${brand.tipo})` : ''}`;
}

export default function ItemFormModal({ item, brands, onClose, onSaved }: ItemFormModalProps) {
  const [form, setForm] = useState<ItemForm>(() => initialForm(item));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm(initialForm(item));
    setError(null);
  }, [item]);

  const isEditing = item !== null;

  const setField = <K extends keyof ItemForm>(field: K, value: ItemForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBrandChange = (brandId: string) => {
    const brand = brands.find((entry) => entry.id === brandId);
    setForm((prev) => {
      const next = { ...prev, marca_id: brandId };
      if (!brand) {
        next.marca = '';
        return next;
      }
      next.marca = `${brand.nombre}${brand.tipo ? ' - ' + brand.tipo : ''}`;
      if (!prev.codigo.trim()) next.codigo = brand.codigo;
      if (!prev.nombre.trim()) next.nombre = brand.nombre;
      return next;
    });
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const { url } = await inventoryApi.uploadImage(file);
      setField('imagen_url', url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre del item es obligatorio');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      codigo: form.codigo || null,
      nombre: form.nombre.trim(),
      precio: form.precio,
      precio_compra: form.precio_compra,
      fecha_compra: form.fecha_compra || null,
      moneda: form.moneda,
      marca_id: form.marca_id || null,
      marca: form.marca || null,
      stock_minimo: form.stock_minimo,
      ubicacion: form.ubicacion || null,
      imagen_url: form.imagen_url || null,
      activo: form.activo,
    };

    try {
      if (item) {
        await inventoryApi.updateItem(item.id, payload);
      } else {
        await inventoryApi.createItem({ ...payload, stock_actual: form.stock_actual });
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end sm:items-center justify-center min-h-screen sm:p-4">
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={onClose}></div>
        <div className="relative z-10 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-t-3xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] p-6 sm:p-8 overflow-hidden text-slate-900 dark:text-slate-100 max-w-lg w-full p-6 relative z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <i className={`fas ${isEditing ? 'fa-edit text-teal-600' : 'fa-plus-circle text-blue-600'} mr-2`}></i>
            {isEditing ? `Editar Item: ${item.nombre || item.insumo?.nombre || ''}` : 'Nuevo Item en Inventario'}
          </h3>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              <i className="fas fa-exclamation-circle mr-2"></i>{error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
              <select
                value={form.marca_id}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              >
                <option value="">Seleccionar marca...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brandLabel(brand)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setField('codigo', e.target.value)}
                  className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                <input
                  type="text"
                  value={form.marca}
                  readOnly
                  className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setField('nombre', e.target.value)}
                placeholder="Nombre del item"
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Venta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(form.moneda)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio}
                    onChange={(e) => setField('precio', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Compra</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{getCurrencySymbol(form.moneda)}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio_compra}
                    onChange={(e) => setField('precio_compra', parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                <select
                  value={form.moneda}
                  onChange={(e) => setField('moneda', e.target.value as Currency)}
                  className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                >
                  {getAvailableCurrencies().map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} - {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.precio > 0 && form.precio_compra > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancia</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-700 dark:text-green-300">
                      {getCurrencySymbol(form.moneda)}{(form.precio - form.precio_compra).toFixed(2)}
                    </span>
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                      ({form.precio_compra > 0 ? Math.round(((form.precio - form.precio_compra) / form.precio_compra) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Compra</label>
              <input
                type="date"
                value={form.fecha_compra}
                onChange={(e) => setField('fecha_compra', e.target.value)}
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Actual</label>
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      value={form.stock_actual}
                      readOnly
                      className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Usa Registrar Entrada o Salida para modificar el stock.
                    </p>
                  </>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={form.stock_actual}
                    onChange={(e) => setField('stock_actual', parseInt(e.target.value) || 0)}
                    className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock_minimo}
                  onChange={(e) => setField('stock_minimo', parseInt(e.target.value) || 5)}
                  className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
              <input
                type="text"
                value={form.ubicacion}
                onChange={(e) => setField('ubicacion', e.target.value)}
                placeholder="Ej: Estante A, Gabinete 3..."
                className="w-full h-11 px-4 bg-slate-100/80 dark:bg-white/[0.04] backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen del Item</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">
                  <i className="fas fa-upload mr-2"></i>
                  {uploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {form.imagen_url && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    <i className="fas fa-check-circle mr-1"></i>Imagen seleccionada
                  </span>
                )}
              </div>
              {form.imagen_url && (
                <div className="mt-2">
                  <img
                    src={form.imagen_url}
                    alt="Preview"
                    className="h-24 w-24 object-contain border border-gray-200 dark:border-gray-600 rounded-lg"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="item-form-activo"
                checked={form.activo}
                onChange={(e) => setField('activo', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="item-form-activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Activo
              </label>
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
              disabled={saving || uploading || !form.nombre.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-[0_4px_20px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 dark:hover:from-cyan-400 dark:hover:to-blue-500 dark:shadow-[0_4px_25px_rgba(6,182,212,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] dark:hover:shadow-[0_8px_35px_rgba(6,182,212,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i>
              {isEditing ? 'Guardar Cambios' : 'Guardar Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
