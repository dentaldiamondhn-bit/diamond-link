# Estudio Periodontal - Complete Setup & Implementation Specification

## Overview
This document provides a complete technical specification for the **Estudio Periodontal** (Periodontal Study) feature in the Dental Diamond Link application. It covers the UI layout hierarchy, state management architecture, clinical workflow, database schema, API contracts, and implementation patterns following the project's Next.js 15 + TypeScript + Tailwind CSS + Supabase + Clerk stack.

---

## 1. Feature Scope & Clinical Context

### 1.1 Clinical Purpose
The Estudio Periodontal module enables dental professionals to:
- Record comprehensive periodontal charting (probing depths, clinical attachment levels, bleeding on probing, plaque index)
- Document tooth-level measurements for all 32 permanent teeth (FDI notation: 18-48)
- Calculate periodontal indices (Placa Index, Sangrado Index)
- Assess furcation involvement, mobility, and clinical attachment loss
- Create treatment plans (profilaxis, raspaje, cirugía, mantenimiento)
- Maintain historical records per patient with versioning

### 1.2 Target Users
- Periodontists and general dentists
- Dental hygienists (data entry)
- Clinic administrators (reporting)

### 1.3 Regulatory Alignment
- Follows **FDI World Dental Federation** tooth numbering (18-48)
- Compatible with **AAP/EFP 2017 Classification** parameters
- Measurements in **millimeters** (0-20mm range for probing depths)

---

## 2. Database Schema (Supabase/PostgreSQL)

### 2.1 Core Tables

```sql
-- Main periodontal study record
CREATE TABLE estudios_periodontales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES patients(paciente_id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    fecha_estudio DATE NOT NULL DEFAULT CURRENT_DATE,
    indice_placa DECIMAL(5,2),           -- 0-100%
    indice_sangrado DECIMAL(5,2),        -- 0-100%
    nivel_insercion_clinica TEXT,        -- Free text CAL description
    furcaciones VARCHAR(20) DEFAULT 'no-evaluado',
    observaciones_generales TEXT,
    plan_tratamiento JSONB,              -- {profilaxis, raspaje, cirugia, mantenimiento, otro, otroEspecificar}
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_furcaciones CHECK (furcaciones IN ('no-evaluado', 'grado1', 'grado2', 'grado3')),
    CONSTRAINT chk_indices CHECK (indice_placa >= 0 AND indice_placa <= 100),
    CONSTRAINT chk_indices_sangrado CHECK (indice_sangrado >= 0 AND indice_sangrado <= 100)
);

-- Individual tooth measurements (6 sites per tooth: 3 vestibular + 3 palatino/lingual)
CREATE TABLE mediciones_periodontales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudio_id UUID NOT NULL REFERENCES estudios_periodontales(id) ON DELETE CASCADE,
    numero_diente VARCHAR(2) NOT NULL,   -- FDI: '18'-'11', '21'-'28', '38'-'31', '41'-'48'
    
    -- Vestibular (buccal/labial) measurements
    vestibular_mesial DECIMAL(4,1),
    vestibular_medio DECIMAL(4,1),
    vestibular_distal DECIMAL(4,1),
    
    -- Palatino/Lingual measurements
    palatino_mesial DECIMAL(4,1),
    palatino_medio DECIMAL(4,1),
    palatino_distal DECIMAL(4,1),
    
    -- Additional assessments
    movilidad INTEGER DEFAULT 0,         -- 0-3 (Miller classification)
    sangrado BOOLEAN DEFAULT FALSE,      -- BOP (Bleeding on Probing)
    placa BOOLEAN DEFAULT FALSE,         -- Plaque presence
    observaciones_diente TEXT,
    
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_numero_diente CHECK (
        numero_diente IN ('18','17','16','15','14','13','12','11',
                         '21','22','23','24','25','26','27','28',
                         '38','37','36','35','34','33','32','31',
                         '41','42','43','44','45','46','47','48')
    ),
    CONSTRAINT chk_movilidad CHECK (movilidad IN (0,1,2,3)),
    CONSTRAINT chk_mediciones CHECK (
        vestibular_mesial BETWEEN 0 AND 20 AND
        vestibular_medio BETWEEN 0 AND 20 AND
        vestibular_distal BETWEEN 0 AND 20 AND
        palatino_mesial BETWEEN 0 AND 20 AND
        palatino_medio BETWEEN 0 AND 20 AND
        palatino_distal BETWEEN 0 AND 20
    ),
    UNIQUE(estudio_id, numero_diente)
);
```

