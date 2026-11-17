'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, ChevronUp, Download, Printer, Stethoscope, X } from 'lucide-react';
import { useChartStore } from '@/lib/store/useChartStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import type { Patient } from '@/types/patient';

interface GeneralHealthFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'checkbox' | 'select' | 'multi-select';
  options?: string[];
}

interface FormGroup {
  title: string;
  description?: string;
  fields: FormField[];
}

interface FormSection {
  title: string;
  groups: FormGroup[];
}

interface FormStructure {
  form_name: string;
  sections: FormSection[];
}

const DEFAULT_FORM_STRUCTURE = {
  form_name: 'Allgemeingesundheit',
  sections: [
    {
      title: 'Información General',
      groups: [
        {
          title: 'General',
          description: '',
          fields: [
            { name: 'patient_number', label: 'ID del paciente', type: 'text' },
            { name: 'date_saved', label: 'Fecha', type: 'text' },
            { name: 'patient_last_name', label: 'Apellidos', type: 'text' },
            { name: 'patient_first_name', label: 'Nombre', type: 'text' },
            { name: 'patient_dob', label: 'Fecha de nacimiento', type: 'text' },
            { name: 'reevaluation_note', label: 'Nota de reevaluación', type: 'text' },
          ],
        },
      ],
    },
    {
      title: 'Condiciones Médicas Generales',
      groups: [
        {
          title: 'Cardiovascular',
          description: '',
          fields: [
            { name: 'field_blood_pressure', label: 'Presión arterial alta (Hipertensión)', type: 'checkbox' },
            { name: 'field_coronary_disease', label: 'Enfermedad coronaria, infarto o stent', type: 'checkbox' },
            { name: 'field_heart_surgery', label: 'Historial de cirugía cardíaca', type: 'checkbox' },
            { name: 'field_pacemaker', label: 'Marcapasos o desfibrilador (DAI)', type: 'checkbox' },
            { name: 'field_stroke', label: 'Accidente cerebrovascular (Ictus)', type: 'checkbox' },
            { name: 'field_anticoagulants', label: 'Anticoagulantes', type: 'checkbox' },
            { name: 'field_anticoagulant_meds', label: 'Medicación anticoagulante', type: 'text' },
          ],
        },
        {
          title: 'Respiratorio',
          description: '',
          fields: [
            { name: 'field_asthma', label: 'Asma o EPOC', type: 'checkbox' },
            { name: 'field_chronic_cough', label: 'Tos crónica', type: 'checkbox' },
            { name: 'field_sleep_apnea', label: 'Apnea del sueño', type: 'checkbox' },
          ],
        },
        {
          title: 'Digestivo y Urinario',
          description: '',
          fields: [
            { name: 'field_reflux', label: 'Reflujo gastroesofágico', type: 'checkbox' },
            { name: 'field_kidney_disease', label: 'Enfermedad renal crónica', type: 'checkbox' },
            { name: 'field_crohns_colitis', label: 'Enfermedad inflamatoria intestinal', type: 'checkbox' },
          ],
        },
        {
          title: 'Tiroides y Trastornos Hormonales',
          description: '',
          fields: [
            { name: 'field_thyroid_disorder', label: 'Trastorno de la tiroides', type: 'checkbox' },
            { name: 'field_thyroid_medication', label: 'Medicación para tiroides', type: 'text' },
          ],
        },
        {
          title: 'Diabetes Mellitus',
          description: '',
          fields: [
            { name: 'field_diabetes_status', label: 'Diagnóstico de diabetes', type: 'checkbox' },
            { name: 'field_diabetes_type', label: 'Tipo de diabetes', type: 'select', options: ['Tipo 1', 'Tipo 2'] },
            { name: 'field_hba1c_value', label: 'Valor HbA1c (%)', type: 'text' },
            { name: 'field_hba1c_date', label: 'Fecha última HbA1c', type: 'text' },
            { name: 'field_medication_insulin', label: 'Insulina', type: 'checkbox' },
            { name: 'field_medication_oral', label: 'Antidiabéticos orales', type: 'checkbox' },
          ],
        },
        {
          title: 'Cáncer y Oncología',
          description: '',
          fields: [
            { name: 'field_cancer_diagnosis', label: 'Diagnóstico de cáncer', type: 'checkbox' },
            { name: 'field_cancer_type', label: 'Tipo de cáncer', type: 'text' },
            { name: 'field_chemotherapy', label: 'Quimioterapia actual/reciente', type: 'checkbox' },
            { name: 'field_radiotherapy_jaw', label: 'Radioterapia cabeza/cuello', type: 'checkbox' },
          ],
        },
        {
          title: 'Osteoporosis y Salud Ósea',
          description: '',
          fields: [
            { name: 'field_osteoporosis_diag', label: 'Osteoporosis/Osteopenia', type: 'checkbox' },
            { name: 'field_bone_density_loss', label: 'Pérdida densidad ósea (DEXA)', type: 'checkbox' },
            { name: 'field_bisphosphonates_oral', label: 'Bisfosfonatos orales', type: 'checkbox' },
            { name: 'field_bisphosphonates_iv', label: 'Bisfosfonatos IV/antirresortivos', type: 'checkbox' },
            { name: 'field_antiresorptives_inj', label: 'Inyecciones antirresortivas (Denosumab)', type: 'checkbox' },
            { name: 'field_fracture_history', label: 'Historial de fracturas', type: 'checkbox' },
          ],
        },
        {
          title: 'Trastornos de la Sangre',
          description: '',
          fields: [
            { name: 'field_anemia_severe', label: 'Anemia severa', type: 'checkbox' },
            { name: 'field_bleeding_disorder', label: 'Trastorno de coagulación', type: 'checkbox' },
            { name: 'field_platelet_disorder', label: 'Trastorno plaquetario', type: 'checkbox' },
            { name: 'field_leukemia_etc', label: 'Leucemia u otros', type: 'checkbox' },
          ],
        },
        {
          title: 'Embarazo',
          description: '',
          fields: [
            { name: 'field_is_pregnant', label: 'Embarazada', type: 'checkbox' },
            { name: 'field_due_date', label: 'Fecha probable parto', type: 'text' },
            { name: 'field_trimester', label: 'Trimestre', type: 'select', options: ['1.er Trimestre', '2.º Trimestre', '3.er Trimestre'] },
            { name: 'field_breastfeeding', label: 'Lactancia', type: 'checkbox' },
          ],
        },
        {
          title: 'Articulaciones',
          description: '',
          fields: [
            { name: 'field_rheumatoid_arthritis', label: 'Artritis reumatoide', type: 'checkbox' },
            { name: 'field_joint_replacement', label: 'Articulaciones artificiales', type: 'checkbox' },
            { name: 'field_joint_pain_tmj', label: 'Dolor ATM', type: 'checkbox' },
            { name: 'field_cervical_pain', label: 'Problemas cervicales', type: 'checkbox' },
          ],
        },
      ],
    },
    {
      title: 'Medicación',
      groups: [
        {
          title: 'Medicación General',
          description: '',
          fields: [
            { name: 'field_antibiotic_recent', label: 'Antibióticos últimos 3 meses', type: 'checkbox' },
            { name: 'field_antidepressants', label: 'Antidepresivos', type: 'checkbox' },
            { name: 'field_steroid_meds', label: 'Cortisona/Esteroides', type: 'checkbox' },
            { name: 'field_blood_pressure_meds', label: 'Medicación presión arterial', type: 'text' },
            { name: 'field_stomach_medication', label: 'Inhibidores bomba protones', type: 'checkbox' },
            { name: 'field_vitamins_supplements', label: 'Vitaminas/Suplementos', type: 'multi-select', options: ['Vit. C', 'Vit. K', 'Vit. B12', 'Vit. D', 'Ácido Fólico', 'Proteína'] },
            { name: 'field_meds_name_detail', label: 'Nombres y dosis medicamentos', type: 'text' },
            { name: 'field_duration_meds', label: 'Duración tratamiento (años)', type: 'text' },
          ],
        },
      ],
    },
    {
      title: 'Estilo de Vida y Factores de Riesgo',
      groups: [
        {
          title: 'Tabaquismo',
          description: '',
          fields: [
            { name: 'field_smoking_status', label: 'Estado tabaquismo', type: 'select', options: ['Diariamente', 'Ocasionalmente', 'Ex fumador', 'Nunca ha fumado'] },
            { name: 'field_cigarettes_per_day', label: 'Cigarrillos/día', type: 'text' },
            { name: 'field_smoking_since', label: 'Fumador desde (año)', type: 'text' },
            { name: 'field_past_smoker_years', label: 'Años desde dejó fumar', type: 'text' },
            { name: 'field_e_cigarette_hnb', label: 'Cigarrillos electrónicos/HNB', type: 'checkbox' },
            { name: 'field_smokeless_tobacco', label: 'Tabaco sin humo (Snus)', type: 'checkbox' },
          ],
        },
        {
          title: 'Nutrición y Dieta',
          description: '',
          fields: [
            { name: 'field_diet_vegetarian', label: 'Vegetariano', type: 'checkbox' },
            { name: 'field_diet_vegan', label: 'Vegano', type: 'checkbox' },
            { name: 'field_diet_restrictive', label: 'Dieta restrictiva', type: 'checkbox' },
            { name: 'field_sugar_frequency', label: 'Azúcar frecuente (>3/día)', type: 'checkbox' },
            { name: 'field_acid_frequency', label: 'Alimentos ácidos frecuentes', type: 'checkbox' },
            { name: 'field_alcohol_consumption', label: 'Alcohol regular/excesivo', type: 'checkbox' },
            { name: 'field_eating_disorder', label: 'Trastorno conducta alimentaria', type: 'checkbox' },
            { name: 'field_mouth_breathing', label: 'Respiración bucal', type: 'checkbox' },
          ],
        },
        {
          title: 'Condiciones Neurológicas y Psiquiátricas',
          description: '',
          fields: [
            { name: 'field_epilepsy', label: 'Epilepsia/convulsiones', type: 'checkbox' },
            { name: 'field_ms_label', label: 'Esclerosis múltiple/Parkinson', type: 'checkbox' },
            { name: 'field_autism', label: 'Espectro autista/discapacidad', type: 'checkbox' },
            { name: 'field_psych_disorder', label: 'Enfermedad mental', type: 'checkbox' },
            { name: 'field_psychotropic_meds', label: 'Fármacos psicotrópicos', type: 'checkbox' },
            { name: 'field_stress_level', label: 'Estrés crónico/elevado', type: 'checkbox' },
          ],
        },
        {
          title: 'Enfermedades Infecciosas y Estado Inmunológico',
          description: '',
          fields: [
            { name: 'field_hiv_aids', label: 'VIH/SIDA', type: 'checkbox' },
            { name: 'field_hepatitis_b_c', label: 'Hepatitis B/C', type: 'checkbox' },
            { name: 'field_tuberculosis', label: 'Tuberculosis', type: 'checkbox' },
            { name: 'field_tuberculosis_active', label: 'Tuberculosis activa', type: 'checkbox' },
            { name: 'field_immunosuppression_general', label: 'Inmunodeficiencia general', type: 'checkbox' },
            { name: 'field_organ_transplant', label: 'Trasplante de órganos', type: 'checkbox' },
            { name: 'field_recent_transfusion', label: 'Transfusión últimos 6 meses', type: 'checkbox' },
          ],
        },
        {
          title: 'Alergias e Intolerancias',
          description: '',
          fields: [
            { name: 'field_allergy_penicillin', label: 'Alergia penicilina/antibióticos', type: 'checkbox' },
            { name: 'field_allergy_anaesthetic', label: 'Alergia anestésicos locales', type: 'checkbox' },
            { name: 'field_allergy_painkillers', label: 'Alergia analgésicos', type: 'checkbox' },
            { name: 'field_allergy_latex', label: 'Alergia látex', type: 'checkbox' },
            { name: 'field_allergy_iodine', label: 'Alergia yodo', type: 'checkbox' },
            { name: 'field_allergy_metals', label: 'Alergia metales (níquel, titanio)', type: 'checkbox' },
            { name: 'field_allergy_other', label: 'Otras alergias', type: 'text' },
          ],
        },
        {
          title: 'Otros',
          description: '',
          fields: [
            { name: 'field_endocarditis_risk', label: 'Riesgo endocarditis (válvulas, trasplante corazón)', type: 'checkbox' },
            { name: 'field_liver_disease', label: 'Enfermedad hepática crónica', type: 'checkbox' },
            { name: 'field_stomach_ulcer', label: 'Úlcera gástrica', type: 'checkbox' },
            { name: 'field_glaucoma', label: 'Glaucoma/Cataratas', type: 'checkbox' },
            { name: 'field_visual_impairment', label: 'Discapacidad visual/ceguera', type: 'checkbox' },
            { name: 'field_hearing_aids', label: 'Audífono', type: 'checkbox' },
            { name: 'field_unexplained_bleeding', label: 'Sangrado inexplicable/hematomas', type: 'checkbox' },
            { name: 'field_general_notes', label: 'Notas generales', type: 'text' },
          ],
        },
      ],
    },
  ],
};

