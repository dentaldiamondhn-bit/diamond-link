'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import AccessDenied from '@/components/AccessDenied';
import LoadingAnimation from '@/components/LoadingAnimation';
import { inventoryApi, InventoryApiError } from '@/services/inventoryApi';
import { isLowStock } from '@/lib/inventory/domain';
import type { InventarioItem, MovimientoInventario } from '@/types/inventario';
import type { Marca } from '@/types/marcas';
import HeaderActions from './components/HeaderActions';
import ItemsTab from './components/tabs/ItemsTab';
import MovementsTab, { type MovementFilters } from './components/tabs/MovementsTab';
import ReportsTab from './components/tabs/ReportsTab';
import BrandsTab from './components/tabs/BrandsTab';
import DistributorsTab from './components/tabs/DistributorsTab';
import ItemFormModal from './components/modals/ItemFormModal';
import AddStockModal from './components/modals/AddStockModal';
import MovementModal from './components/modals/MovementModal';

type ActiveTab = 'inventario' | 'movimientos' | 'reportes' | 'marcas' | 'distribuidores';

type ModalState =
  | { type: 'item'; item: InventarioItem | null }
  | { type: 'addStock'; item: InventarioItem | null }
  | { type: 'movement'; item: InventarioItem | null; movementType: 'entrada' | 'salida' };

function errorMessage(error: unknown): string {
  if (error instanceof InventoryApiError || error instanceof Error) return error.message;
  return 'Error desconocido';
}

export default function InventarioPage() {
  const { userRole, isLoaded } = useRoleBasedAccess();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inventario');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [marcasList, setMarcasList] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [movimientosLoading, setMovimientosLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [movFilters, setMovFilters] = useState<MovementFilters>({
    accion: '',
    tipo: '',
    inventario_id: '',
  });

  const stockBajoCount = inventario.filter(isLowStock).length;

  const refreshInventario = useCallback(async () => {
    try {
      const items = await inventoryApi.listItems();
      setInventario(items);
      setError(null);
    } catch (err) {
      setError(`No se pudo cargar el inventario: ${errorMessage(err)}`);
    }
  }, []);

  const refreshMarcas = useCallback(async () => {
    try {
      const brands = await inventoryApi.listBrands();
      setMarcasList(brands as unknown as Marca[]);
    } catch (err) {
      setError(`No se pudieron cargar las marcas: ${errorMessage(err)}`);
    }
  }, []);

  const loadMovimientos = useCallback(async () => {
    setMovimientosLoading(true);
    try {
      const data = await inventoryApi.listMovements({
        tipo: movFilters.tipo || undefined,
        inventario_id: movFilters.inventario_id || undefined,
        accion: movFilters.accion || undefined,
        limit: 100,
      });
      setMovimientos(data);
      setError(null);
    } catch (err) {
      setError(`No se pudieron cargar los movimientos: ${errorMessage(err)}`);
    } finally {
      setMovimientosLoading(false);
    }
  }, [movFilters]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([inventoryApi.listItems(), inventoryApi.listBrands()])
      .then(([items, brands]) => {
        if (cancelled) return;
        setInventario(items);
        setMarcasList(brands as unknown as Marca[]);
      })
      .catch((err) => {
        if (!cancelled) setError(`No se pudo cargar el inventario: ${errorMessage(err)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'movimientos') return;
    void loadMovimientos();
  }, [activeTab, loadMovimientos]);

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([refreshInventario(), loadMovimientos()]);
  }, [refreshInventario, loadMovimientos]);

  const openNewItem = () => {
    void refreshMarcas();
    setModal({ type: 'item', item: null });
  };

  const openEditItem = (item: InventarioItem) => {
    setModal({ type: 'item', item });
  };

  const openAddStock = (item: InventarioItem) => {
    setModal({ type: 'addStock', item });
  };

  const openMovement = (movementType: 'entrada' | 'salida', item: InventarioItem | null = null) => {
    setModal({ type: 'movement', item, movementType });
  };

  const deleteInventario = async (item: InventarioItem) => {
    const name = item.nombre || item.insumo?.nombre || 'item';
    if (!confirm(`¿Eliminar "${name}" del inventario?`)) return;
    try {
      await inventoryApi.deleteItem(item.id);
      await refreshAfterMutation();
    } catch (err) {
      alert('Error al eliminar: ' + errorMessage(err));
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0a0e17] dark:text-slate-100 -m-4 sm:-m-6 p-4 sm:p-6 transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px]"></div>
      </div>
      <div className="relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {inventario.length} items registrados | {stockBajoCount} con stock bajo
        </p>
        <HeaderActions
          visible={activeTab === 'inventario'}
          onOpenNewItem={openNewItem}
          onOpenAddStock={() => openMovement('entrada')}
        />
      </div>

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <span><i className="fas fa-exclamation-circle mr-2"></i>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <div className="mb-6">
        <nav className="flex space-x-2 overflow-x-auto no-scrollbar whitespace-nowrap snap-x pb-2">
          <button
            onClick={() => setActiveTab('inventario')}
            className={`snap-start rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
              activeTab === 'inventario'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <i className="fas fa-boxes mr-2"></i>Inventario
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`snap-start rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
              activeTab === 'movimientos'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <i className="fas fa-history mr-2"></i>Movimientos
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`snap-start rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
              activeTab === 'reportes'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <i className="fas fa-chart-pie mr-2"></i>Reportes
          </button>
          <button
            onClick={() => setActiveTab('marcas')}
            className={`snap-start rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
              activeTab === 'marcas'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <i className="fas fa-tag mr-2"></i>Marcas
          </button>
          <button
            onClick={() => setActiveTab('distribuidores')}
            className={`snap-start rounded-xl px-4 py-2 text-sm transition-all duration-300 ${
              activeTab === 'distribuidores'
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <i className="fas fa-truck mr-2"></i>Distribuidores
          </button>
        </nav>
      </div>

      {activeTab === 'inventario' && (
        <ItemsTab
          items={inventario}
          onEdit={openEditItem}
          onAddStock={openAddStock}
          onDelete={deleteInventario}
        />
      )}

      {activeTab === 'movimientos' && (
        <MovementsTab
          movements={movimientos}
          items={inventario}
          loading={movimientosLoading}
          filters={movFilters}
          onFilterChange={(patch) => setMovFilters((prev) => ({ ...prev, ...patch }))}
          onNewMovement={(tipo) => openMovement(tipo)}
        />
      )}

      {activeTab === 'reportes' && <ReportsTab items={inventario} />}

      {activeTab === 'marcas' && <BrandsTab />}

      {activeTab === 'distribuidores' && <DistributorsTab />}

      {modal?.type === 'item' && (
        <ItemFormModal
          item={modal.item}
          brands={marcasList}
          onClose={() => setModal(null)}
          onSaved={refreshAfterMutation}
        />
      )}

      {modal?.type === 'addStock' && (
        <AddStockModal
          item={modal.item}
          items={inventario}
          onClose={() => setModal(null)}
          onSaved={refreshAfterMutation}
        />
      )}

      {modal?.type === 'movement' && (
        <MovementModal
          items={inventario}
          initialItem={modal.item}
          initialType={modal.movementType}
          onClose={() => setModal(null)}
          onSaved={refreshAfterMutation}
        />
      )}
      </div>
    </div>
  );
}