### 2.2 Indexes
```sql
CREATE INDEX idx_estudios_periodontales_paciente_fecha ON estudios_periodontales(paciente_id, fecha_estudio DESC);
CREATE INDEX idx_estudios_periodontales_doctor_fecha ON estudios_periodontales(doctor_id, fecha_estudio DESC);
CREATE INDEX idx_mediciones_periodontales_estudio ON mediciones_periodontales(estudio_id);
CREATE INDEX idx_mediciones_periodontales_diente ON mediciones_periodontales(numero_diente);
```

### 2.3 RLS Status
**Disabled** - Authorization handled at API route level via Clerk user ID validation.

---

## 3. API Contracts

### 3.1 Base URL
```
/api/estudios-periodontales
```

### 3.2 GET `/api/estudios-periodontales`
**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `paciente_id` | UUID | No | Filter by patient |
| `page` | integer | No | Page number (default: 1) |
| `limit` | integer | No | Items per page (default: 10) |
| `search` | string | No | Search in observaciones_generales |
| `date` | date | No | Filter by exact fecha_estudio |

**Response:**
```typescript
interface EstudiosListResponse {
  data: EstudioPeriodontal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface EstudioPeriodontal {
  id: string;
  paciente_id: string;
  doctor_id: string | null;
  fecha_estudio: string;          // ISO date
  indice_placa: number | null;
  indice_sangrado: number | null;
  nivel_insercion_clinica: string | null;
  furcaciones: 'no-evaluado' | 'grado1' | 'grado2' | 'grado3';
  observaciones_generales: string | null;
  plan_tratamiento: TreatmentPlan;
  creado_en: string;
  actualizado_en: string;
}

interface TreatmentPlan {
  profilaxis: boolean;
  raspaje: boolean;
  cirugia: boolean;
  mantenimiento: boolean;
  otro: boolean;
  otroEspecificar: string;
}
```

### 3.3 POST `/api/estudios-periodontales`
**Request Body:**
```typescript
interface CreateEstudioRequest {
  paciente_id: string;              // Required
  doctor_id?: string | null;
  fecha_estudio: string;            // Required, ISO date
  indice_placa?: number | null;
  indice_sangrado?: number | null;
  nivel_insercion_clinica?: string | null;
  furcaciones?: 'no-evaluado' | 'grado1' | 'grado2' | 'grado3';
  observaciones_generales?: string | null;
  plan_tratamiento?: TreatmentPlan;
  mediciones?: ToothMeasurementInput[];
}

interface ToothMeasurementInput {
  diente: string;                   // FDI notation
  vestibular: { mesial: string; medio: string; distal: string };
  palatino: { mesial: string; medio: string; distal: string };
  movilidad: string;                // '0' | '1' | '2' | '3'
  sangrado: boolean;
  placa: boolean;
  observaciones: string;
}
```

**Response (201):**
```typescript
{ message: 'Estudio periodontal created successfully', data: EstudioPeriodontal }
```

### 3.4 GET `/api/estudios-periodontales/[id]`
**Response:**
```typescript
interface EstudioDetailResponse {
  data: EstudioPeriodontal & {
    patients: { nombre_completo: string };
    doctors: { name: string } | null;
    mediciones_periodontales: MedicionPeriodontal[];
  };
}

interface MedicionPeriodontal {
  id: string;
  estudio_id: string;
  numero_diente: string;
  vestibular_mesial: number | null;
  vestibular_medio: number | null;
  vestibular_distal: number | null;
  palatino_mesial: number | null;
  palatino_medio: number | null;
  palatino_distal: number | null;
  movilidad: number;
  sangrado: boolean;
  placa: boolean;
  observaciones_diente: string | null;
}
```

### 3.5 PUT `/api/estudios-periodontales/[id]`
**Request Body:** Same as POST (partial updates allowed)
**Behavior:** Replaces all tooth measurements (delete + re-insert)

### 3.6 DELETE `/api/estudios-periodontales/[id]`
**Response:** `{ message: 'Estudio periodontal deleted successfully' }`
**Cascade:** Deletes associated `mediciones_periodontales` via FK CASCADE.

---

## 4. UI Layout Hierarchy

### 4.1 Page Structure (`app/(auth)/estudio-periodontal/page.tsx`)

