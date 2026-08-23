'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Marca } from '@/types/marcas';

interface Categoria {
  id: string;
  nombre: string;
  subcategorias: { id: string; nombre: string }[];
}

export default function MarcasTab() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [distribuidores, setDistribuidores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Marca | null>(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', tipo: '', subcategoria: '', distribuidor_id: '' });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ nombre: '', subcategorias: [''] });
  const [savingCategoria, setSavingCategoria] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mRes, dRes, cRes] = await Promise.all([
        fetch(`/api/inventario/marcas?_=${Date.now()}`),
        fetch(`/api/inventario/distribuidores?_=${Date.now()}`),
        fetch(`/api/inventario/categorias?_=${Date.now()}`),
      ]);
      if (mRes.ok) setMarcas(await mRes.json());
      if (dRes.ok) setDistribuidores(await dRes.json());
      if (cRes.ok) setCategorias(await cRes.json());
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: '', nombre: '', tipo: '', subcategoria: '', distribuidor_id: '' });
    setShowForm(true);
  };

  const openEdit = (m: Marca) => {
    setEditing(m);
    setForm({
      codigo: m.codigo,
      nombre: m.nombre,
      tipo: m.tipo || '',
      subcategoria: (m as any).subcategoria || '',
      distribuidor_id: m.distribuidor_id || '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) return;
    try {
      const url = editing
        ? `/api/inventario/marcas?id=${editing.id}`
        : '/api/inventario/marcas';
      const method = editing ? 'PUT' : 'POST';
      const body: any = {
        codigo: form.codigo,
        nombre: form.nombre,
        tipo: form.tipo || null,
        subcategoria: form.subcategoria || null,
      };
      if (form.distribuidor_id) body.distribuidor_id = form.distribuidor_id;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await load();
        setShowForm(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error saving marca:', err);
    }
  };

  const deleteMarca = async (m: Marca) => {
    if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/inventario/marcas?id=${m.id}`, { method: 'DELETE' });
      if (res.ok) {
        await load();
      } else {
        const err = await res.json();
        alert(err.error || 'Error desconocido al eliminar');
      }
    } catch (err) {
      console.error('Error deleting marca:', err);
      alert('Error de red al eliminar la marca');
    }
  };

  const saveCategoria = async () => {
    if (!categoryForm.nombre.trim()) return;
    setSavingCategoria(true);
    try {
      const res = await fetch('/api/inventario/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: categoryForm.nombre.trim(),
          subcategorias: categoryForm.subcategorias.filter(s => s.trim()),
        }),
      });
      if (res.ok) {
        const updated = await fetch('/api/inventario/categorias');
        if (updated.ok) setCategorias(await updated.json());
        setShowCategoryModal(false);
        setCategoryForm({ nombre: '', subcategorias: [''] });
      } else {
        const err = await res.json();
        alert(err.error || 'Error al guardar categoría');
      }
    } catch (err) {
      console.error('Error saving categoria:', err);
    } finally {
      setSavingCategoria(false);
    }
  };

  const deleteCategoria = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría y todas sus subcategorías?')) return;
    try {
      const res = await fetch(`/api/inventario/categorias?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = await fetch('/api/inventario/categorias');
        if (updated.ok) setCategorias(await updated.json());
      }
    } catch (err) {
      console.error('Error deleting categoria:', err);
    }
  };

  const filtered = marcas.filter(m =>
    !search ||
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (m.tipo || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.distribuidor?.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedCategoria = categorias.find(c => c.nombre === form.tipo);
  const subcategoriasDisponibles = selectedCategoria?.subcategorias || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar marca, código, tipo o distribuidor..."
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setCategoryForm({ nombre: '', subcategorias: [''] }); setShowCategoryModal(true); }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <i className="fas fa-folder-plus mr-2"></i>Nueva Categoría
          </button>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <i className="fas fa-plus mr-2"></i>Nueva Marca
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcategoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distribuidor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay marcas registradas</td></tr>
              ) : (
                filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 dark:text-white">{m.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{m.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.tipo || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{(m as any).subcategoria || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.distribuidor?.nombre || '-'}</td>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value, subcategoria: '' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                {subcategoriasDisponibles.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategoría</label>
                    <select
                      value={form.subcategoria}
                      onChange={(e) => setForm({ ...form, subcategoria: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Sin subcategoría</option>
                      {subcategoriasDisponibles.map(s => (
                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Distribuidor</label>
                  <select
                    value={form.distribuidor_id}
                    onChange={(e) => setForm({ ...form, distribuidor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Sin distribuidor</option>
                    {distribuidores.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
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

      {/* Nueva Categoría Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowCategoryModal(false)}></div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nueva Categoría</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de Categoría <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryForm.nombre}
                    onChange={(e) => setCategoryForm({ ...categoryForm, nombre: e.target.value })}
                    placeholder="Ej: Cepillo Dental, Hilo Dental"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategorías</label>
                  <div className="space-y-2">
                    {categoryForm.subcategorias.map((sub, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={sub}
                          onChange={(e) => {
                            const updated = [...categoryForm.subcategorias];
                            updated[idx] = e.target.value;
                            setCategoryForm({ ...categoryForm, subcategorias: updated });
                          }}
                          placeholder="Ej: Suave, Medio, Duro"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                        />
                        {categoryForm.subcategorias.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = categoryForm.subcategorias.filter((_, i) => i !== idx);
                              setCategoryForm({ ...categoryForm, subcategorias: updated });
                            }}
                            className="px-2 py-1 text-red-500 hover:text-red-700"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, subcategorias: [...categoryForm.subcategorias, ''] })}
                      className="text-sm text-emerald-600 hover:text-emerald-800"
                    >
                      <i className="fas fa-plus mr-1"></i>Agregar subcategoría
                    </button>
                  </div>
                </div>

                {categorias.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorías existentes</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {categorias.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{c.nombre}</span>
                            {c.subcategorias.length > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                ({c.subcategorias.map(s => s.nombre).join(', ')})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteCategoria(c.id)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300">
                  Cancelar
                </button>
                <button
                  onClick={saveCategoria}
                  disabled={!categoryForm.nombre.trim() || savingCategoria}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingCategoria ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
