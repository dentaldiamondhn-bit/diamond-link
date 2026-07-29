'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2, Search } from 'lucide-react';
import type { ClinicEvent } from '@/lib/types-calendar';
import { EVENT_COLORS } from '@/lib/types-calendar';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  dateStr: string | null;
  editingEvent: ClinicEvent | null;
  userId: string;
}

interface Patient {
  paciente_id: string;
  nombre_completo: string;
  telefono?: string;
  email?: string;
}

interface Invitee {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  profileImageUrl?: string | null;
}

export default function EventModal({ open, onClose, onSaved, dateStr, editingEvent, userId }: Props) {
  const [form, setForm] = useState({
    title: '',
    patient_name: '',
    date: '',
    start_time: '09:00',
    end_time: '09:30',
    color: EVENT_COLORS[0].value,
    notes: '',
    description: '',
    location: '',
    event_type: 'appointment' as ClinicEvent['event_type'],
    status: 'scheduled' as ClinicEvent['status'],
    priority: 'medium' as ClinicEvent['priority'],
    reminder_minutes: 30,
    patient_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [showInviteeSearch, setShowInviteeSearch] = useState(false);
  const [inviteeQuery, setInviteeQuery] = useState('');
  const [users, setUsers] = useState<Invitee[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Invitee[]>([]);
  const [inviteesLoading, setInviteesLoading] = useState(false);

  const [reminders, setReminders] = useState<Array<{ id?: string; minutes_before: number }>>([]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setForm({
        title: editingEvent.title || '',
        patient_name: editingEvent.patient_name || '',
        date: editingEvent.date || dateStr || '',
        start_time: editingEvent.start_time || '09:00',
        end_time: editingEvent.end_time || '09:30',
        color: editingEvent.color || EVENT_COLORS[0].value,
        notes: editingEvent.notes || '',
        description: (editingEvent as any).description || '',
        location: (editingEvent as any).location || '',
        event_type: (editingEvent as any).event_type || 'appointment',
        status: (editingEvent as any).status || 'scheduled',
        priority: (editingEvent as any).priority || 'medium',
        reminder_minutes: (editingEvent as any).reminder_minutes ?? 30,
        patient_id: (editingEvent as any).patient_id || '',
      });
      setSelectedPatient((editingEvent as any).patient_id ? { paciente_id: (editingEvent as any).patient_id, nombre_completo: editingEvent.patient_name } as Patient : null);
      setSelectedUsers([]);
      setReminders([{ minutes_before: (editingEvent as any).reminder_minutes ?? 30 }]);
      loadInvitees(editingEvent.id);
      loadReminders(editingEvent.id);
    } else {
      setForm({
        title: '',
        patient_name: '',
        date: dateStr || '',
        start_time: '09:00',
        end_time: '09:30',
        color: EVENT_COLORS[0].value,
        notes: '',
        description: '',
        location: '',
        event_type: 'appointment',
        status: 'scheduled',
        priority: 'medium',
        reminder_minutes: 30,
        patient_id: '',
      });
      setSelectedPatient(null);
      setSelectedUsers([]);
      setReminders([{ minutes_before: 30 }]);
      setDeleteOpen(false);
      setDeleteError('');
      setDeleteSuccess(false);
    }
    setErrors({});
    setSearchQuery('');
    setPatients([]);
    setInviteeQuery('');
  }, [editingEvent, dateStr, open]);

  const loadReminders = async (eventId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}/reminders`, {
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setReminders(data.map((r: any) => ({ id: r.id, minutes_before: r.minutes_before })));
        }
      }
    } catch {
      // ignore
    }
  };

  const loadInvitees = async (eventId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}/invitees`, {
        headers: { 'x-user-id': userId },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUsers(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!showPatientSearch) return;
    if (searchQuery.trim() === '') {
      setPatients([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, showPatientSearch]);

  useEffect(() => {
    if (!showInviteeSearch) return;
    const load = async () => {
      setInviteesLoading(true);
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {
        // ignore
      } finally {
        setInviteesLoading(false);
      }
    };
    load();
  }, [showInviteeSearch]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.patient_name.trim()) e.patient_name = 'Patient name is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.start_time) e.start_time = 'Start time is required';
    if (!form.end_time) e.end_time = 'End time is required';
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      e.end_time = 'End time must be after start time';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const body = {
        ...form,
        title: form.title || `Appointment - ${form.patient_name}`,
      };

      let eventId: number | undefined = editingEvent?.id;

      if (editingEvent?.id) {
        const res = await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ id: editingEvent.id, ...body }),
        });
        if (!res.ok) throw new Error('Failed to update appointment');
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create appointment');
        const created = await res.json();
        eventId = created.id;
      }

      if (eventId) {
        await syncInvitees(eventId);
        await syncReminders(eventId);
      }
      onSaved();
      onClose();
    } catch {
      alert('Failed to save appointment');
    } finally {
      setBusy(false);
    }
  };

  const syncInvitees = async (eventId: number) => {
    try {
      await fetch(`/api/events/${eventId}/invitees`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }
    for (const user of selectedUsers) {
      try {
        await fetch(`/api/events/${eventId}/invitees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({ user_id: user.id, status: 'pending' }),
        });
      } catch {
        // ignore
      }
    }
  };

  const syncReminders = async (eventId: number) => {
    try {
      await fetch(`/api/events/${eventId}/reminders`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore
    }
    for (const r of reminders) {
      if (r.minutes_before > 0) {
        try {
          await fetch(`/api/events/${eventId}/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ minutes_before: r.minutes_before }),
          });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ id: editingEvent.id }),
      });
      setDeleteSuccess(true);
      setTimeout(() => {
        setDeleteOpen(false);
        onClose();
      }, 800);
    } catch {
      setDeleteError('Error al eliminar la cita');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setForm((f) => ({
      ...f,
      patient_id: patient.paciente_id,
      patient_name: patient.nombre_completo,
      title: f.title || `Cita con ${patient.nombre_completo}`,
    }));
    setShowPatientSearch(false);
  };

  const handleRemovePatient = () => {
    setSelectedPatient(null);
    setForm((f) => ({ ...f, patient_id: '', patient_name: '', title: '' }));
  };

  if (!open) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          exit={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">
              {editingEvent ? 'Edit Appointment' : 'New Appointment'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Patient Name *</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={form.patient_name}
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                  className={`flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none ${errors.patient_name ? 'border-rose-400' : ''}`}
                  placeholder="Patient name"
                />
                <button
                  type="button"
                  onClick={() => setShowPatientSearch(true)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Search size={18} />
                </button>
              </div>
              {selectedPatient && (
                <div className="mt-2 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{selectedPatient.nombre_completo}</span>
                  <button type="button" onClick={handleRemovePatient} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              )}
              {errors.patient_name && <p className="text-xs text-rose-500 mt-1">{errors.patient_name}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none resize-none"
                placeholder="Event details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={`mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none ${errors.date ? 'border-rose-400' : ''}`}
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
                  placeholder="Clinic / Room"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Start *</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End *</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
                />
                {errors.end_time && <p className="text-xs text-rose-500 mt-1">{errors.end_time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Color</label>
              <div className="flex gap-2 mt-1">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    className={`w-8 h-8 rounded-full transition ${form.color === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Reminders</span>
                <button
                  type="button"
                  onClick={() => setReminders([...reminders, { minutes_before: 30 }])}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  + Add
                </button>
              </label>
              <div className="mt-2 space-y-2">
                {reminders.map((r, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={r.minutes_before}
                      onChange={(e) => {
                        const next = reminders.slice();
                        next[index] = { ...next[index], minutes_before: parseInt(e.target.value) };
                        setReminders(next);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none text-sm"
                    >
                      <option value={0}>No reminder</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={1440}>1 day</option>
                    </select>
                    {reminders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setReminders(reminders.filter((_, i) => i !== index))}
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Invitees (Optional)</label>
              <button
                type="button"
                onClick={() => setShowInviteeSearch(true)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-left text-sm text-gray-500 hover:bg-gray-50"
              >
                {selectedUsers.length === 0 ? 'Select users to invite...' : `${selectedUsers.length} user(s) selected`}
              </button>
              {selectedUsers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedUsers.map((u) => {
                    const avatarUrl = u.profileImageUrl || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=random`;
                    return (
                      <span key={u.id} className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                        <img
                          src={avatarUrl}
                          alt={`${u.first_name} ${u.last_name}`}
                          className="h-6 w-6 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=random`;
                          }}
                        />
                        <span className="max-w-[120px] truncate">{u.first_name} {u.last_name}</span>
                        <button type="button" onClick={() => setSelectedUsers(selectedUsers.filter((x) => x.id !== u.id))} className="text-gray-400 hover:text-gray-600">
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none resize-none"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : <div />}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
                <button type="submit" disabled={busy} className="bg-teal-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2">
                  {busy && <Loader2 className="animate-spin" size={16} />}
                  {editingEvent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>

      <PatientSearchModal
        isOpen={showPatientSearch}
        onClose={() => setShowPatientSearch(false)}
        onSelectPatient={handlePatientSelect}
      />

      <InviteeSelectModal
        isOpen={showInviteeSearch}
        onClose={() => setShowInviteeSearch(false)}
        selectedUsers={selectedUsers}
        onUsersChange={setSelectedUsers}
      />

      {deleteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Appointment</h3>
            {deleteError && <p className="text-sm text-rose-600 mb-2">{deleteError}</p>}
            {deleteSuccess ? (
              <p className="text-sm text-teal-600 mb-4">Appointment deleted successfully.</p>
            ) : (
              <p className="text-sm text-gray-600 mb-4">Are you sure? This will permanently remove this appointment and its reminders/invitees.</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
              {!deleteSuccess && (
                <button onClick={handleDelete} disabled={deleteLoading} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-700 disabled:opacity-50">
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

const PatientSearchModal = ({ isOpen, onClose, onSelectPatient }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (searchQuery.trim() === '') {
      setPatients([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setPatients(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Search Patient</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
          />
          <div className="mt-3 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-400">Searching...</div>
            ) : patients.length > 0 ? (
              patients.map((p: any) => (
                <button
                  key={p.paciente_id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left p-3 rounded-lg border mb-2 ${selected?.paciente_id === p.paciente_id ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
                >
                  <div className="font-medium text-gray-800">{p.nombre_completo}</div>
                  <div className="text-xs text-gray-500">ID: {p.numero_identidad} • {p.telefono}</div>
                </button>
              ))
            ) : searchQuery.trim() !== '' ? (
              <div className="text-center py-4 text-sm text-gray-400">No patients found</div>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 text-sm font-medium">Cancel</button>
            <button
              onClick={() => {
                if (selected) {
                  onSelectPatient(selected);
                  onClose();
                }
              }}
              disabled={!selected}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
            >
              Select
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const InviteeSelectModal = ({ isOpen, onClose, selectedUsers, onUsersChange }: any) => {
  const [users, setUsers] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/users')
      .then((r) => r.ok ? r.json() : [])
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const toggle = (u: Invitee) => {
    const exists = selectedUsers.find((s: Invitee) => s.id === u.id);
    if (exists) {
      onUsersChange(selectedUsers.filter((s: Invitee) => s.id !== u.id));
    } else {
      onUsersChange([...selectedUsers, u]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        exit={{ scale: 0.95, opacity: 0, filter: 'blur(8px)' }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Invite Users</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 outline-none"
          />
          <div className="mt-3 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-400">Loading users...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-400">No users found</div>
            ) : (
              filtered.map((u) => {
                const isSelected = selectedUsers.some((s: Invitee) => s.id === u.id);
                const avatarUrl = u.profileImageUrl || `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=random`;
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u)}
                    className={`w-full text-left p-3 rounded-lg border mb-2 flex items-center gap-3 ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`${u.first_name} ${u.last_name}`}
                      className="h-9 w-9 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${u.first_name}+${u.last_name}&background=random`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-500">{u.email} {u.role ? `• ${u.role}` : ''}</div>
                    </div>
                    {isSelected && <span className="text-teal-600 text-xs font-medium">Selected</span>}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">Done</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