```
EstudioPeriodontal (Suspense wrapper)
└── EstudioPeriodontalContent
    ├── Tab Navigation (Nuevo Estudio | Estudios Guardados)
    │
    ├── [NUEVO ESTUDIO TAB]
    │   ├── Form (onSubmit=handleSubmit)
    │   │   ├── Patient Information Section (grid 3-col)
    │   │   │   ├── Paciente (display or input)
    │   │   │   ├── Fecha (date input)
    │   │   │   └── Odontólogo (text input)
    │   │   │
    │   │   ├── Periodontal Chart Section
    │   │   │   ├── Header: "Chart Periodontal" + "Restaurar Último Diente" button
    │   │   │   └── Table (horizontal scroll)
    │   │   │       ├── Thead: 2-row header
    │   │   │       │   ├── Row 1: Diente | Vestibular (3) | Palatino/Lingual (3) | Movilidad | Sangrado | Placa | Observaciones
    │   │   │       │   └── Row 2: Sub-headers (Mesial/Medio/Distal for each)
    │   │   │       └── Tbody: 32 rows (one per tooth)
    │   │   │           ├── Column 1: Tooth number (delete button)
    │   │   │           ├── Columns 2-4: Vestibular inputs (number, 0-20, step 0.5)
    │   │   │           ├── Columns 5-7: Palatino inputs (number, 0-20, step 0.5)
    │   │   │           ├── Column 8: Movilidad select (0/I/II/III)
    │   │   │           ├── Column 9: Sangrado checkbox
    │   │   │           ├── Column 10: Placa checkbox
    │   │   │           └── Column 11: Observaciones text input
    │   │   │
    │   │   ├── Parámetros Periodontales Section (grid 2-col)
    │   │   │   ├── Índice de Placa (number 0-100, step 0.1)
    │   │   │   ├── Índice de Sangrado (number 0-100, step 0.1)
    │   │   │   ├── Nivel de Inserción Clínica (text)
    │   │   │   └── Furcaciones (select: no-evaluado/grado1/grado2/grado3)
    │   │   │
    │   │   ├── Observaciones Generales (textarea, 3 rows)
    │   │   │
    │   │   ├── Plan de Tratamiento Section
    │   │   │   ├── Checkboxes: Profilaxis, Raspaje, Cirugía, Mantenimiento, Otro
    │   │   │   └── Conditional: "Otro" text input (shown when Otro checked)
    │   │   │
    │   │   └── Action Buttons
    │   │       ├── Volver al Inicio (navigate to /menu-navegacion)
    │   │       ├── Volver (router.back())
    │   │       └── Guardar Estudio (submit, teal primary)
    │
    └── [ESTUDIOS GUARDADOS TAB]
        ├── Search & Filters Bar (grid 3-col)
        │   ├── Search input (fecha or notas)
        │   ├── Date filter (date input)
        │   └── Actualizar button
        │
        ├── Studies Table
        │   ├── Thead: Fecha | Notas | Acciones
        │   └── Tbody: Rows with Ver/Editar/Eliminar actions
        │
        └── Pagination (if totalPages > 1)
```

### 4.2 Responsive Breakpoints
| Component | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| Patient Info Grid | 1-col | 3-col | 3-col |
| Periodontal Chart | Horizontal scroll | Horizontal scroll | Horizontal scroll |
| Parameters Grid | 1-col | 2-col | 2-col |
| Search/Filters | 1-col | 3-col | 3-col |

### 4.3 Dark Mode Support
- All components use `dark:` Tailwind variants
- Backgrounds: `bg-white dark:bg-gray-800`
- Borders: `border-gray-200 dark:border-gray-700`
- Text: `text-gray-900 dark:text-white`
- Inputs: `bg-white dark:bg-gray-700 text-gray-900 dark:text-white`
- Primary actions: `bg-teal-600 hover:bg-teal-700`

---

## 5. State Management Architecture

### 5.1 Local Component State (`EstudioPeriodontalContent`)

```typescript
// Tab state
const [activeTab, setActiveTab] = useState<'nuevo' | 'guardados'>('nuevo');

// Patient context
const [patient, setPatient] = useState<Patient | null>(null);
const [patientLoading, setPatientLoading] = useState(true);

// Form data (study-level)
const [formData, setFormData] = useState<FormData>({
  patientName: '',
  date: string,           // ISO date (today default)
  doctor: '',
  indicePlaca: '',
  indiceSangrado: '',
  nivelInsercion: '',
  furcaciones: 'no-evaluado',
  observacionesGenerales: '',
  profilaxis: false,
  raspaje: false,
  cirugia: false,
  mantenimiento: false,
  otro: false,
  otroEspecificar: ''
});

// Tooth measurements array (32 teeth)
const [toothMeasurements, setToothMeasurements] = useState<ToothMeasurement[]>([]);

// Undo stack for deleted tooth rows
const [deletedRowsStack, setDeletedRowsStack] = useState<DeletedRow[]>([]);

// Saved studies list
const [savedStudies, setSavedStudies] = useState<PeriodontalStudy[]>([]);
const [searchTerm, setSearchTerm] = useState('');
const [dateFilter, setDateFilter] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [loading, setLoading] = useState(false);
```

