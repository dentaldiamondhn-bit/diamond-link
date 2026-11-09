export interface PeriodontalStudy {
  id: number;
  fecha: string;
  notas: string;
  datos: any;
}

export interface ToothMeasurement {
  diente: string;
  vestibular: {
    mesial: string;
    medio: string;
    distal: string;
  };
  palatino: {
    mesial: string;
    medio: string;
    distal: string;
  };
  movilidad: string;
  sangrado: boolean;
  placa: boolean;
  observaciones: string;
}

export interface PeriodontalFormData {
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

export interface DeletedRow {
  row: ToothMeasurement;
  index: number;
}