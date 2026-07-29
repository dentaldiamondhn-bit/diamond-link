import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Stethoscope, Calendar as CalIcon } from 'lucide-react';
import type { ClinicEvent } from '@/lib/types-calendar';

interface Props {
  dateStr: string | null;
  events: ClinicEvent[];
  onClose: () => void;
  onEditEvent: (event: ClinicEvent) => void;
  onAddEvent: () => void;
}

export default function DayDetail({ dateStr, events, onClose, onEditEvent, onAddEvent }: Props) {
  const dayEvents = dateStr ? events.filter((e) => e.date === dateStr) : [];
  const sorted = [...dayEvents].sort((a, b) => a.start_time.localeCompare(b.start_time));

  const dateLabel = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <AnimatePresence>
      {dateStr && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CalIcon size={18} className="text-teal-500" /> {dateLabel}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{sorted.length} appointment{sorted.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No appointments scheduled.</p>
                <button
                  onClick={onAddEvent}
                  className="text-teal-600 font-medium text-sm hover:bg-teal-50 px-4 py-2 rounded-lg transition"
                >
                  + Add Appointment
                </button>
              </div>
            ) : (
              <>
                {sorted.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEditEvent(e)}
                     className="w-full text-left flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition"
                  >
                    <div className="w-1 rounded-full" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">
                          {e.start_time} – {e.end_time}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{e.patient_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Stethoscope size={11} /> {e.procedure}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User size={11} /> {e.dentist}
                        </span>
                      </div>
                      {e.notes && <p className="text-xs text-gray-400 mt-1 italic truncate">{e.notes}</p>}
                    </div>
                  </button>
                ))}
                <button
                  onClick={onAddEvent}
                   className="w-full text-left px-4 py-3 text-teal-600 font-medium text-sm hover:bg-teal-50 transition"
                >
                  + Add Appointment
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
