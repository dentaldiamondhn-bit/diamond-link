'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import LoadingAnimation from '@/components/LoadingAnimation';
import InventarioCard from '@/components/InventarioCard';
import MarcasTab from '@/components/MarcasTab';
import DistribuidoresTab from '@/components/DistribuidoresTab';
import { InventarioItem, MovimientoInventario } from '@/types/inventario';
import { formatCurrency, getCurrencySymbol, getAvailableCurrencies } from '@/utils/currencyUtils';
import { formatDateForDisplay } from '@/utils/dateUtils';

export default function InventarioPage() {
  const { userRole, isLoaded } = useRoleBasedAccess();

  const getAccionLabel = (mov: MovimientoInventario) => {
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
  };

  const getAccionColor = (mov: MovimientoInventario) => {
    const a = mov.accion || mov.tipo || '';
    if (a === 'entrada_stock' || a === 'entrada') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (a === 'salida_stock' || a === 'salida') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (a === 'item_creado') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (a === 'item_editado') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (a === 'item_eliminado') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (a === 'marca_creada') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    if (a === 'marca_editada') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    if (a === 'marca_eliminada') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const [activeTab, setActiveTab] = useState<'inventario' | 'movimientos' | 'reportes' | 'marcas' | 'distribuidores'>('inventario');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<InventarioItem | null>(null);
  const [editForm, setEditForm] = useState({
    codigo: '',
    nombre: '',
    precio: 0,
    precio_compra: 0,
    fecha_compra: '',
    moneda: 'HNL' as 'HNL' | 'USD',
    marca_id: '',
    marca: '',
    stock_actual: 0,
    stock_minimo: 0,
    ubicacion: '',
    imagen_url: '',
    activo: true,
  });

  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockItem, setAddStockItem] = useState<InventarioItem | null>(null);
  const [addStockCantidad, setAddStockCantidad] = useState(1);
  const [addStockForm, setAddStockForm] = useState({ precio: 0, precio_compra: 0, fecha_compra: '' });

  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [movimientoTipo, setMovimientoTipo] = useState<'entrada' | 'salida'>('entrada');
  const [movimientoForm, setMovimientoForm] = useState({ inventario_id: '', cantidad: 1, precio_unitario: 0, notas: '' });

  // Nuevo Item modal
  const [showNuevoItemModal, setShowNuevoItemModal] = useState(false);
  const [marcasList, setMarcasList] = useState<any[]>([]);
  const [nuevoItemForm, setNuevoItemForm] = useState({
    codigo: '',
    nombre: '',
    precio: 0,
    precio_compra: 0,
    fecha_compra: '',
    moneda: 'HNL' as 'HNL' | 'USD',
    marca_id: '',
    marca: '',
    stock_actual: 0,
    stock_minimo: 5,
    ubicacion: '',
    imagen_url: '',
    activo: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMessage, setImageUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for movimientos
  const [movFilterTipo, setMovFilterTipo] = useState<string>('');
  const [movFilterInventarioId, setMovFilterInventarioId] = useState<string>('');
  const [movFilterAccion, setMovFilterAccion] = useState<string>('');

  const [valorTotal, setValorTotal] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);

  const loadInventario = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario?_=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setInventario(data);
        setStockBajoCount(data.filter((i: InventarioItem) => i.stock_actual < i.stock_minimo).length);
      }
    } catch (err) {
      console.error('Error loading inventario:', err);
    }
  }, []);

  const loadMovimientos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (movFilterTipo) params.set('tipo', movFilterTipo);
      if (movFilterInventarioId) params.set('inventario_id', movFilterInventarioId);
      if (movFilterAccion) params.set('accion', movFilterAccion);
      params.set('limit', '100');

      const res = await fetch(`/api/inventario/movimientos?${params}`);
      if (res.ok) {
        setMovimientos(await res.json());
      }
    } catch (err) {
      console.error('Error loading movimientos:', err);
    }
  }, [movFilterTipo, movFilterInventarioId, movFilterAccion]);

  const loadValorTotal = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario?_=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        const total = data.reduce((sum: number, item: InventarioItem) => {
          const p = item.precio ?? item.insumo?.precio ?? 0;
          return sum + p * item.stock_actual;
        }, 0);
        setValorTotal(total);
      }
    } catch (err) {
      console.error('Error loading valor total:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadInventario(), loadMovimientos(), loadValorTotal()]).finally(() => setLoading(false));
  }, [loadInventario, loadMovimientos, loadValorTotal]);

  useEffect(() => {
    if (activeTab === 'movimientos') loadMovimientos();
    if (activeTab === 'reportes') loadValorTotal();
  }, [activeTab, loadMovimientos, loadValorTotal]);

  // Access control
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (userRole !== 'admin' && userRole !== 'tech_support') {
    return (
      <AccessDenied
        title="Acceso Denegado"
        message="No tienes permiso para acceder al módulo de inventario."
        explanation="Esta área es exclusiva para administradores y personal de soporte técnico."
        onGoBack={() => window.history.back()}
      />
    );
  }

  const filteredInventario = inventario.filter(item => {
    if (!searchTerm) return true;
    const name = (item.nombre || item.insumo?.nombre || '').toLowerCase();
    const code = (item.codigo || item.insumo?.codigo || '').toLowerCase();
    const marca = (item.marca || '').toLowerCase();
    const loc = (item.ubicacion || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || code.includes(q) || marca.includes(q) || loc.includes(q);
  });

  const openEditModal = (item: InventarioItem) => {
    setEditItem(item);
    setEditForm({
      codigo: item.codigo || '',
      nombre: item.nombre || item.insumo?.nombre || '',
      precio: item.precio ?? item.insumo?.precio ?? 0,
      precio_compra: item.precio_compra ?? 0,
      fecha_compra: item.fecha_compra || '',
      moneda: (item.moneda || item.insumo?.moneda || 'HNL') as 'HNL' | 'USD',
      marca_id: item.marca_id || '',
      marca: item.marca || '',
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
      ubicacion: item.ubicacion || '',
      imagen_url: item.imagen_url || '',
      activo: item.activo ?? true,
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editItem) return;
    try {
      const res = await fetch(`/api/inventario?id=${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: editForm.codigo,
          nombre: editForm.nombre,
          precio: editForm.precio,
          precio_compra: editForm.precio_compra,
          fecha_compra: editForm.fecha_compra || null,
          moneda: editForm.moneda,
          marca_id: editForm.marca_id,
          marca: editForm.marca,
          stock_actual: editForm.stock_actual,
          stock_minimo: editForm.stock_minimo,
          ubicacion: editForm.ubicacion,
          imagen_url: editForm.imagen_url,
          activo: editForm.activo,
        }),
      });
      if (res.ok) {
        await loadInventario();
        setShowEditModal(false);
      } else {
        const err = await res.json();
        alert('Error al guardar: ' + (err.error || 'desconocido'));
      }
    } catch (err) {
      console.error('Error saving inventario:', err);
      alert('Error al guardar');
    }
  };

  const openMovimientoModal = (tipo: 'entrada' | 'salida', inventarioId?: string) => {
    setMovimientoTipo(tipo);
    setMovimientoForm({ inventario_id: inventarioId || '', cantidad: 1, precio_unitario: 0, notas: '' });
    setShowMovimientoModal(true);
  };

  const saveMovimiento = async () => {
    try {
      const res = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventario_id: movimientoForm.inventario_id,
          tipo: movimientoTipo,
          cantidad: movimientoForm.cantidad,
          precio_unitario: movimientoForm.precio_unitario || null,
          notas: movimientoForm.notas || null,
        }),
      });
      if (res.ok) {
        await loadInventario();
        await loadMovimientos();
        setShowMovimientoModal(false);
      }
    } catch (err) {
      console.error('Error saving movimiento:', err);
    }
  };

  const deleteInventario = async (item: InventarioItem) => {
    const name = item.nombre || item.insumo?.nombre || 'item';
    if (!confirm(`¿Eliminar "${name}" del inventario?`)) return;
    try {
      const res = await fetch(`/api/inventario?id=${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadInventario();
      }
    } catch (err) {
      console.error('Error deleting inventario:', err);
    }
  };

  const openAddStockModal = (item: InventarioItem) => {
    setAddStockItem(item);
    setAddStockCantidad(1);
    setAddStockForm({
      precio: item.precio ?? item.insumo?.precio ?? 0,
      precio_compra: item.precio_compra ?? 0,
      fecha_compra: item.fecha_compra || '',
    });
    setShowAddStockModal(true);
  };

  const saveAddStock = async () => {
    if (!addStockItem || addStockCantidad < 1) return;
    try {
      // Try movement API first — records movement AND updates stock
      let ok = false;
      const movRes = await fetch('/api/inventario/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventario_id: addStockItem.id,
          tipo: 'entrada',
          cantidad: addStockCantidad,
          precio_unitario: addStockForm.precio_compra || undefined,
          notas: 'Agregado manualmente',
        }),
      });

      if (movRes.ok) {
        ok = true;
        // Also update precio_compra, precio, fecha_compra via PUT
        await fetch(`/api/inventario?id=${addStockItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            precio: addStockForm.precio,
            precio_compra: addStockForm.precio_compra,
            fecha_compra: addStockForm.fecha_compra || null,
          }),
        }).catch(() => {});
      } else {
        // Fallback: use PUT to update stock directly, no movement recorded
        const putRes = await fetch(`/api/inventario?id=${addStockItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_actual: addStockItem.stock_actual + addStockCantidad,
            stock_minimo: addStockItem.stock_minimo,
            precio: addStockForm.precio,
            precio_compra: addStockForm.precio_compra,
            fecha_compra: addStockForm.fecha_compra || null,
            moneda: addStockItem.moneda || 'HNL',
            codigo: addStockItem.codigo,
            nombre: addStockItem.nombre,
            marca: addStockItem.marca,
            marca_id: addStockItem.marca_id,
            ubicacion: addStockItem.ubicacion,
            imagen_url: addStockItem.imagen_url,
            activo: addStockItem.activo,
          }),
        });
        ok = putRes.ok;
      }

      if (ok) {
        await loadInventario();
        await loadMovimientos();
        setShowAddStockModal(false);
      } else {
        alert('Error al agregar stock');
      }
    } catch (err) {
      console.error('Error adding stock:', err);
      alert('Error al agregar stock');
    }
  };

  const openNuevoItemModal = async () => {
    setNuevoItemForm({ codigo: '', nombre: '', precio: 0, precio_compra: 0, fecha_compra: '', moneda: 'HNL', marca_id: '', marca: '', stock_actual: 0, stock_minimo: 5, ubicacion: '', imagen_url: '', activo: true });
    try {
      const res = await fetch('/api/inventario/marcas');
      if (res.ok) setMarcasList(await res.json());
    } catch (_) {}
    setShowNuevoItemModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setImageUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/inventario/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const { url } = await res.json();
        if (showEditModal) {
          setEditForm(prev => ({ ...prev, imagen_url: url }));
        } else {
          setNuevoItemForm(prev => ({ ...prev, imagen_url: url }));
        }
        setImageUploadMessage({ type: 'success', text: 'Imagen subida correctamente' });
        setTimeout(() => setImageUploadMessage(null), 4000);
      } else {
        const err = await res.json();
        setImageUploadMessage({ type: 'error', text: 'Error al subir imagen: ' + (err.error || 'desconocido') });
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setImageUploadMessage({ type: 'error', text: 'Error al subir imagen' });
    } finally {
      setUploadingImage(false);
    }
  };

  const saveNuevoItem = async () => {
    if (!nuevoItemForm.nombre.trim()) {
      alert('El nombre del item es obligatorio');
      return;
    }
    try {
      const selectedMarca = marcasList.find(m => m.id === nuevoItemForm.marca_id);
      const res = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoItemForm,
          marca: selectedMarca ? `${selectedMarca.nombre}${selectedMarca.tipo ? ' - ' + selectedMarca.tipo : ''}` : nuevoItemForm.marca,
        }),
      });
      if (res.ok) {
        await loadInventario();
        setShowNuevoItemModal(false);
      } else {
        const err = await res.json();
        alert('Error al crear item: ' + (err.error || 'desconocido'));
      }
    } catch (err) {
      console.error('Error creating inventario item:', err);
      alert('Error al crear item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <>
      {/* Dynamic header row — within layout's max-w-7xl */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {inventario.length} items registrados | {stockBajoCount} con stock bajo
        </p>
        <div className="flex gap-2">
          {activeTab === 'inventario' && (
            <>
              <button
                onClick={openNuevoItemModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <i className="fas fa-plus mr-2"></i>Nuevo Item
              </button>
              <button
                onClick={() => openMovimientoModal('entrada')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                <i className="fas fa-arrow-down mr-2"></i>Registrar Entrada
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventario')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'inventario'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className="fas fa-boxes mr-2"></i>Inventario
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'movimientos'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className="fas fa-history mr-2"></i>Movimientos
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reportes'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className="fas fa-chart-pie mr-2"></i>Reportes
          </button>
          <button
            onClick={() => setActiveTab('marcas')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'marcas'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className="fas fa-tag mr-2"></i>Marcas
          </button>
          <button
            onClick={() => setActiveTab('distribuidores')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'distribuidores'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className="fas fa-truck mr-2"></i>Distribuidores
          </button>
        </nav>
      </div>

      {/* Search */}
      {activeTab === 'inventario' && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, código, marca o ubicación..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
            />
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>
      )}

      {/* Tab: Inventario (Card Grid) */}
      {activeTab === 'inventario' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInventario.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              <i className="fas fa-box-open text-5xl mb-4"></i>
              <p className="text-lg">No hay items en el inventario</p>
              <p className="text-sm mt-2">Presiona "Nuevo Item" para agregar el primero</p>
            </div>
          ) : (
            filteredInventario.map((item) => (
              <InventarioCard
                key={item.id}
                item={item}
                onEdit={openEditModal}
                onAddStock={openAddStockModal}
                onDelete={deleteInventario}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Movimientos */}
      {activeTab === 'movimientos' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={movFilterAccion}
              onChange={(e) => setMovFilterAccion(e.target.value)}
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
              value={movFilterTipo}
              onChange={(e) => setMovFilterTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">Entrada / Salida</option>
              <option value="entrada">Solo Entradas</option>
              <option value="salida">Solo Salidas</option>
            </select>
            <select
              value={movFilterInventarioId}
              onChange={(e) => setMovFilterInventarioId(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white flex-1 max-w-xs"
            >
              <option value="">Todos los items</option>
              {inventario.map((item) => {
                const label = item.codigo || item.insumo?.codigo || item.nombre || item.insumo?.nombre || '';
                return (
                  <option key={item.id} value={item.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => openMovimientoModal('entrada')}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <i className="fas fa-plus mr-1"></i>Entrada
            </button>
            <button
              onClick={() => openMovimientoModal('salida')}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <i className="fas fa-minus mr-1"></i>Salida
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
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
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No hay movimientos registrados
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov) => {
                      const accionLabel = getAccionLabel(mov);
                      const accionColor = getAccionColor(mov);
                      const detalle = mov.detalle || mov.inventario?.codigo || mov.insumo?.codigo || mov.inventario?.nombre || mov.insumo?.nombre || mov.entidad_nombre || '-';
                      return (
                        <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                            {formatDateForDisplay(mov.created_at, { includeTime: true })}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${accionColor}`}>
                              {accionLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[250px] truncate">
                            {detalle}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {mov.tipo && mov.cantidad > 0 ? mov.cantidad : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                            {mov.precio_unitario ? formatCurrency(mov.precio_unitario, 'HNL') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            {mov.precio_unitario && mov.cantidad > 0 ? formatCurrency(mov.precio_unitario * mov.cantidad, 'HNL') : '-'}
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
      )}

      {/* Tab: Reportes */}
      {activeTab === 'reportes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Valor Total del Inventario */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Valor Total del Inventario</h3>
              <i className="fas fa-dollar-sign text-2xl text-teal-600"></i>
            </div>
            <p className="text-3xl font-bold text-teal-600">{formatCurrency(valorTotal, 'HNL')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Basado en stock actual × precio unitario</p>
          </div>

          {/* Stock Bajo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Items con Stock Bajo</h3>
              <i className="fas fa-exclamation-triangle text-2xl text-yellow-500"></i>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{stockBajoCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Items por debajo del stock mínimo</p>
          </div>

          {/* Total Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Total de Items</h3>
              <i className="fas fa-boxes text-2xl text-blue-600"></i>
            </div>
            <p className="text-3xl font-bold text-blue-600">{inventario.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Items registrados en el inventario</p>
          </div>

          {/* Stock bajo list */}
          <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fas fa-list mr-2 text-yellow-500"></i>
              Items con Stock Bajo - Detalle
            </h3>
            {inventario.filter(i => i.stock_actual < i.stock_minimo).length === 0 ? (
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
                    {inventario
                      .filter(i => i.stock_actual < i.stock_minimo)
                      .map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.codigo || item.insumo?.codigo || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.nombre || item.insumo?.nombre || '-'}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">{item.stock_actual}</td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">{item.stock_minimo}</td>
                          <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">-{item.stock_minimo - item.stock_actual}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Marcas */}
      {activeTab === 'marcas' && <MarcasTab />}

      {/* Tab: Distribuidores */}
      {activeTab === 'distribuidores' && <DistribuidoresTab />}

      {/* Add Stock Modal */}
      {showAddStockModal && addStockItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddStockModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <i className="fas fa-plus-circle mr-2 text-green-600"></i>
                Agregar Stock
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {addStockItem.nombre || addStockItem.insumo?.nombre} — Stock actual: <strong>{addStockItem.stock_actual}</strong>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad a agregar</label>
                  <input
                    type="number"
                    min="1"
                    value={addStockCantidad}
                    onChange={(e) => setAddStockCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Venta</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addStockForm.precio}
                      onChange={(e) => setAddStockForm({ ...addStockForm, precio: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Compra</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={addStockForm.precio_compra}
                      onChange={(e) => setAddStockForm({ ...addStockForm, precio_compra: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={addStockForm.fecha_compra}
                    onChange={(e) => setAddStockForm({ ...addStockForm, fecha_compra: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveAddStock}
                  disabled={addStockCantidad < 1}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <i className="fas fa-check mr-2"></i>Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowEditModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <i className="fas fa-edit mr-2 text-teal-600"></i>
                Editar Item: {editItem.nombre || editItem.insumo?.nombre || ''}
              </h3>
              <div className="space-y-4">
                {/* Código y Marca */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                    <input
                      type="text"
                      value={editForm.codigo}
                      onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                    <input
                      type="text"
                      value={editForm.marca}
                      onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Price and Currency — 3-column grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Precio Venta <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {getCurrencySymbol(editForm.moneda)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.precio}
                        onChange={(e) => setEditForm({ ...editForm, precio: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Precio Compra
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {getCurrencySymbol(editForm.moneda)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.precio_compra}
                        onChange={(e) => setEditForm({ ...editForm, precio_compra: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Moneda <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.moneda}
                      onChange={(e) => setEditForm({ ...editForm, moneda: e.target.value as 'HNL' | 'USD' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {getAvailableCurrencies().map(c => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ganancia (calculated) */}
                {editForm.precio > 0 && editForm.precio_compra > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancia</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          {getCurrencySymbol(editForm.moneda)}{(editForm.precio - editForm.precio_compra).toFixed(2)}
                        </span>
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                          ({editForm.precio_compra > 0 ? Math.round(((editForm.precio - editForm.precio_compra) / editForm.precio_compra) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha de Compra */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={editForm.fecha_compra}
                    onChange={(e) => setEditForm({ ...editForm, fecha_compra: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Actual</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.stock_actual}
                      onChange={(e) => setEditForm({ ...editForm, stock_actual: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.stock_minimo}
                      onChange={(e) => setEditForm({ ...editForm, stock_minimo: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={editForm.ubicacion}
                    onChange={(e) => setEditForm({ ...editForm, ubicacion: e.target.value })}
                    placeholder="Ej: Estante A, Gabinete 3..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen del Item</label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">
                      <i className="fas fa-upload mr-2"></i>
                      {uploadingImage ? 'Subiendo...' : 'Seleccionar Imagen'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    {editForm.imagen_url && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        <i className="fas fa-check-circle mr-1"></i>Imagen seleccionada
                      </span>
                    )}
                  </div>
                  {imageUploadMessage && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      imageUploadMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {imageUploadMessage.type === 'success' ? (
                        <i className="fas fa-check-circle"></i>
                      ) : (
                        <i className="fas fa-exclamation-circle"></i>
                      )}
                      {imageUploadMessage.text}
                    </div>
                  )}
                  {editForm.imagen_url && (
                    <div className="mt-2">
                      <img
                        src={editForm.imagen_url}
                        alt="Preview"
                        className="h-24 w-24 object-contain border border-gray-200 dark:border-gray-600 rounded-lg"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                {/* Activo checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="edit-item-activo"
                    checked={editForm.activo}
                    onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="edit-item-activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Activo
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editForm.nombre.trim()}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  <i className="fas fa-save mr-2"></i>Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Movimiento Modal */}
      {showMovimientoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowMovimientoModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <i className={`fas fa-${movimientoTipo === 'entrada' ? 'arrow-down' : 'arrow-up'} mr-2 ${
                  movimientoTipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                }`}></i>
                Registrar {movimientoTipo === 'entrada' ? 'Entrada' : 'Salida'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item</label>
                  <select
                    value={movimientoForm.inventario_id}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, inventario_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar item...</option>
                    {inventario.map((item) => {
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={movimientoForm.cantidad}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Unitario</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movimientoForm.precio_unitario}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, precio_unitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                  <textarea
                    value={movimientoForm.notas}
                    onChange={(e) => setMovimientoForm({ ...movimientoForm, notas: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Motivo de la entrada/salida..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowMovimientoModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveMovimiento}
                  disabled={!movimientoForm.inventario_id}
                  className={`px-4 py-2 text-white rounded-lg ${
                    movimientoTipo === 'entrada'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  Registrar {movimientoTipo === 'entrada' ? 'Entrada' : 'Salida'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Item Modal */}
      {showNuevoItemModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowNuevoItemModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <i className="fas fa-plus-circle mr-2 text-blue-600"></i>
                Nuevo Item en Inventario
              </h3>
              <div className="space-y-4">
                {/* Item dropdown — first field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nuevoItemForm.marca_id}
                    onChange={(e) => {
                      const id = e.target.value;
                      const m = marcasList.find(x => x.id === id);
                      setNuevoItemForm({
                        ...nuevoItemForm,
                        marca_id: id,
                        marca: m ? m.nombre : '',
                        codigo: m ? m.codigo : '',
                        nombre: m ? (m.tipo || '') : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seleccionar item...</option>
                    {marcasList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.codigo} - {m.nombre}{m.tipo ? ` (${m.tipo})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selecciona un item para autocompletar código y marca
                  </p>
                </div>

                {/* Código y Marca */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
                    <input
                      type="text"
                      value={nuevoItemForm.codigo}
                      onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, codigo: e.target.value })}
                      placeholder="Auto-filled desde Item"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                    <input
                      type="text"
                      value={nuevoItemForm.marca}
                      readOnly
                      placeholder="Auto-filled desde Item"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nuevoItemForm.nombre}
                    onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, nombre: e.target.value })}
                    placeholder="Nombre del item (ej: Jeringa Anestésica 5ml)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Price and Currency — 3-column grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Precio Venta <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {getCurrencySymbol(nuevoItemForm.moneda)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nuevoItemForm.precio}
                        onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, precio: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Precio Compra
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {getCurrencySymbol(nuevoItemForm.moneda)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={nuevoItemForm.precio_compra}
                        onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, precio_compra: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Moneda <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={nuevoItemForm.moneda}
                      onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, moneda: e.target.value as 'HNL' | 'USD' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      {getAvailableCurrencies().map(c => (
                        <option key={c.code} value={c.code}>
                          {c.symbol} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Ganancia (calculated) */}
                {nuevoItemForm.precio > 0 && nuevoItemForm.precio_compra > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancia</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-green-700 dark:text-green-300">
                          {getCurrencySymbol(nuevoItemForm.moneda)}{(nuevoItemForm.precio - nuevoItemForm.precio_compra).toFixed(2)}
                        </span>
                        <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                          ({nuevoItemForm.precio_compra > 0 ? Math.round(((nuevoItemForm.precio - nuevoItemForm.precio_compra) / nuevoItemForm.precio_compra) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fecha de Compra */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    value={nuevoItemForm.fecha_compra}
                    onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, fecha_compra: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={nuevoItemForm.stock_actual}
                      onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, stock_actual: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={nuevoItemForm.stock_minimo}
                      onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, stock_minimo: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={nuevoItemForm.ubicacion}
                    onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, ubicacion: e.target.value })}
                    placeholder="Ej: Estante A, Gabinete 3..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Imagen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen del Item</label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm">
                      <i className="fas fa-upload mr-2"></i>
                      {uploadingImage ? 'Subiendo...' : 'Seleccionar Imagen'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    {nuevoItemForm.imagen_url && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        <i className="fas fa-check-circle mr-1"></i>Imagen seleccionada
                      </span>
                    )}
                  </div>
                  {imageUploadMessage && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      imageUploadMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {imageUploadMessage.type === 'success' ? (
                        <i className="fas fa-check-circle"></i>
                      ) : (
                        <i className="fas fa-exclamation-circle"></i>
                      )}
                      {imageUploadMessage.text}
                    </div>
                  )}
                  {nuevoItemForm.imagen_url && (
                    <div className="mt-2">
                      <img
                        src={nuevoItemForm.imagen_url}
                        alt="Preview"
                        className="h-24 w-24 object-contain border border-gray-200 dark:border-gray-600 rounded-lg"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                {/* Activo checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="nuevo-item-activo"
                    checked={nuevoItemForm.activo}
                    onChange={(e) => setNuevoItemForm({ ...nuevoItemForm, activo: e.target.checked })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nuevo-item-activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Activo
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNuevoItemModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNuevoItem}
                  disabled={!nuevoItemForm.nombre.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <i className="fas fa-save mr-2"></i>Guardar Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