### 5.2 Type Definitions

```typescript
interface ToothMeasurement {
  diente: string;                           // '18' - '48'
  vestibular: { mesial: string; medio: string; distal: string };
  palatino: { mesial: string; medio: string; distal: string };
  movilidad: string;                        // '0' | '1' | '2' | '3'
  sangrado: boolean;
  placa: boolean;
  observaciones: string;
}

interface FormData {
  patientName: string;
  date: string;
  doctor: string;
  indicePlaca: string;
  indiceSangrado: string;
  nivelInsercion: string;
  furcaciones: 'no-evaluado' | 'grado1' | 'grado2' | 'grado3';
  observacionesGenerales: string;
  profilaxis: boolean;
  raspaje: boolean;
  cirugia: boolean;
  mantenimiento: boolean;
  otro: boolean;
  otroEspecificar: string;
}

interface PeriodontalStudy {
  id: number;
  fecha: string;
  notas: string;
  datos: any;
}

interface DeletedRow {
  row: ToothMeasurement;
  index: number;
}
```

### 5.3 State Initialization Logic

```typescript
// Teeth array in FDI order (quadrants: 1=UR, 2=UL, 3=LL, 4=LR)
const teeth = [
  '18','17','16','15','14','13','12','11',  // Quadrant 1 (Upper Right)
  '21','22','23','24','25','26','27','28',  // Quadrant 2 (Upper Left)
  '38','37','36','35','34','33','32','31',  // Quadrant 3 (Lower Left)
  '41','42','43','44','45','46','47','48'   // Quadrant 4 (Lower Right)
];

// Initialize on mount
useEffect(() => {
  const initialMeasurements: ToothMeasurement[] = teeth.map(tooth => ({
    diente: tooth,
    vestibular: { mesial: '', medio: '', distal: '' },
    palatino: { mesial: '', medio: '', distal: '' },
    movilidad: '0',
    sangrado: false,
    placa: false,
    observaciones: ''
  }));
  setToothMeasurements(initialMeasurements);
  loadSavedStudies();
}, []);
```

### 5.4 State Update Patterns

#### 5.4.1 Form Field Updates (Shallow Merge)
```typescript
const handleInputChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

#### 5.4.2 Nested Tooth Measurement Updates
```typescript
const handleToothMeasurementChange = (toothIndex: number, field: string, value: any) => {
  setToothMeasurements(prev => {
    const updated = [...prev];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      const parentKey = parent as keyof ToothMeasurement;
      const currentValue = updated[toothIndex][parentKey];
      if (typeof currentValue === 'object' && currentValue !== null) {
        updated[toothIndex] = {
          ...updated[toothIndex],
          [parentKey]: { ...currentValue, [child]: value }
        };
      }
    } else {
      updated[toothIndex] = { ...updated[toothIndex], [field]: value };
    }
    return updated;
  });
};
```

#### 5.4.3 Row Deletion with Undo Stack
```typescript
const deleteToothRow = (index: number) => {
  const row = toothMeasurements[index];
  setDeletedRowsStack(prev => [...prev, { row, index }]);
  setToothMeasurements(prev => prev.filter((_, i) => i !== index));
};

const restoreLastDeletedRow = () => {
  if (deletedRowsStack.length > 0) {
    const { row, index } = deletedRowsStack[deletedRowsStack.length - 1];
    setToothMeasurements(prev => {
      const updated = [...prev];
      updated.splice(index, 0, row);
      return updated;
    });
    setDeletedRowsStack(prev => prev.slice(0, -1));
  }
};
```

### 5.5 Derived State (Computed)

```typescript
// Filtered & paginated studies
const filteredStudies = savedStudies.filter(study => {
  const matchesSearch = !searchTerm || 
    study.fecha.includes(searchTerm) || 
    (study.notas && study.notas.toLowerCase().includes(searchTerm.toLowerCase()));
  const matchesDate = !dateFilter || study.fecha === dateFilter;
  return matchesSearch && matchesDate;
});

const studiesPerPage = 5;
const totalPages = Math.ceil(filteredStudies.length / studiesPerPage);
const currentStudies = filteredStudies.slice(
  (currentPage - 1) * studiesPerPage,
  currentPage * studiesPerPage
);
```

---

## 6. Clinical Workflow

### 6.1 New Study Creation Flow

```
1. User navigates to /estudio-periodontal?paciente_id=<uuid>
   │
