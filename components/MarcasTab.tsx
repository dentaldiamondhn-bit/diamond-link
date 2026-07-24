'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Marca } from '@/types/marcas';

export default function MarcasTab() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Marca | null>(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: '' });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario/marcas');
      if (res.ok) setMarcas(await res.json());
    } catch (err) {
      console.error('Error loading marcas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: '', nombre: '', tipo: '' });
    setShowForm(true);
  };

  const openEdit = (m: Marca) => {
    setEditing(m);
    setForm({ codigo: m.codigo, nombre: m.nombre, tipo: m.tipo || '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) return;
    try {
      const url = editing
        ? `/api/inventario/marcas?id=${editing.id}`
        : '/api/inventario/marcas';
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
      console.error('Error saving marca:', err);
    }
  };

  const deleteMarca = async (m: Marca) => {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/inventario/marcas?id=${m.id}`, { method: 'DELETE' });
      if (res.ok) await load();
    } catch (err) {
      console.error('Error deleting marca:', err);
    }
  };

  const filtered = marcas.filter(m =>
    !search ||
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (m.tipo || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar marca, código o tipo..."
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
        />
        <button
          onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <i className="fas fa-plus mr-2"></i>Nueva Marca
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay marcas registradas</td></tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{m.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.tipo || '-'}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button onClick={() => openEdit(m)} className="text-teal-600 hover:text-teal-800 mr-3">
                        <i className="fas fa-edit"></i>
                      </button>
                      <button onClick={() => deleteMarca(m)} className="text-red-600 hover:text-red-800">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowForm(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editing ? 'Editar Marca' : 'Nueva Marca'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: CSU, KORT, CLSU"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">3-4 letras que identifican la marca+tipo</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Colgate, Kin"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo / Categoría</label>
                  <input
                    type="text"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    placeholder="Ej: Cepillo Dental Suave, Pasta Dental"
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
                  disabled={!form.codigo.trim() || !form.nombre.trim()}
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
