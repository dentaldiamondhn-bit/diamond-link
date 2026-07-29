import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, X, Loader2, Clock, Check } from 'lucide-react';

interface Reminder {
  id: number;
  user_id: string;
  message: string;
  remind_at: string;
  dismissed: boolean;
  created_at: string;
}

interface Props {
  reminders: Reminder[];
  onAdd: (message: string, remind_at: string) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ReminderPanel({ reminders, onAdd, onDismiss, onDelete }: Props) {
  const [showInput, setShowInput] = useState(false);
  const [message, setMessage] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [busy, setBusy] = useState(false);

  const active = reminders.filter((r) => !r.dismissed);
  const now = new Date();
  const upcoming = active.filter((r) => new Date(r.remind_at) >= now);
  const overdue = active.filter((r) => new Date(r.remind_at) < now);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !remindAt) return;
    setBusy(true);
    const iso = new Date(remindAt).toISOString();
    await onAdd(message.trim(), iso);
    setMessage('');
    setRemindAt('');
    setBusy(false);
    setShowInput(false);
  };

  const renderReminder = (r: Reminder, isOverdue = false) => (
    <div
      key={r.id}
      className={`flex items-start gap-2 px-4 py-2.5 border-b border-gray-50 group hover:bg-gray-50 transition ${
        isOverdue ? 'bg-rose-50' : ''
      }`}
    >
      <Bell size={14} className={`mt-0.5 ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isOverdue ? 'text-rose-700' : 'text-gray-700'}`}>{r.message}</p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <Clock size={11} /> {formatDateTime(r.remind_at)}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => onDismiss(r.id)} className="text-gray-400 hover:text-teal-500 p-1" title="Dismiss">
          <Check size={14} />
        </button>
        <button onClick={() => onDelete(r.id)} className="text-gray-400 hover:text-rose-500 p-1" title="Delete">
          <X size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <Bell size={18} className="text-amber-500" /> Reminders
          {overdue.length > 0 && (
            <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5">{overdue.length}</span>
          )}
        </h3>
        <button onClick={() => setShowInput(!showInput)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition">
          <Plus size={18} />
        </button>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleAdd}
            className="px-4 py-3 border-b border-gray-50 bg-amber-50 overflow-hidden"
          >
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Reminder message..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-amber-500 outline-none text-sm"
            />
            <div className="flex gap-2 mt-2">
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-amber-500 outline-none text-sm"
              />
              <button type="submit" disabled={busy} className="bg-amber-500 text-white px-3 rounded-lg text-sm disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : 'Set'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="max-h-[250px] overflow-y-auto">
        {active.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No active reminders.</div>
        ) : (
          <>
            {overdue.map((r) => renderReminder(r, true))}
            {upcoming.map((r) => renderReminder(r, false))}
          </>
        )}
      </div>
    </div>
  );
}