2. Page loads → PatientService.getPatientById(paciente_id)
   │   ├─ Success: Pre-fill patientName, show patient info card
   │   └─ Error: Show input field for manual patient name entry
   │
3. User completes form sections (any order):
   ├─ Patient Info: Fecha (defaults today), Odontólogo (required)
   ├─ Periodontal Chart: 32 teeth × 6 sites + mobility + BOP + plaque + notes
   │   ├─ Keyboard navigation: Tab through inputs
   │   ├─ Validation: number inputs constrained 0-20, step 0.5
   │   ├─ Delete tooth: Removes row, pushes to undo stack
   │   └─ Restore: Button enabled when undo stack non-empty
   ├─ Parámetros: Índice Placa (0-100), Índice Sangrado (0-100), Nivel Inserción, Furcaciones
   ├─ Observaciones Generales: Free text
   └─ Plan de Tratamiento: Checkbox group + conditional "Otro" text
   │
4. User clicks "Guardar Estudio"
   ├─ Confirmation dialog
   ├─ Validation: paciente_id required (from URL or patient object)
   ├─ POST /api/estudios-periodontales with full payload
   ├─ Success: Alert, reset form, switch to "Estudios Guardados" tab, reload list
   └─ Error: Alert with error message
```

### 6.2 Saved Studies Management Flow

```
1. User clicks "Estudios Guardados" tab
   │
2. loadSavedStudies() fetches from API with filters
   ├─ Query params: page, limit=5, paciente_id, search, date
   └─ Response includes pagination metadata
   │
3. User interactions:
   ├─ Search: Debounced filter on fecha/notas
   ├─ Date filter: Exact date match
   ├─ Pagination: Page buttons + prev/next
   └─ Actions per row:
       ├─ Ver: Alert with ID (placeholder for detail view)
       ├─ Editar: Alert with ID (placeholder for edit mode)
       └─ Eliminar: Confirm → DELETE API → Remove from list → Alert
```

### 6.3 Data Validation Rules

| Field | Client-Side | Server-Side (DB Constraints) |
|-------|-------------|------------------------------|
| `paciente_id` | Required (from URL or patient) | NOT NULL, FK to patients |
| `fecha_estudio` | Required, date input | NOT NULL, DATE |
| `indice_placa` | 0-100, step 0.1 | DECIMAL(5,2), CHECK 0-100 |
| `indice_sangrado` | 0-100, step 0.1 | DECIMAL(5,2), CHECK 0-100 |
| `furcaciones` | Select: 4 options | ENUM CHECK |
| `movilidad` | Select: 0/I/II/III | INTEGER CHECK 0-3 |
| Probing depths | Number 0-20, step 0.5 | DECIMAL(4,1) CHECK 0-20 |
| `sangrado` / `placa` | Checkbox | BOOLEAN DEFAULT FALSE |

---

## 7. Component Architecture

### 7.1 Component Tree

```
EstudioPeriodontalPage (default export)
└── Suspense (fallback: Loading...)
    └── EstudioPeriodontalContent
        ├── TabNavigation (inline)
        ├── PatientInfoCard (inline, conditional)
        ├── PeriodontalChartTable (inline)
        │   ├── ChartHeader (inline)
        │   ├── ChartRow × 32 (mapped from toothMeasurements)
        │   │   ├── ToothNumberCell (delete button)
        │   │   ├── ProbeInput × 6 (vestibular 3 + palatino 3)
        │   │   ├── MobilitySelect
        │   │   ├── BOPCheckbox
        │   │   ├── PlaqueCheckbox
        │   │   └── NotesInput
        │   └── UndoButton (conditional)
        ├── PeriodontalParametersGrid (inline)
        ├── GeneralNotesTextarea (inline)
        ├── TreatmentPlanCheckboxes (inline)
        ├── ActionButtons (inline)
        │
        └── SavedStudiesPanel (conditional, activeTab === 'guardados')
            ├── SearchFiltersBar (inline)
            ├── StudiesTable (inline)
            │   ├── StudyRow × N (mapped from currentStudies)
            │   │   ├── DateCell
            │   │   ├── NotesCell
            │   │   └── ActionButtonsCell (Ver/Editar/Eliminar)
            │   └── EmptyState / LoadingState
            └── Pagination (conditional)
