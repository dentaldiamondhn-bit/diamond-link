'use client';

import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { PatientCaseLinkType } from '@/types/chat';
import { PatientService } from '@/services/patientService';
import type { Patient } from '@/types/patient';

interface PatientSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (patient: Patient, linkType: PatientCaseLinkType, scope: Record<string, any>) => void;
  cardKind: PatientCaseLinkType;
}

const CARD_KIND_LABEL: Record<PatientCaseLinkType, string> = {
  consent: 'Patient Contact',
  odontogram: 'Odontogram Snapshot',
  treatment: 'Treatment Summary',
  event: 'Event',
  presupuesto: 'Presupuesto',
  payment: 'Payment',
  general: 'General',
};

export default function PatientSelectionModal({ open, onClose, onSelect, cardKind }: PatientSelectionModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [scope, setScope] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      setResults([]);
      setSelectedPatient(null);
      setScope({});
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    PatientService
      .searchPatients(query.trim())
      .then((data) => {
        if (!cancelled) {
          setResults(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  const title = CARD_KIND_LABEL[cardKind] || 'Patient Card';

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setScope({ includeContact: true, includeTreatments: false, includeOdontogram: false });
  };

  const handleConfirm = () => {
    if (!selectedPatient) return;
    onSelect(selectedPatient, cardKind, scope);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!selectedPatient ? (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patient by name, ID, or record..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto">
              {loading && <p className="py-4 text-center text-sm text-gray-500">Searching...</p>}
              {!loading && results.length === 0 && query.trim() && (
                <p className="py-4 text-center text-sm text-gray-500">No patients found</p>
              )}
              {!loading && results.map((patient) => (
                <button
                  key={patient.paciente_id}
                  type="button"
                  onClick={() => handleSelectPatient(patient)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                    {(patient.nombre_completo || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {patient.nombre_completo}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {patient.numero_identidad} {patient.doctor ? `• ${patient.doctor}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                {(selectedPatient.nombre_completo || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {selectedPatient.nombre_completo}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {selectedPatient.numero_identidad} {selectedPatient.doctor ? `• ${selectedPatient.doctor}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Include</p>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={scope.includeContact ?? true}
                  onChange={(e) => setScope((s) => ({ ...s, includeContact: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Contact info
              </label>
              {cardKind === 'treatment' && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={scope.includeTreatments ?? false}
                    onChange={(e) => setScope((s) => ({ ...s, includeTreatments: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Completed treatments
                </label>
              )}
              {cardKind === 'odontogram' && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={scope.includeOdontogram ?? false}
                    onChange={(e) => setScope((s) => ({ ...s, includeOdontogram: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Odontogram snapshot
                </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
