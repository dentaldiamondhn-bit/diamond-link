'use client';

import { useState } from 'react';
import { Currency, getCurrencySymbol, getAvailableCurrencies } from '../utils/currencyUtils';

export interface TreatmentFormData {
  id?: number;
  codigo: string;
  nombre: string;
  especialidad: string;
  precio: number;
  moneda: Currency; // New field for currency
  notas?: string; // Notes field for additional treatment information
  veces_realizado: number;
  activo: boolean;
}

export interface PromotionFormData {
  id?: number;
  codigo: string;
  nombre: string;
  descuento: number;
  precio_original: number;
  precio_promocional: number;
  moneda: Currency; // New field for currency
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  veces_realizado: number;
  es_grupal?: boolean;
  tipo_promocion?: 'individual' | '2x1' | 'family' | 'friends';
  max_beneficiarios?: number;
}

interface TreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  mode: 'treatment' | 'promotion';
  isEdit: boolean;
  treatmentFormData: TreatmentFormData;
  setTreatmentFormData: (data: TreatmentFormData) => void;
  promotionFormData: PromotionFormData;
  setPromotionFormData: (data: PromotionFormData) => void;
  specialties: string[];
  handleSpecialtyChange: (newSpecialty: string) => Promise<void>;
}

export default function TreatmentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  isEdit,
  treatmentFormData,
  setTreatmentFormData,
  promotionFormData,
  setPromotionFormData,
  specialties,
  handleSpecialtyChange
}: TreatmentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={onSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {mode === 'treatment' 
                    ? (isEdit ? 'Editar Tratamiento' : 'Nuevo Tratamiento')
                    : (isEdit ? 'Editar Promoción' : 'Nueva Promoción')
                  }
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="codigo"
                    required
                    readOnly={mode === 'treatment' && !isEdit}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-50 dark:bg-gray-600"
                    value={mode === 'treatment' ? (treatmentFormData.codigo || '') : (promotionFormData.codigo || '')}
                    onChange={(e) => mode === 'treatment' 
                      ? setTreatmentFormData({ ...treatmentFormData, codigo: e.target.value })
                      : setPromotionFormData({ ...promotionFormData, codigo: e.target.value })
                    }
                    placeholder={mode === 'treatment' && !isEdit ? "Se generará automáticamente" : ""}
                  />
                </div>
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={mode === 'treatment' ? (treatmentFormData.nombre || '') : (promotionFormData.nombre || '')}
                    onChange={(e) => mode === 'treatment' 
                      ? setTreatmentFormData({ ...treatmentFormData, nombre: e.target.value })
                      : setPromotionFormData({ ...promotionFormData, nombre: e.target.value })
                    }
                  />
                </div>
                {mode === 'treatment' ? (
                  <>
                    <div>
                      <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Especialidad <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="especialidad"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={treatmentFormData.especialidad || ''}
                        onChange={async (e) => {
                          const newSpecialty = e.target.value;
                          if (mode === 'treatment' && !isEdit) {
                            await handleSpecialtyChange(newSpecialty);
                          } else {
                            setTreatmentFormData({ ...treatmentFormData, especialidad: newSpecialty });
                          }
                        }}
                      >
                        <option value="">Selecciona una especialidad</option>
                        {specialties.map((specialty) => (
                          <option key={specialty} value={specialty}>
                            {specialty}
                          </option>
                        ))}
                      </select>
                      {mode === 'treatment' && !isEdit && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          El código se generará automáticamente al seleccionar una especialidad
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Precio <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(treatmentFormData.moneda || 'HNL')}</span>
                          </div>
                          <input
                            type="number"
                            id="precio"
                            required
                            min="0"
                            step="0.01"
                            className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={treatmentFormData.precio || 0}
                            onChange={(e) => setTreatmentFormData({ ...treatmentFormData, precio: parseFloat(e.target.value) || 0 })}
                            style={{ MozAppearance: "textfield", appearance: "textfield" }}
                          />
                          <style jsx>{`
                            input[type="number"]::-webkit-outer-spin-button,
                            input[type="number"]::-webkit-inner-spin-button {
                              -webkit-appearance: none;
                              margin: 0;
                            }
                            input[type="number"] {
                              -moz-appearance: textfield;
                            }
                          `}</style>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="moneda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Moneda <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="moneda"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={treatmentFormData.moneda || 'HNL'}
                          onChange={(e) => setTreatmentFormData({ ...treatmentFormData, moneda: e.target.value as Currency })}
                        >
                          {getAvailableCurrencies().map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.symbol} - {currency.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="notas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notas
                      </label>
                      <textarea
                        id="notas"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={treatmentFormData.notas || ''}
                        onChange={(e) => setTreatmentFormData({ ...treatmentFormData, notas: e.target.value })}
                        placeholder="Notas adicionales sobre el tratamiento..."
                      />
                      <p className="mt-1 text-xs text-gray-500">Notas internas sobre el tratamiento, similares a comentarios en odontograma</p>
                    </div>
                    <div>
                      <label htmlFor="veces_realizado" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Veces Realizado <span className="text-gray-400 text-xs">(Contador)</span>
                      </label>
                      <input
                        type="number"
                        id="veces_realizado"
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                        value={treatmentFormData.veces_realizado || 0}
                        readOnly
                      />
                      <p className="mt-1 text-xs text-gray-500">Se incrementa automáticamente cuando se realiza el tratamiento</p>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="descuento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Descuento (%)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="number"
                          id="descuento"
                          min="0"
                          max="100"
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                          value={promotionFormData.descuento || 0}
                          readOnly
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Calculado automáticamente</p>
                    </div>
                    <div>
                      <label htmlFor="precio_original" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Precio Original <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(promotionFormData.moneda || 'HNL')}</span>
                        </div>
                        <input
                          type="number"
                          id="precio_original"
                          required
                          min="0"
                          step="0.01"
                          className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={promotionFormData.precio_original || 0}
                          onChange={(e) => {
                            const newPrecioOriginal = parseFloat(e.target.value) || 0;
                            const newPromotionFormData = { ...promotionFormData, precio_original: newPrecioOriginal };
                            
                            // Calculate discount automatically if both prices are available
                            if (newPrecioOriginal > 0 && promotionFormData.precio_promocional > 0) {
                              const descuento = Math.round(((newPrecioOriginal - promotionFormData.precio_promocional) / newPrecioOriginal) * 100);
                              newPromotionFormData.descuento = Math.max(0, Math.min(100, descuento));
                            }
                            
                            setPromotionFormData(newPromotionFormData);
                          }}
                          style={{ MozAppearance: "textfield", appearance: "textfield" }}
                        />
                        <style jsx>{`
                          input[type="number"]::-webkit-outer-spin-button,
                          input[type="number"]::-webkit-inner-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                          }
                          input[type="number"] {
                            -moz-appearance: textfield;
                          }
                        `}</style>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="precio_promocional" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Precio Promocional <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">{getCurrencySymbol(promotionFormData.moneda || 'HNL')}</span>
                        </div>
                        <input
                          type="number"
                          id="precio_promocional"
                          required
                          min="0"
                          step="0.01"
                          className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={promotionFormData.precio_promocional || 0}
                          onChange={(e) => {
                            const newPrecioPromocional = parseFloat(e.target.value) || 0;
                            const newPromotionFormData = { ...promotionFormData, precio_promocional: newPrecioPromocional };
                            
                            // Calculate discount automatically if both prices are available
                            if (promotionFormData.precio_original > 0 && newPrecioPromocional > 0) {
                              const descuento = Math.round(((promotionFormData.precio_original - newPrecioPromocional) / promotionFormData.precio_original) * 100);
                              newPromotionFormData.descuento = Math.max(0, Math.min(100, descuento));
                            }
                            
                            setPromotionFormData(newPromotionFormData);
                          }}
                          style={{ MozAppearance: "textfield", appearance: "textfield" }}
                        />
                        <style jsx>{`
                          input[type="number"]::-webkit-outer-spin-button,
                          input[type="number"]::-webkit-inner-spin-button {
                            -webkit-appearance: none;
                            margin: 0;
                          }
                          input[type="number"] {
                            -moz-appearance: textfield;
                          }
                        `}</style>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="moneda_promocion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Moneda <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="moneda_promocion"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={promotionFormData.moneda || 'HNL'}
                        onChange={(e) => setPromotionFormData({ ...promotionFormData, moneda: e.target.value as Currency })}
                      >
                        {getAvailableCurrencies().map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} - {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        id="fecha_inicio"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={promotionFormData.fecha_inicio || ''}
                        onChange={(e) => setPromotionFormData({ ...promotionFormData, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        id="fecha_fin"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={promotionFormData.fecha_fin || ''}
                        onChange={(e) => setPromotionFormData({ ...promotionFormData, fecha_fin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="veces_realizado" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Veces Realizado <span className="text-gray-400 text-xs">(Contador)</span>
                      </label>
                      <input
                        type="number"
                        id="veces_realizado"
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-gray-100"
                        value={promotionFormData.veces_realizado || 0}
                        readOnly
                      />
                      <p className="mt-1 text-xs text-gray-500">Se incrementa automáticamente cuando se usa la promoción</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activo"
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    checked={mode === 'treatment' ? treatmentFormData.activo : promotionFormData.activo}
                    onChange={(e) => mode === 'treatment' 
                      ? setTreatmentFormData({ ...treatmentFormData, activo: e.target.checked })
                      : setPromotionFormData({ ...promotionFormData, activo: e.target.checked })
                    }
                  />
                  <label htmlFor="activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Activo
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