```

### 7.2 Recommended Component Extraction (Future Refactor)

| Component | Props | Responsibility |
|-----------|-------|----------------|
| `PeriodontalChart` | `measurements`, `onChange`, `onDeleteRow`, `onRestore`, `deletedCount` | Full chart table + undo |
| `ToothRow` | `tooth`, `index`, `onChange`, `onDelete` | Single tooth input row |
| `ProbeInput` | `value`, `onChange`, `site` | Number input with validation |
| `PeriodontalParameters` | `formData`, `onChange` | 4-field parameter grid |
| `TreatmentPlan` | `formData`, `onChange` | Checkbox group + conditional input |
| `SavedStudiesList` | `studies`, `onView`, `onEdit`, `onDelete`, `loading` | Table + pagination |
| `StudyFilters` | `searchTerm`, `dateFilter`, `onSearchChange`, `onDateChange`, `onRefresh` | Filter bar |

### 7.3 Custom Hooks (Recommended)

```typescript
// hooks/usePeriodontalChart.ts
export function usePeriodontalChart(initialTeeth?: string[]) {
  const [measurements, setMeasurements] = useState<ToothMeasurement[]>(() => 
    (initialTeeth || DEFAULT_TEETH).map(createEmptyMeasurement)
  );
  const [deletedStack, setDeletedStack] = useState<DeletedRow[]>([]);
  
  const updateMeasurement = useCallback((index, field, value) => { ... }, []);
  const deleteRow = useCallback((index) => { ... }, []);
  const restoreRow = useCallback(() => { ... }, []);
  const reset = useCallback(() => { ... }, []);
  
  return { measurements, updateMeasurement, deleteRow, restoreRow, reset, canUndo: deletedStack.length > 0 };
}

// hooks/useEstudiosPeriodontales.ts
export function useEstudiosPeriodontales(pacienteId?: string) {
  const [studies, setStudies] = useState<PeriodontalStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  
  const load = useCallback(async (params) => { ... }, [pacienteId]);
  const create = useCallback(async (data) => { ... }, []);
  const update = useCallback(async (id, data) => { ... }, []);
  const remove = useCallback(async (id) => { ... }, []);
  
  return { studies, loading, pagination, load, create, update, remove };
}
```

---

## 8. Styling & Design System

### 8.1 Color Palette (Tailwind Config)

```typescript
// tailwind.config.ts additions
colors: {
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    500: '#14b8a6',  // Primary brand
    600: '#0d9488',  // Primary hover
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  // Standard gray scale for dark mode
  gray: { ... }
}
```

### 8.2 Component Classes Reference

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6` | Same |
| Card/Section | `bg-white dark:bg-gray-800 rounded-lg shadow-sm` | Same |
| Table Header | `bg-gray-50 dark:bg-gray-700` | Same |
| Table Row Hover | `hover:bg-gray-50` | `dark:hover:bg-gray-700` |
| Input Base | `border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white` | Same |
| Input Focus | `focus:outline-none focus:ring-2 focus:ring-teal-500` | Same |
| Primary Button | `bg-teal-600 hover:bg-teal-700 text-white` | Same |
| Secondary Button | `border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700` | Same |
| Tab Active | `border-teal-500 text-teal-600 dark:text-teal-400` | Same |
| Tab Inactive | `border-transparent text-gray-500 dark:text-gray-400` | Same |

### 8.3 Spacing Scale
- Section gap: `space-y-6` (1.5rem)
- Form field gap: `gap-4` (1rem) in grids
- Table cell padding: `px-2 py-2` (0.5rem)
- Card padding: `p-6` (1.5rem)

---

## 9. Accessibility (a11y)

### 9.1 Semantic HTML
- `<form>` wraps entire new study section
- `<table>` with proper `<thead>`, `<tbody>`, `<th scope="col">`
- `<label>` for every input (explicit `htmlFor` or wrapping)
- `<fieldset>` + `<legend>` for checkbox groups (Treatment Plan)

### 9.2 Keyboard Navigation
- Tab order follows visual layout (left-to-right, top-to-bottom)
- All interactive elements reachable: inputs, selects, checkboxes, buttons
- Delete tooth buttons: `type="button"` (not submit), focusable
- Undo button: disabled state when stack empty

### 9.3 Screen Reader Support
- Table headers have `scope="col"` and `scope="colgroup"` for grouped headers
- Checkboxes use native `<input type="checkbox">` with labels
- Select elements have descriptive `<option>` values
- Error/success alerts use `alert()` (consider replacing with toast/ARIA live region)

### 9.4 Color Contrast
- Teal-600 on white: 4.5:1+ ✓
- Gray-600 on white: 4.5:1+ ✓
- Dark mode: Teal-400 on gray-800: 4.5:1+ ✓

---

## 10. Performance Considerations

### 10.1 Current Bottlenecks
1. **Large inline component** (918 lines) - impacts bundle size and React DevTools profiling
2. **32 × 11 input fields** = 352 controlled inputs re-rendering on each keystroke
3. **No memoization** - `handleToothMeasurementChange` creates new array on every change
4. **Inline event handlers** in `.map()` - new functions per render