function GeneralHealthFormModal({ open, onOpenChange, patient = null }: GeneralHealthFormModalProps) {
  const chartData = useChartStore(state => state.chartData);
  const updateField = useChartStore(state => state.updateField);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const structure = useMemo(() => DEFAULT_FORM_STRUCTURE, []);

  useEffect(() => {
    const savedData = chartData.general_health_data;
    if (savedData) {
      try {
        const parsed = typeof savedData === 'string' ? JSON.parse(savedData) : savedData;
        setFormData(parsed);
      } catch {
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [chartData.general_health_data]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleMultiSelectChange = (fieldName: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const current = (prev[fieldName] as string[]) || [];
      const updated = checked ? [...current, option] : current.filter(o => o !== option);
      return { ...prev, [fieldName]: updated };
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('¿Guardar cuestionario de salud?')) return;

    try {
      updateField('general_health_data', formData);
      alert('Cuestionario de salud guardado correctamente');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar el cuestionario');
    }
  }

  const handlePrint = () => {
    window.print();
  }

  const handleDownload = async () => {
    if (!formRef.current || downloading) return;
    setDownloading(true);
    try {
      const svg = await formToSvg(formRef.current);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'general_health_form.svg';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  }

  const toggleGroup = (sectionIndex: number, groupIndex: number) => {
    const key = `${sectionIndex}-${groupIndex}`;
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const isSectionExpanded = (index: number) => expandedSections[index] ?? true;
  const isGroupExpanded = (sectionIndex: number, groupIndex: number) => expandedGroups[`${sectionIndex}-${groupIndex}`] ?? true;

  if (!open) return null;

  const patientInfo = patient
    ? `${patient.nombre_completo} · ${chartData.date || ''}`
    : 'Sin paciente';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Cuestionario de Salud General"
    >
      <div
        className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-400" />
              Cuestionario de Salud General
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {structure.sections.map((section, sectionIndex) => {
              const expanded = isSectionExpanded(sectionIndex);
              return (
                <div key={sectionIndex} className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionIndex)}
                    className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform ${isSectionExpanded(sectionIndex) ? 'rotate-180' : ''}`}
                      />
                      <h3 className="text-base font-semibold text-white">{section.title}</h3>
                    </div>
                  </button>

                  {expanded && (
                    <div className="p-4 space-y-4">
                      {section.groups.map((group, groupIndex) => {
                        const gExpanded = isGroupExpanded(sectionIndex, groupIndex);
                        return (
                          <div key={groupIndex} className="rounded-md border border-white/10 bg-white/[0.02] overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleGroup(sectionIndex, groupIndex)}
                              className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] text-left"
                            >
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  className={`h-4 w-4 text-slate-400 transition-transform ${gExpanded ? 'rotate-180' : ''}`}
                                />
                                <h4 className="text-sm font-medium text-white">{group.title}</h4>
                              </div>
                            </button>

                            {gExpanded && (
                              <div className="p-3 space-y-3 border-t border-white/10">
                                {group.description && (
                                  <p className="text-xs text-slate-500 italic">{group.description}</p>
                                )}
                                {group.fields.map(field => (
                                  <div
                                    key={field.name}
                                    className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 items-center"
                                  >
                                    <label
                                      htmlFor={field.name}
                                      className="text-sm text-slate-300 font-medium"
                                    >
                                      {field.label}
                                    </label>
                                    <div>
                                      {field.type === 'checkbox' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            id={field.name}
                                            name={field.name}
                                            checked={formData[field.name] === true}
                                            onChange={e => handleChange(field.name, e.target.checked)}
                                            className="h-4 w-4 text-teal-400 rounded border-white/20 focus:ring-teal-400"
                                          />
                                          <span className="text-sm text-slate-300">{field.label}</span>
                                        </label>
                                      )}
                                      {field.type === 'text' && (
                                        <input
                                          type="text"
                                          id={field.name}
                                          name={field.name}
                                          value={formData[field.name] || ''}
                                          onChange={e => handleChange(field.name, e.target.value)}
                                          placeholder={field.label}
                                          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                                        />
                                      )}
                                      {field.type === 'select' && (
                                        <select
                                          id={field.name}
                                          name={field.name}
                                          value={formData[field.name] || ''}
                                          onChange={e => handleChange(field.name, e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                                        >
                                          <option value="">Seleccionar...</option>
                                          {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      )}
                                      {field.type === 'multi-select' && (
                                        <div className="flex flex-wrap gap-2">
                                          {field.options?.map(opt => {
                                            const checked = (formData[field.name] as string[])?.includes(opt);
                                            return (
                                              <label key={opt} className="inline-flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  name={`${field.name}[]`}
                                                  value={opt}
                                                  checked={checked}
                                                  onChange={e => handleMultiSelectChange(field.name, opt, e.target.checked)}
                                                  className="h-4 w-4 text-teal-400 rounded border-white/20 focus:ring-teal-400"
                                                />
                                                <span className="text-sm text-slate-300">{opt}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </form>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5 mt-4">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] transition-all"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] transition-all disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {downloading ? 'Descargando...' : 'Descargar SVG'}
              </button>
              <button type="submit" form="general-health-form" className="flex items-center gap-2 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-200 border border-teal-400/35 hover:border-teal-400/60 shadow-[0_0_12px_rgba(45,212,191,0.12)] px-4 py-2 text-sm font-medium transition-all">
                <Camera className="h-4 w-4" />
                Guardar
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08] transition-all"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
      </div>
    </div>
  );
}

async function formToSvg(form: HTMLFormElement): Promise<string> {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const width = 900;
  const lineHeight = 22;
  const padding = 40;

  const lines: string[] = [];
  const formData = new FormData(form);

  function addLine(text: string, indent = 0, bold = false) {
    lines.push(`${'  '.repeat(indent)}${bold ? `<tspan font-weight="bold">${text}</tspan>` : text}`);
  }

  const fieldData: Record<string, any> = {};
  for (const [key, value] of formData.entries()) {
    if (key.endsWith('[]')) {
      const cleanKey = key.slice(0, -2);
      if (!fieldData[cleanKey]) fieldData[cleanKey] = [];
      fieldData[cleanKey].push(value);
    } else {
      fieldData[key] = value === '1' ? true : value;
    }
  }

  for (const section of DEFAULT_FORM_STRUCTURE.sections) {
    addLine(section.title, 0, true);
    for (const group of section.groups) {
      addLine(group.title, 1, true);
      if (group.description) {
        addLine(group.description, 2, false);
      }
      for (const field of group.fields) {
        let displayValue = '';
        if (field.type === 'checkbox') {
          displayValue = fieldData[field.name] === true ? 'Sí' : 'No';
        } else if (field.type === 'multi-select') {
          displayValue = (fieldData[field.name] as string[])?.join(', ') || '—';
        } else {
          displayValue = fieldData[field.name] || '—';
        }
        addLine(`${field.label}: ${displayValue}`, 2);
      }
    }
  }

  const height = Math.max(600, lines.length * lineHeight + padding * 2 + 100);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', '#0c1220');
  svg.appendChild(bg);

  let y = padding;
  const title = document.createElementNS(SVG_NS, 'text');
  title.setAttribute('x', String(padding));
  title.setAttribute('y', String(y));
  title.setAttribute('font-size', '20');
  title.setAttribute('font-weight', 'bold');
  title.setAttribute('font-family', 'Arial, sans-serif');
  title.setAttribute('fill', '#0D9488');
  title.textContent = 'Cuestionario de Salud General';
  svg.appendChild(title);

  y += 35;
  const subtitle = document.createElementNS(SVG_NS, 'text');
  subtitle.setAttribute('x', String(padding));
  subtitle.setAttribute('y', String(y));
  subtitle.setAttribute('font-size', '12');
  subtitle.setAttribute('font-family', 'Arial, sans-serif');
  subtitle.setAttribute('fill', '#6B7280');
  subtitle.textContent = `Paciente: ${formData.get('patient_first_name') || ''} ${formData.get('patient_last_name') || ''}  ·  Fecha: ${formData.get('date_saved') || ''}`;
  svg.appendChild(subtitle);

  y += 25;
  for (const line of lines) {
    if (y > height - padding) break;
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', String(padding));
    textEl.setAttribute('y', String(y));
    textEl.setAttribute('font-size', '13');
    textEl.setAttribute('font-family', 'Arial, sans-serif');
    textEl.setAttribute('fill', '#E5E7EB');
    textEl.innerHTML = line;
    svg.appendChild(textEl);
    y += lineHeight;
  }

  return new XMLSerializer().serializeToString(svg);
}

export { GeneralHealthFormModal };