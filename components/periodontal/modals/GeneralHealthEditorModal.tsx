'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, List, Plus, RotateCcw, Save, Stethoscope, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui';
import type { Patient } from '@/types/patient';

interface GeneralHealthEditorModalProps {
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

const STORAGE_KEY = 'general_health_form_structure';

const DEFAULT_FORM_STRUCTURE: FormStructure = {
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

const PILL_BASE =
  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors';
const PILL_IDLE = 'border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.12] hover:text-white';
const PILL_ACTIVE = 'border-teal-400/40 bg-teal-500/15 text-teal-300';

function GeneralHealthEditorModal({ open, onOpenChange, patient = null }: GeneralHealthEditorModalProps) {
  const [structure, setStructure] = useState<FormStructure>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return DEFAULT_FORM_STRUCTURE;
        }
      }
    }
    return DEFAULT_FORM_STRUCTURE;
  });
  const [editingOptions, setEditingOptions] = useState<string[]>([]);
  const [editingFieldRef, setEditingFieldRef] = useState<HTMLElement | null>(null);
  const optionsTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleStructureChange = (e: CustomEvent) => {
      setStructure(e.detail);
    };
    document.addEventListener('generalHealthStructureChanged', handleStructureChange as EventListener);
    return () => document.removeEventListener('generalHealthStructureChanged', handleStructureChange as EventListener);
  }, []);

  const saveStructure = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(structure));
    document.dispatchEvent(new CustomEvent('generalHealthStructureChanged', { detail: structure }));
    alert('Configuración guardada correctamente');
  };

  const resetToDefaults = () => {
    if (confirm('¿Restaurar valores predeterminados? Se perderán todas las personalizaciones.')) {
      localStorage.removeItem(STORAGE_KEY);
      setStructure(DEFAULT_FORM_STRUCTURE);
      document.dispatchEvent(new CustomEvent('generalHealthStructureChanged', { detail: DEFAULT_FORM_STRUCTURE }));
      alert('Configuración restaurada a valores predeterminados');
    }
  };

  const addSection = (afterIndex?: number) => {
    const newSection: FormSection = {
      title: 'Nueva Sección',
      groups: [{ title: 'General', description: '', fields: [] }],
    };
    setStructure(prev => {
      const sections = [...prev.sections];
      if (afterIndex === undefined) sections.push(newSection);
      else sections.splice(afterIndex + 1, 0, newSection);
      return { ...prev, sections };
    });
  };

  const removeSection = (index: number) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const addGroup = (sectionIndex: number) => {
    setStructure(prev => {
      const sections = prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, groups: [...s.groups, { title: 'Nueva Grupo', description: '', fields: [] }] } : s
      );
      return { ...prev, sections };
    });
  };

  const removeGroup = (sectionIndex: number, groupIndex: number) => {
    if (!confirm('¿Eliminar este grupo?')) return;
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, groups: s.groups.filter((_, j) => j !== groupIndex) } : s
      ),
    }));
  };

  const addField = (sectionIndex: number, groupIndex: number) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              groups: s.groups.map((g, j) =>
                j === groupIndex ? { ...g, fields: [...g.fields, { name: '', label: '', type: 'text', options: [] }] } : g
              ),
            }
          : s
      ),
    }));
  };

  const removeField = (sectionIndex: number, groupIndex: number, fieldIndex: number) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              groups: s.groups.map((g, j) =>
                j === groupIndex ? { ...g, fields: g.fields.filter((_, k) => k !== fieldIndex) } : g
              ),
            }
          : s
      ),
    }));
  };

  const updateField = (
    sectionIndex: number,
    groupIndex: number,
    fieldIndex: number,
    key: keyof FormField,
    value: any
  ) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              groups: s.groups.map((g, j) =>
                j === groupIndex
                  ? {
                      ...g,
                      fields: g.fields.map((f, k) =>
                        k === fieldIndex ? { ...f, [key]: value } : f
                      ),
                    }
                  : g
              ),
            }
          : s
      ),
    }));
  };

  const updateGroup = (sectionIndex: number, groupIndex: number, key: keyof FormGroup, value: any) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex
          ? {
              ...s,
              groups: s.groups.map((g, j) =>
                j === groupIndex ? { ...g, [key]: value } : g
              ),
            }
          : s
      ),
    }));
  };

  const updateSection = (sectionIndex: number, key: keyof FormSection, value: any) => {
    setStructure(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, [key]: value } : s
      ),
    }));
  };

  const openOptions = (fieldRef: HTMLElement) => {
    const options = fieldRef.getAttribute('data-options');
    setEditingOptions(options ? JSON.parse(options) : []);
    setEditingFieldRef(fieldRef);
  };

  const saveOptions = () => {
    if (editingFieldRef && optionsTextareaRef.current) {
      const options = optionsTextareaRef.current.value
        .split('\n')
        .map(o => o.trim())
        .filter(o => o !== '');
      editingFieldRef.setAttribute('data-options', JSON.stringify(options));
      setEditingOptions([]);
      setEditingFieldRef(null);
    }
  };

  if (!open) return null;

  const renderSections = () => {
    if (structure.sections.length === 0) {
      return (
        <div className="text-center py-8">
          <Button
            id="gh-editor-add-first-section-btn"
            onClick={() => addSection()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir primera sección
          </Button>
        </div>
      );
    }

    return structure.sections.map((section, sIndex) => (
      <div key={sIndex} className="form-section border border-white/10 bg-white/[0.02] rounded-lg overflow-hidden">
        <div className="section-header flex items-center gap-2 p-3 bg-white/[0.02] border-b border-white/10">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab section-drag-handle" aria-label="Mover sección" />
          <button
            type="button"
            className="section-toggle-btn p-1 text-slate-400 hover:text-slate-200"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <input
              type="text"
              className="section-title-input w-full px-2 py-1 text-sm border border-transparent bg-transparent focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 rounded"
              value={section.title}
              onChange={e => updateSection(sIndex, 'title', e.target.value)}
              placeholder="Título de la Sección"
            />
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm remove-section-btn p-1 text-slate-400 hover:text-red-400"
            onClick={() => removeSection(sIndex)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="section-content p-3 space-y-3">
          <div id={`gh-groups-container-${sIndex}`} className="groups-container space-y-3">
            {section.groups.map((group, gIndex) => (
              <div key={gIndex} className="form-group-container border border-white/10 bg-white/[0.02] rounded-lg overflow-hidden">
                <div className="group-header flex items-center gap-2 p-2 bg-white/[0.02] border-b border-white/10">
                  <GripVertical className="h-5 w-5 text-gray-400 cursor-grab group-drag-handle" aria-label="Mover grupo" />
                  <button
                    type="button"
                    className="group-toggle-btn p-1 text-slate-400 hover:text-slate-200"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="flex-1 flex flex-col gap-1 group-title-container">
                    <input
                      type="text"
                      className="group-title-input w-full px-2 py-1 text-sm border border-transparent bg-transparent focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 rounded"
                      value={group.title}
                      onChange={e => updateGroup(sIndex, gIndex, 'title', e.target.value)}
                      placeholder="Nombre del Grupo"
                    />
                    <input
                      type="text"
                      className="group-description-input w-full px-2 py-1 text-sm border border-transparent bg-transparent focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 rounded"
                      value={group.description || ''}
                      onChange={e => updateGroup(sIndex, gIndex, 'description', e.target.value)}
                      placeholder="Descripción"
                    />
                  </div>
                  <div className="group-actions">
                    <button
                      type="button"
                      className="btn btn-danger-group btn-sm remove-group-btn p-1 text-slate-400 hover:text-red-400"
                      onClick={() => removeGroup(sIndex, gIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="group-content p-3 space-y-2">
                  <div id={`gh-group-fields-container-${sIndex}-${gIndex}`} className="group-fields-container space-y-2">
                    {group.fields.map((field, fIndex) => (
                      <div
                        key={fIndex}
                        className="form-field flex items-center gap-2 p-2 bg-white/[0.02] border border-white/10 rounded"
                        data-options={JSON.stringify(field.options || []).replace(/'/g, "&apos;")}
                      >
                        <GripVertical className="h-5 w-5 text-gray-400 cursor-grab form-field-grip" />
                        <input
                          type="text"
                          className="form-control form-field-name-input w-32 px-2 py-1 text-sm rounded-lg border border-white/10 bg-white/[0.04] text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                          placeholder="Nombre técnico"
                          value={field.name}
                          onChange={e => updateField(sIndex, gIndex, fIndex, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-control form-field-label-input w-40 px-2 py-1 text-sm rounded-lg border border-white/10 bg-white/[0.04] text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                          placeholder="Etiqueta"
                          value={field.label}
                          onChange={e => updateField(sIndex, gIndex, fIndex, 'label', e.target.value)}
                        />
                        <select
                          className="form-select form-field-type w-36 px-2 py-1 text-sm rounded-lg border border-white/10 bg-white/[0.04] text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                          value={field.type}
                          onChange={e => updateField(sIndex, gIndex, fIndex, 'type', e.target.value as FormField['type'])}
                        >
                          <option value="text">Campo de Texto</option>
                          <option value="checkbox">Casilla de Verificación</option>
                          <option value="select">Menú Desplegable</option>
                          <option value="multi-select">Selección Múltiple</option>
                        </select>
                        <button
                          type="button"
                          className="btn btn-info-group btn-sm manage-options-btn px-2 py-1 text-xs"
                          onClick={() => openOptions(document.querySelector(`[data-options*="${field.name}"]`) as HTMLElement)}
                          style={{ display: (field.type === 'select' || field.type === 'multi-select') ? 'inline-flex' : 'none' }}
                        >
                          <List className="h-3.5 w-3.5 mr-1" />
                          Opciones
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-group btn-sm remove-field-btn p-1 text-slate-400 hover:text-red-400"
                          onClick={() => removeField(sIndex, gIndex, fIndex)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm add-field-to-group-btn w-full justify-center gap-1"
                    onClick={() => addField(sIndex, gIndex)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir Campo
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm add-group-btn w-full justify-center gap-1"
            onClick={() => addGroup(sIndex)}
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir Grupo
          </button>
        </div>

        <div className="section-actions-bar flex items-center gap-2 p-3 bg-white/[0.02] border-t border-white/10">
          <button
            type="button"
            className="btn btn-primary insert-section-btn flex-1 justify-center gap-1"
            onClick={() => addSection(sIndex)}
          >
            <Plus className="h-3.5 w-3.5" />
            Insertar Sección
          </button>
          <Button onClick={saveStructure} className="flex-1 justify-center gap-1">
            <Save className="h-3.5 w-3.5" />
            Guardar
          </Button>
        </div>
      </div>
    ));
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Editor del Cuestionario de Salud"
        >
          <div
            className="flex h-[min(760px,92vh)] w-[min(1100px,95vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-teal-400" />
                  Editor del Cuestionario de Salud
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

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restaurar Predeterminados
                </Button>
                <Button onClick={saveStructure} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </Button>
              </div>

              <div id="gh-editor-sections-container" className="space-y-4">
                {renderSections()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2.5">
              <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Restaurar Predeterminados
              </Button>
              <Button onClick={saveStructure} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Guardar Configuración
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cerrar
              </Button>
            </div>

            {editingFieldRef && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                onClick={() => { setEditingFieldRef(null); setEditingOptions([]); }}
                role="dialog"
                aria-modal="true"
                aria-label="Gestionar Opciones"
              >
                <div
                  className="relative z-50 w-full max-w-md rounded-lg border border-white/10 bg-slate-950/90 p-6 shadow-xl backdrop-blur-xl"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Gestionar Opciones</h3>
                    <button
                      type="button"
                      onClick={() => { setEditingFieldRef(null); setEditingOptions([]); }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="mb-4 text-sm text-slate-400">
                    Introduzca las opciones para este campo. Cada opción en una nueva línea.
                  </p>
                  <textarea
                    ref={optionsTextareaRef}
                    className="w-full h-48 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-sm text-white focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                    defaultValue={editingOptions.join('\n')}
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setEditingFieldRef(null); setEditingOptions([]); }}>
                      Cancelar
                    </Button>
                    <Button onClick={saveOptions}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export { GeneralHealthEditorModal };