### 10.2 Optimization Recommendations

```typescript
// 1. Memoize tooth rows
const ToothRow = React.memo(({ tooth, index, onChange, onDelete }) => {
  return <tr>...</tr>;
}, (prev, next) => 
  prev.tooth.diente === next.tooth.diente && 
  prev.tooth.vestibular === next.tooth.vestibular && // shallow compare
  prev.tooth.palatino === next.tooth.palatino &&
  prev.tooth.movilidad === next.tooth.movilidad &&
  prev.tooth.sangrado === next.tooth.sangrado &&
  prev.tooth.placa === next.tooth.placa &&
  prev.tooth.observaciones === next.tooth.observaciones
);

// 2. Use useReducer for chart state (batched updates)
const [chartState, dispatch] = useReducer(chartReducer, initialState);

// 3. Virtualize table for large datasets (not needed for 32 rows but good pattern)
// 4. Debounce search/filter in saved studies
```

### 10.3 Bundle Optimization
- Extract `EstudioPeriodontalContent` to separate file
- Lazy-load saved studies tab: `const SavedStudiesTab = lazy(() => import('./SavedStudiesTab'))`
- Move types to `@/types/periodontal.ts`

---

## 11. Testing Strategy

### 11.1 Unit Tests (Jest + React Testing Library)

```typescript
// __tests__/periodontalChart.test.tsx
describe('PeriodontalChart', () => {
  it('renders 32 tooth rows in FDI order', () => {
    render(<PeriodontalChart measurements={mockMeasurements} />);
    expect(screen.getAllByRole('row')).toHaveLength(34); // 2 header + 32 teeth
  });

  it('updates probing depth on input change', () => {
    const onChange = jest.fn();
    render(<PeriodontalChart measurements={mockMeasurements} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('18 vestibular mesial'), { target: { value: '3.5' } });
    expect(onChange).toHaveBeenCalledWith(0, 'vestibular.mesial', '3.5');
  });

  it('deletes row and enables undo', () => {
    const onDelete = jest.fn();
    render(<PeriodontalChart measurements={mockMeasurements} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Delete tooth 18'));
    expect(onDelete).toHaveBeenCalledWith(0);
  });
});

// __tests__/formValidation.test.ts
describe('Form validation', () => {
  it('requires paciente_id for submission', async () => {
    const { result } = renderHook(() => useFormValidation());
    expect(result.current.validate({ paciente_id: '' })).toEqual({ 
      paciente_id: 'Patient is required' 
    });
  });

  it('validates indice_placa range 0-100', () => {
    expect(validateIndicePlaca('101')).toBe('Must be ≤ 100');
    expect(validateIndicePlaca('-1')).toBe('Must be ≥ 0');
    expect(validateIndicePlaca('50.5')).toBeNull();
  });
});
```

### 11.2 Integration Tests (API Routes)

```typescript
// __tests__/api/estudios-periodontales.test.ts
describe('POST /api/estudios-periodontales', () => {
  it('creates study with measurements', async () => {
    const payload = createValidPayload();
    const res = await request(app).post('/api/estudios-periodontales').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.paciente_id).toBe(payload.paciente_id);
    // Verify measurements inserted
    const measurements = await supabase.from('mediciones_periodontales')
      .select('*').eq('estudio_id', res.body.data.id);
    expect(measurements.data).toHaveLength(32);
  });

  it('rejects invalid furcaciones value', async () => {
    const res = await request(app)
      .post('/api/estudios-periodontales')
      .send({ ...validPayload, furcaciones: 'grado4' });
    expect(res.status).toBe(400);
  });

  it('enforces RLS via Clerk auth', async () => {
    const res = await request(app) // no auth header
      .post('/api/estudios-periodontales')
      .send(validPayload);
    expect(res.status).toBe(401);
  });
});
```

### 11.3 E2E Tests (Playwright)

