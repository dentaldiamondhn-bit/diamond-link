'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Distribuidor } from '@/types/distribuidores';

export default function DistribuidoresTab() {
  const [items, setItems] = useState<Distribuidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Distribuidor | null>(null);
  const [form, setForm] = useState({
    nombre: '', contacto: '', telefono: '', email: '',
    direccion: '', marcas_provistas: '', ultimos_items: '', notas: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario/distribuidores');
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error('Error loading distribuidores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ nombre: '', contacto: '', telefono: '', email: '', direccion: '', marcas_provistas: '', ultimos_items: '', notas: '' });
    setShowForm(true);
  };

  const openEdit = (d: Distribuidor) => {
    setEditing(d);
    setForm({
      nombre: d.nombre,
      contacto: d.contacto || '',
      telefono: d.telefono || '',
      email: d.email || '',
      direccion: d.direccion || '',
      marcas_provistas: d.marcas_provistas || '',
      ultimos_items: d.ultimos_items || '',
      notas: d.notas || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    try {
      const url = editing
        ? `/api/inventario/distribuidores?id=${editing.id}`
        : '/api/inventario/distribuidores';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await load();
        setShowForm(false);
      }
    } catch (err) {
      console.error('Error saving distribuidor:', err);
    }
  };

  const deleteDist = async (d: Distribuidor) => {
    if (!confirm(`¿Eliminar "${d.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/inventario/distribuidores?id=${d.id}`, { method: 'DELETE' });
      if (res.ok) await load();
    } catch (err) {
      console.error('Error deleting distribuidor:', err);
    }
  };

  const filtered = items.filter(d =>
    !search ||
    d.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (d.contacto || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.marcas_provistas || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar distribuidor..."
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
        />
        <button
          onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <i className="fas fa-plus mr-2"></i>Nuevo Distribuidor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No hay distribuidores registrados</div>
        ) : (
          filtered.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{d.nombre}</h3>
                  {d.contacto && <p className="text-xs text-gray-500">{d.contacto}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(d)} className="text-teal-600 hover:text-teal-800 text-sm">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button onClick={() => deleteDist(d)} className="text-red-600 hover:text-red-800 text-sm">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {d.telefono && (
                  <p><i className="fas fa-phone mr-2 w-4 text-gray-400"></i>{d.telefono}</p>
                )}
                {d.email && (
                  <p><i className="fas fa-envelope mr-2 w-4 text-gray-400"></i>{d.email}</p>
                )}
                {d.direccion && (
                  <p><i className="fas fa-map-marker-alt mr-2 w-4 text-gray-400"></i>{d.direccion}</p>
                )}
              </div>

              {d.marcas_provistas && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Marcas que provee</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{d.marcas_provistas}</p>
                </div>
              )}

              {d.ultimos_items && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Últimos items comprados</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{d.ultimos_items}</p>
                </div>
              )}

              {d.notas && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400">{d.notas}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowForm(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editing ? 'Editar Distribuidor' : 'Nuevo Distribuidor'}
              </h3>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contacto</label>
                    <input
                      type="text"
                      value={form.contacto}
                      onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
                  <textarea
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marcas que provee</label>
                  <textarea
                    value={form.marcas_provistas}
                    onChange={(e) => setForm({ ...form, marcas_provistas: e.target.value })}
                    rows={2}
                    placeholder="Ej: Colgate, Kin, 3M..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Últimos items comprados</label>
                  <textarea
                    value={form.ultimos_items}
                    onChange={(e) => setForm({ ...form, ultimos_items: e.target.value })}
                    rows={2}
                    placeholder="Ej: Cepillos suaves x100, Pasta x50..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={!form.nombre.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