```typescript
// e2e/estudio-periodontal.spec.ts
test('Complete periodontal study workflow', async ({ page }) => {
  await page.goto('/estudio-periodontal?paciente_id=test-uuid');
  
  // Fill patient info
  await page.fill('[name="doctor"]', 'Dr. Smith');
  await page.fill('[name="fecha"]', '2024-01-15');
  
  // Fill chart - first tooth
  await page.fill('input[aria-label="18 vestibular mesial"]', '3');
  await page.fill('input[aria-label="18 vestibular medio"]', '2.5');
  await page.fill('input[aria-label="18 vestibular distal"]', '3');
  await page.check('input[aria-label="18 sangrado"]');
  
  // Fill parameters
  await page.fill('[name="indicePlaca"]', '45.5');
  await page.fill('[name="indiceSangrado"]', '30.2');
  
  // Select treatment
  await page.check('[name="profilaxis"]');
  await page.check('[name="raspaje"]');
  
  // Submit
  await page.click('button:has-text("Guardar Estudio")');
  await page.click('button:has-text("Confirmar")'); // dialog
  
  // Verify redirect to saved studies tab
  await expect(page.locator('text=Estudios Guardados')).toBeVisible();
  await expect(page.locator('text=2024-01-15')).toBeVisible();
});
```

---

## 12. Migration & Deployment Checklist

### 12.1 Database Migration
- [ ] Run `create_estudios_periodontales_tables.sql` via Supabase CLI or dashboard
- [ ] Verify indexes created
- [ ] Confirm RLS disabled (API handles auth)
- [ ] Test cascade delete: delete estudio → measurements removed

### 12.2 Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (for migration script)
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`

### 12.3 Code Deployment
- [ ] Page: `app/(auth)/estudio-periodontal/page.tsx`
- [ ] API: `app/api/estudios-periodontales/route.ts`
- [ ] API: `app/api/estudios-periodontales/[id]/route.ts`
- [ ] Types: Add to `@/types/periodontal.ts` (new file)
- [ ] Services: Add `PeriodontalStudyService` to `@/services/` (optional)

### 12.4 Verification Steps
1. Navigate to `/estudio-periodontal?paciente_id=<valid-uuid>`
2. Verify patient name loads and displays
3. Complete chart for 3-4 teeth
4. Fill indices, furcaciones, treatment plan
5. Click "Guardar Estudio" → confirm success
6. Switch to "Estudios Guardados" tab → verify study appears
7. Test search, date filter, pagination
8. Test delete → confirm removal
9. Test dark mode toggle
10. Test mobile responsiveness (DevTools device toolbar)

---

## 13. Future Enhancements

### 13.1 Phase 2: Visual Chart
- SVG/Canvas-based periodontal chart (graphical tooth diagram)
- Color-coded probing depths (green/yellow/red)
- Quadrant/arch view toggle
- Print-ready chart export (PDF)

### 13.2 Phase 3: Advanced Clinical Features
- **Auto-calculation**: Placa/Sangrado indices from tooth-level BOP/plaque
- **Comparison view**: Side-by-side current vs previous study
- **Risk assessment**: Automated staging/grading per AAP/EFP 2017
- **Treatment planning**: Procedure codes (CDT) linked to plan items
- **Recall management**: Auto-schedule maintenance based on risk level

### 13.3 Phase 4: Integration
- **Odontogram integration**: Link periodontal findings to odontogram teeth
- **HL7/FHIR export**: Interoperability with hospital systems
- **AI-assisted diagnosis**: ML model suggesting staging from measurements
- **Patient portal**: Read-only view for patient education

---

## 14. File Reference Index

| File | Purpose |
|------|---------|
| `app/(auth)/estudio-periodontal/page.tsx` | Main page component (918 lines) |
| `app/api/estudios-periodontales/route.ts` | GET (list) + POST (create) |
| `app/api/estudios-periodontales/[id]/route.ts` | GET (detail) + PUT (update) + DELETE |
| `database/migrations/create_estudios_periodontales_tables.sql` | Schema DDL |
| `database/migrations/run_estudios_periodontales_migration.cjs` | Migration runner |
| `services/patientService.ts` | Patient lookup (used for patient_id resolution) |
| `types/patient.ts` | Patient type definition |
| `lib/supabase.ts` | Client-side Supabase client |
| `utils/supabase/server.ts` | Server-side Supabase client factory |

---

## 15. Implementation Patterns Reference

### 15.1 Clerk Auth in API Routes
```typescript
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ...
}
```

### 15.2 Supabase Server Client
```typescript
import { createSupabaseClient } from '@/utils/supabase/server';

const supabase = createSupabaseClient();
// Uses anon key with Authorization header
```

### 15.3 Patient Ownership Verification
```typescript
const { data: patient } = await supabase
  .from('patients')
  .select('paciente_id')
  .eq('paciente_id', paciente_id)
  .eq('clerk_user_id', userId)
  .single();
```

### 15.4 Error Handling Pattern
```typescript
try {
  const { data, error } = await supabase.from('table').operation();
  if (error) throw new Error(error.message);
  return NextResponse.json({ data });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

---

*Generated: 2024-11-07*  
*Project: Dental Diamond Link*  
*Spec Version: 1.0*