import { Patient } from '../types/patient';
import { Consentimiento } from './consentimientoService';
import { Odontogram, OdontogramData } from '../types/odontogram';

const ODONT_CUADRANTES = ['mesial', 'distal', 'buccal', 'lingual'] as const;
type OdontCuadrante = typeof ODONT_CUADRANTES[number];

const ODONT_ESTADOS = [
  { key: "abfraccion", label: "Abfracción", color: "#BA68C8" },
  { key: "abrasion", label: "Abrasión", color: "#4FC3F7" },
  { key: "amalgama", label: "Restauración Amalgama", color: "#607D8B" },
  { key: "apilado", label: "Apiñamiento", color: "#455A64" },
  { key: "atricion", label: "Atrición", color: "#FFD54F" },
  { key: "ausente", label: "Ausente", color: "#9E9E9E" },
  { key: "carilla", label: "Carilla", color: "#00BCD4" },
  { key: "cariado", label: "Cariado", color: "#FF5722" },
  { key: "caries-restauracion", label: "Restauración con Caries", color: "#FFC107" },
  { key: "corona", label: "Corona", color: "#795548" },
  { key: "endodoncia", label: "Endodoncia", color: "#5D4037" },
  { key: "erosion", label: "Erosión", color: "#FF8A65" },
  { key: "erupcion", label: "En Erupción", color: "#FF7043" },
  { key: "extraccionind", label: "Extracción indicada", color: "#E91E63" },
  { key: "fistula", label: "Fístula", color: "#7E57C2" },
  { key: "fracturado", label: "Fracturado", color: "#FF9800" },
  { key: "implante", label: "Implante", color: "#3F51B5" },
  { key: "movilidad", label: "Movilidad", color: "#FDD835" },
  { key: "obturado", label: "Obturado", color: "#2196F3" },
  { key: "odontopatia", label: "Odontopatía", color: "#CDDC39" },
  { key: "protesis", label: "Prótesis", color: "#8D6E63" },
  { key: "raiz", label: "Raíz Residual", color: "#5E35B1" },
  { key: "resina", label: "Restauración Resina", color: "#8BC34A" },
  { key: "sano", label: "Sano", color: "#FFFFFF" },
  { key: "sellante", label: "Sellante", color: "#26C6DA" },
  { key: "temporal", label: "Restauración Temporal", color: "#9C27B0" },
  { key: "txpulpar", label: "Trat. pulpar", color: "#1976D2" }
];

const ODONT_ESTADOS_OLEARY = [
  { key: "sano", label: "Sano", color: "#FFFFFF" },
  { key: "placa", label: "Placa", color: "#FFEB3B" },
  { key: "ausente", label: "Ausente", color: "#000000" }
];

const ODONT_ADULT_QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41]
};

const ODONT_CHILD_QUADRANTS = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81]
};

const ODONT_MORDIDAS_LABELS: Record<string, string> = {
  mordida_abierta_anterior: 'Mordida abierta anterior',
  mordida_abierta_posterior: 'Mordida abierta posterior',
  mordida_cruzada_anterior: 'Mordida cruzada anterior',
  mordida_cruzada_posterior: 'Mordida cruzada posterior',
  mordida_bis_a_bis: 'Mordida bis a bis'
};

const ODONT_GINGIVITIS_LABELS: Record<string, string> = {
  gingivitis_generalizada: 'Gingivitis generalizada',
  gingivitis_localizada: 'Gingivitis localizada',
  gingivitis_embarazo: 'Gingivitis por embarazo',
  periodontitis: 'Periodontitis'
};

const ODONT_QUADRANT_ANGLES: Record<OdontCuadrante, [number, number]> = {
  mesial: [45, 135],
  buccal: [135, 225],
  lingual: [225, 315],
  distal: [315, 405]
};

const odontDefaultCuadrantes = (): Record<OdontCuadrante, string> => ({
  mesial: 'sano',
  distal: 'sano',
  buccal: 'sano',
  lingual: 'sano'
});

const odontPieSlicePath = (startAngle: number, endAngle: number, r: number): string => {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = r * Math.cos(startRad);
  const y1 = r * Math.sin(startRad);
  const x2 = r * Math.cos(endRad);
  const y2 = r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

export class ExportService {
  static async exportToPDF(patient: Patient, consentimientos?: Consentimiento[], odontogram?: Odontogram | null): Promise<void> {
    const printContent = this.generatePrintContent(patient, consentimientos || [], odontogram);

    // Use a hidden iframe instead of window.open for PWA/mobile browser compatibility
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      alert('No se pudo generar el documento para imprimir');
      return;
    }

    doc.open();
    doc.write(printContent);
    doc.close();

    const doPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };

    // Some mobile browsers fire load immediately; fall back to a timeout to ensure content is ready
    iframe.onload = doPrint;
    setTimeout(doPrint, 600);

    // Remove the iframe after the print dialog is handled
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 5000);
  }

  static exportToHTML(patient: Patient, consentimientos?: Consentimiento[], odontogram?: Odontogram | null): void {
    const htmlContent = this.generatePrintContent(patient, consentimientos || [], odontogram);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `paciente_${patient.paciente_id}_${patient.nombre_completo.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static exportToJSON(patient: Patient): void {
    const jsonData = JSON.stringify(patient, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `paciente_${patient.paciente_id}_${patient.nombre_completo.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static generatePrintContent(patient: Patient, consentimientos: Consentimiento[] = [], odontogram?: Odontogram | null): string {
    const field = (label: string, value: string | number | null | undefined, fallback = 'N/A') => `
        <div class="field">
            <span class="field-label">${label}:</span>
            <span class="field-value">${value || fallback}</span>
        </div>`;

    const consentPages = this.generateConsentPages(consentimientos, patient);
    const odontogramSection = this.generateOdontogramSection(odontogram);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historia Clínica - ${patient.nombre_completo}</title>
    <style>
        @page {
            size: Letter;
            margin: 16mm 14mm;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.5;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0a4d4a;
            padding-bottom: 14px;
            margin-bottom: 24px;
        }
        .header h1 {
            color: #0a4d4a;
            font-size: 22px;
            margin: 0 0 4px;
        }
        .header h2 {
            font-size: 17px;
            margin: 0 0 6px;
            color: #222;
        }
        .header p {
            margin: 0;
            font-size: 12px;
            color: #666;
        }
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }
        .section {
            margin-bottom: 18px;
            padding: 14px 16px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background: #f9f9f9;
            page-break-inside: avoid;
        }
        .section h2 {
            color: #0a4d4a;
            font-size: 15px;
            margin: 0 0 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .subtitle {
            color: #0a4d4a;
            font-size: 13px;
            margin: 12px 0 6px;
            border-bottom: 1px dotted #ddd;
            padding-bottom: 3px;
        }
        .field {
            margin-bottom: 6px;
            font-size: 13px;
        }
        .field-label {
            font-weight: bold;
            color: #555;
        }
        .field-value {
            margin-left: 8px;
            color: #222;
        }
        .signature {
            border: 1px solid #ccc;
            padding: 10px;
            margin-top: 8px;
            text-align: center;
            background: #fff;
        }
        .signature img {
            max-width: 280px;
            max-height: 140px;
        }
        .consent-page {
            page-break-before: always;
            margin-top: 0;
        }
        .consent-page .header {
            border-bottom: 3px solid #0a4d4a;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }
        .consent-title {
            text-align: center;
            color: #0a4d4a;
            font-size: 18px;
            font-weight: bold;
            margin: 0 0 4px;
        }
        .consent-subtitle {
            text-align: center;
            font-size: 13px;
            color: #666;
            margin: 0 0 6px;
        }
        .consent-content {
            line-height: 1.7;
            font-size: 15px;
            color: #222;
        }
        .consent-content p {
            margin: 0 0 10px;
        }
        .consent-field {
            display: inline-block;
            border-bottom: 2px solid #333;
            padding: 0 5px;
            min-width: 180px;
        }
        .consent-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 50px;
        }
        .consent-signature-box {
            text-align: center;
        }
        .consent-signature-box img {
            max-width: 260px;
            max-height: 120px;
            margin-bottom: 6px;
        }
        .consent-signature-line {
            border-bottom: 2px solid #333;
            height: 60px;
            margin-bottom: 6px;
        }
        .consent-signature-label {
            font-size: 12px;
            color: #555;
            font-weight: bold;
        }
        .consent-estado {
            text-align: right;
            font-size: 11px;
            color: #888;
            margin-top: 10px;
        }
        .odontogram-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
        }
        .odontogram-badge-teal {
            background: #ccfbf1;
            color: #134e4a;
        }
        .odontogram-badge-gray {
            background: #f3f4f6;
            color: #374151;
        }
        .odontogram-badge-green {
            background: #dcfce7;
            color: #166534;
        }
        .odontogram-fecha {
            font-size: 12px;
            color: #6b7280;
            margin: 0 0 12px;
        }
        .odontogram-chart {
            background: #ffffff;
            border-radius: 12px;
            padding: 16px;
            width: 100%;
            box-sizing: border-box;
        }
        .odontogram-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: nowrap;
        }
        .odontogram-row + .odontogram-row {
            margin-top: 8px;
        }
        .odontogram-legend {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 8px;
            margin-top: 16px;
        }
        .odontogram-legend-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            border-radius: 999px;
            border: 1px solid #ddd;
            background: #f9f9f9;
            font-size: 11px;
            font-weight: 600;
            color: #222;
        }
        .odontogram-swatch {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }
        .odontogram-section {
            margin-top: 16px;
        }
        .odontogram-section h4 {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 8px;
        }
        .odontogram-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .odontogram-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            border-radius: 999px;
            border: 1px solid #ddd;
            background: #f4f4f4;
            font-size: 11px;
            color: #444;
        }
        .odontogram-chip-check {
            color: #0f766e;
            font-weight: bold;
        }
        .odontogram-chip-warn {
            color: #b45309;
            font-weight: bold;
        }
        .odontogram-notas {
            margin-top: 16px;
            padding: 12px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        .odontogram-notas h4 {
            font-size: 13px;
            font-weight: 600;
            color: #374151;
            margin: 0 0 6px;
        }
        .odontogram-notas p {
            font-size: 13px;
            color: #4b5563;
            margin: 0;
            white-space: pre-wrap;
        }
        .odontogram-nota-count {
            margin-top: 12px;
            font-size: 12px;
            color: #6b7280;
        }
        .footer {
            text-align: center;
            color: #888;
            font-size: 11px;
            margin-top: 24px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Historia Clínica Odontológica</h1>
        <h2>${patient.nombre_completo}</h2>
        <p>ID: ${patient.paciente_id} | Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
    </div>

    <div class="section">
        <h2>Datos Personales</h2>
        <div class="grid-2">
            <div>
                ${field('Nombre Completo', patient.nombre_completo)}
                ${field('Tipo de Identificación', patient.tipo_identificacion)}
                ${field('Número de Identidad', patient.numero_identidad)}
                ${field('Fecha de Nacimiento', patient.fecha_nacimiento)}
                ${field('Edad', patient.edad ? patient.edad + ' años' : '')}
                ${field('Sexo', patient.sexo)}
                ${field('Tipo de Sangre', patient.tipo_sangre)}
                ${field('Escolaridad', patient.escolaridad)}
                ${field('Estado Civil', patient.estado_civil)}
            </div>
            <div>
                ${field('Teléfono', patient.telefono)}
                ${field('Email', patient.email)}
                ${field('Dirección', patient.direccion)}
                ${field('Contacto de Emergencia', patient.contacto_emergencia)}
                ${field('Teléfono de Emergencia', patient.contacto_telefono)}
                ${field('Doctor', patient.doctor)}
                ${field('Fecha de Inicio', patient.fecha_inicio)}
                ${field('Seguro', patient.seguro)}
                ${field('Póliza', patient.poliza)}
            </div>
        </div>
        ${((patient.edad && patient.edad < 18) || patient.representante_legal) ? `
        <div class="subtitle">Representante Legal</div>
        ${field('Nombre del Representante', patient.representante_legal)}
        ${field('Parentesco', patient.parentesco)}
        ${field('Teléfono del Representante', patient.rep_celular)}
        ` : ''}
    </div>

    <div class="section">
        <h2>Antecedentes Médicos</h2>
        ${field('Enfermedades', patient.enfermedades || 'Ninguna')}
        ${field('Alergias', patient.alergias || 'Ninguna')}
        ${field('Medicamentos', patient.medicamentos || 'Ninguno')}
        ${field('Hospitalizaciones', patient.hospitalizaciones || 'Ninguna')}
        ${field('Cirugías', patient.cirugias || 'Ninguna')}
        ${patient.embarazo ? field('Embarazo', patient.embarazo === 'si' ? 'Sí' : 'No') : ''}
        ${field('Antecedentes Familiares', patient.antecedentes_familiares || 'Ninguno')}
        ${field('Vacunas', patient.vacunas)}
        ${field('Observaciones Médicas', patient.observaciones_medicas)}
    </div>

    <div class="section">
        <h2>Hábitos</h2>
        <div class="grid-2">
            <div>
                ${field('Fuma', patient.fuma === 'si' ? 'Sí' : 'No')}
                ${patient.fuma_cantidad ? field('Cantidad (cigarrillos/día)', patient.fuma_cantidad) : ''}
                ${patient.fuma_frecuencia ? field('Frecuencia', patient.fuma_frecuencia) : ''}
                ${field('Alcohol', patient.alcohol === 'si' ? 'Sí' : 'No')}
                ${patient.alcohol_frecuencia ? field('Frecuencia', patient.alcohol_frecuencia) : ''}
                ${field('Drogas', patient.drogas === 'si' ? 'Sí' : 'No')}
                ${patient.tipo_droga ? field('Tipo de Droga', patient.tipo_droga) : ''}
                ${patient.drogas_frecuencia ? field('Frecuencia', patient.drogas_frecuencia) : ''}
            </div>
            <div>
                ${field('Café', patient.cafe === 'si' ? 'Sí' : 'No')}
                ${patient.cantidad_tazas ? field('Tazas al día', patient.cantidad_tazas) : ''}
                ${patient.cafe_frecuencia ? field('Frecuencia', patient.cafe_frecuencia) : ''}
                ${field('Objetos duros', patient.objetos === 'si' ? 'Sí' : 'No')}
                ${patient.morder ? field('Morderse', patient.morder) : ''}
                ${field('Bruxismo', patient.bruxismo === 'si' ? 'Sí' : 'No')}
                ${patient.tipo_bruxismo ? field('Tipo de bruxismo', patient.tipo_bruxismo) : ''}
                ${field('Visitas al dentista', patient.visitas_dentista)}
            </div>
        </div>
        ${patient.obsgen ? field('Observaciones generales', patient.obsgen) : ''}
    </div>

    <div class="section">
        <h2>Evaluación Odontológica</h2>
        ${field('Motivo de consulta', patient.motivo)}
        ${patient.historial ? field('Historial dental previo', patient.historial) : ''}
        <div class="grid-2">
            <div>
                ${field('Sangrado de encías', patient.encias === 'si' ? 'Sí' : 'No')}
                ${patient.sangrado_encia ? field('Tipo de sangrado de encía', patient.sangrado_encia) : ''}
                ${field('Dolor al masticar', patient.dolor === 'si' ? 'Sí' : 'No')}
                ${patient.dolor_masticar ? field('Tipo de dolor', patient.dolor_masticar) : ''}
                ${field('Dolor de cabeza frecuente', patient.dolor_cabeza === 'si' ? 'Sí' : 'No')}
                ${patient.dolor_cabeza_detalle ? field('Tipo de dolor de cabeza', patient.dolor_cabeza_detalle) : ''}
                ${field('Chasquidos mandibulares', patient.chasquidos === 'si' ? 'Sí' : 'No')}
                ${patient.chasquidos_mandibulares ? field('Tipo de chasquidos mandibulares', patient.chasquidos_mandibulares) : ''}
                ${field('Dolor de oído frecuente', patient.dolor_oido === 'si' ? 'Sí' : 'No')}
                ${patient.dolor_oido_detalle ? field('Tipo de dolor de oído', patient.dolor_oido_detalle) : ''}
                ${field('Succión digital', patient.suction_digital === 'si' ? 'Sí' : 'No')}
            </div>
            <div>
                ${field('Utilizó ortodoncia', patient.ortodoncia === 'si' ? 'Sí' : 'No')}
                ${patient.orto_finalizado ? field('Finalizado', patient.orto_finalizado === 'si' ? 'Sí' : 'No') : ''}
                ${patient.orto_motivo_no_finalizado ? field('Motivo de no finalizar tratamiento', patient.orto_motivo_no_finalizado) : ''}
                ${field('Reacción adversa al anestésico', patient.reaccion_adversa_anestesico === 'no_aplicada' ? 'No Aplicada' : (patient.reaccion_adversa_anestesico === 'si' ? 'Sí' : 'No'))}
                ${patient.tipo_reaccion ? field('Tipo de reacción', patient.tipo_reaccion) : ''}
                ${field('Experiencia odontológica traumática', patient.experiencia_traumatica === 'es_1ra_consulta' ? 'Es 1ra Consulta' : (patient.experiencia_traumatica === 'si' ? 'Sí' : 'No'))}
                ${patient.que_sucedio ? field('¿Qué sucedió?', patient.que_sucedio) : ''}
                ${field('Prótesis', patient.protesis === 'si' ? 'Sí' : 'No')}
                ${patient.protesis_tipo ? field('Tipo de prótesis', patient.protesis_tipo) : ''}
                ${patient.protesis_nocturno ? field('Uso nocturno de prótesis', patient.protesis_nocturno === 'si' ? 'Sí' : 'No') : ''}
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Higiene Oral</h2>
        <div class="grid-2">
            <div>
                ${field('Frecuencia de cepillado diario', patient.f_cepillado + ' veces al día')}
                ${patient.tipocepillo ? field('Tipo de cepillo dental', patient.tipocepillo) : ''}
                ${field('Tipo de pasta dental', patient.pastadental)}
                ${field('Cambio de cepillo', patient.cambio_cepillo)}
            </div>
            <div>
                ${field('Uso de hilo dental', patient.hilo_dental === 'si' ? 'Sí' : 'No')}
                ${field('Uso de enjuague bucal', patient.enjuague_bucal === 'si' ? 'Sí' : 'No')}
                ${patient.enjuague_bucal === 'si' && patient.tipo_enjuague_bucal ? field('Tipo enjuague bucal', patient.tipo_enjuague_bucal) : ''}
                ${patient.ultima_limpieza ? field('Última limpieza', patient.ultima_limpieza) : ''}
            </div>
        </div>
    </div>

    ${patient.observaciones_generales ? `
    <div class="section">
        <h2>Observaciones Generales</h2>
        ${field('Observaciones', patient.observaciones_generales)}
    </div>
    ` : ''}

    ${patient.firma_digital ? `
    <div class="section">
        <h2>Firma Digital</h2>
        <div class="signature">
            <img src="${patient.firma_digital}" alt="Firma del paciente" />
            <p>Firma digital registrada el ${patient.fecha_inicio}</p>
        </div>
    </div>
    ` : ''}

    ${consentPages}

    ${odontogramSection}

    <div class="footer">
        <p>Generado el: ${new Date().toLocaleString('es-ES')}</p>
        <p>Sistema de Gestión Dental - Clínica Diamond</p>
    </div>
</body>
</html>
    `;
  }

  private static processConsentContent(content: string, patient: Patient): string {
    if (!content) return content;

    const fieldWrap = (value: string) =>
      `<span class="consent-field">${value || ''}</span>`;

    return content
      .replace(/\{\{PATIENT_NAME\}\}/g, fieldWrap(patient.nombre_completo || '_________________________'))
      .replace(/\{\{PATIENT_ID\}\}/g, fieldWrap(patient.numero_identidad || '_____________________'))
      .replace(/\{\{PATIENT_ADDRESS\}\}/g, fieldWrap(patient.direccion || '__________________________________________'))
      .replace(/\{\{DOCTOR_NAME\}\}/g, fieldWrap(patient.doctor || '_________________________'))
      .replace(/\{\{CURRENT_DATE\}\}/g, fieldWrap(`San Pedro Sula, ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`))
      .replace(/\{\{REPRESENTANTE_LEGAL\}\}/g, fieldWrap(patient.representante_legal || '_________________________________________'))
      .replace(/\{\{REP_NUMERO_IDENTIDAD\}\}/g, fieldWrap(patient.rep_numero_identidad || '_________________________'))
      .replace(/\{\{CLINIC_NAME\}\}/g, 'Clínica Dental Diamond HN')
      .replace(/\n/g, '<br>');
  }

  private static generateConsentPages(consentimientos: Consentimiento[], patient: Patient): string {
    if (!consentimientos || consentimientos.length === 0) return '';

    const estadoLabel = (estado: string) => {
      switch (estado) {
        case 'firmado': return 'Firmado';
        case 'cancelado': return 'Cancelado';
        default: return 'Activo';
      }
    };

    return consentimientos.map((consentimiento) => `
    <div class="consent-page">
        <div class="header">
            <h1>${consentimiento.nombre_consentimiento}</h1>
            <h2>Consentimiento Informado</h2>
            <p>Tipo: ${consentimiento.tipo_consentimiento} | Fecha: ${consentimiento.fecha_consentimiento || ''}</p>
        </div>

        <div class="consent-content">
            ${this.processConsentContent(consentimiento.contenido, patient)}
        </div>

        ${consentimiento.descripcion ? `<p style="font-size: 12px; color: #666; margin-top: 8px;">${consentimiento.descripcion}</p>` : ''}

        <div class="consent-signatures">
            <div class="consent-signature-box">
                ${consentimiento.firma_paciente_url
                  ? `<img src="${consentimiento.firma_paciente_url}" alt="Firma del paciente" />`
                  : '<div class="consent-signature-line"></div>'}
                <div class="consent-signature-label">Firma del Paciente</div>
            </div>
            <div class="consent-signature-box">
                ${consentimiento.firma_doctor_url
                  ? `<img src="${consentimiento.firma_doctor_url}" alt="Firma del doctor" />`
                  : '<div class="consent-signature-line"></div>'}
                <div class="consent-signature-label">Firma del Doctor/a</div>
            </div>
        </div>

        <div class="consent-estado">Estado: ${estadoLabel(consentimiento.estado)}</div>
    </div>
    `).join('\n');
  }

  private static getOdontTooth(datos: OdontogramData, num: number): { cuadrantes: Record<OdontCuadrante, string>; central?: string; nota?: string } {
    const diente = (datos as any).dientes?.[num.toString()];
    if (!diente) return { cuadrantes: odontDefaultCuadrantes() };

    if (diente.cuadrantes) {
      return {
        cuadrantes: { ...odontDefaultCuadrantes(), ...Object.fromEntries(Object.entries(diente.cuadrantes).filter(([, v]) => typeof v === 'string')) },
        central: typeof diente.central === 'string' ? (diente.central || 'sano') : 'sano',
        nota: diente.nota
      };
    }
    if (diente.estado !== undefined) {
      const estadoLegado = diente.estado || 'sano';
      return {
        cuadrantes: { mesial: estadoLegado, distal: estadoLegado, buccal: estadoLegado, lingual: estadoLegado },
        central: 'sano',
        nota: diente.nota
      };
    }
    return { cuadrantes: odontDefaultCuadrantes() };
  }

  private static odontToothSvg(numero: number, tooth: { cuadrantes: Record<OdontCuadrante, string>; central?: string; nota?: string }, isOleary: boolean, size = 52): string {
    const radius = 18;
    const estados = isOleary ? ODONT_ESTADOS_OLEARY : ODONT_ESTADOS;
    const nota = tooth.nota;

    const quadrantPaths = (Object.entries(ODONT_QUADRANT_ANGLES) as [OdontCuadrante, [number, number]][])
      .map(([cuadrante, [start, end]]) => {
        const estado = tooth.cuadrantes[cuadrante];
        const fillColor = estados.find(e => e.key === estado)?.color || '#FFFFFF';
        return `<path d="${odontPieSlicePath(start, end, radius)}" fill="${fillColor}" stroke="black" stroke-width="0.8" opacity="0.9" />`;
      })
      .join('');

    let center = '';
    if (!isOleary) {
      const centralColor = tooth.central ? (estados.find(e => e.key === tooth.central)?.color || '#FFFFFF') : '#FFFFFF';
      const textFill = tooth.central && tooth.central !== 'sano' ? '#FFFFFF' : '#1F2937';
      center = `
        <circle cx="0" cy="0" r="7.2" fill="${centralColor}" stroke="black" stroke-width="1.5" />
        <text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="bold" fill="${textFill}">${numero}</text>`;
    } else {
      center = `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="bold" fill="#1F2937">${numero}</text>`;
    }

    const noteIndicator = nota
      ? `<circle cx="${radius - 4}" cy="${-radius + 4}" r="4" fill="#FF5252" stroke="#FFFFFF" stroke-width="1" />`
      : '';

    return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="display:block"><g transform="translate(20,20)">${quadrantPaths}${center}${noteIndicator}</g></svg>`;
  }

  private static generateOdontogramSection(odontogram?: Odontogram | null): string {
    if (!odontogram || !odontogram.datos_odontograma) return '';

    const datos = odontogram.datos_odontograma;
    const tipo = (datos.tipo as 'adulto' | 'nino' | 'oleary_adulto') || 'adulto';
    const isOleary = tipo === 'oleary_adulto';
    const isAdulto = tipo === 'adulto' || tipo === 'oleary_adulto';

    const teethQuadrants = isAdulto ? ODONT_ADULT_QUADRANTS : ODONT_CHILD_QUADRANTS;
    const upperTeeth = [...teethQuadrants.upperRight, ...teethQuadrants.upperLeft];
    const lowerTeeth = [...teethQuadrants.lowerRight, ...teethQuadrants.lowerLeft];

    // Scale tooth size so the row fits the printable page width (~737px on Letter)
    const teethPerRow = upperTeeth.length;
    const gap = 6;
    const toothSize = Math.min(52, Math.floor((700 - gap * (teethPerRow - 1)) / teethPerRow));

    const upperRow = upperTeeth
      .map(num => `<div style="flex-shrink:0">${this.odontToothSvg(num, this.getOdontTooth(datos, num), isOleary, toothSize)}</div>`)
      .join('');
    const lowerRow = lowerTeeth
      .map(num => `<div style="flex-shrink:0">${this.odontToothSvg(num, this.getOdontTooth(datos, num), isOleary, toothSize)}</div>`)
      .join('');

    // Status counters
    const contador: Record<string, number> = {};
    const estados = isOleary ? ODONT_ESTADOS_OLEARY : ODONT_ESTADOS;
    estados.forEach(e => { contador[e.key] = 0; });

    [...upperTeeth, ...lowerTeeth].forEach(num => {
      const tooth = this.getOdontTooth(datos, num);
      // Collect all non-sano statuses across quadrants and center
      const allStatuses: string[] = [];
      if (!isOleary) {
        if (tooth.central && typeof tooth.central === 'string') {
          allStatuses.push(tooth.central);
        }
      }
      const quadrantValues = Object.values(tooth.cuadrantes || {}).filter((q) => typeof q === 'string');
      allStatuses.push(...quadrantValues);

      const uniqueNonSano = new Set(allStatuses.filter(s => s !== 'sano'));
      if (uniqueNonSano.size === 0) {
        contador['sano']++;
      } else {
        uniqueNonSano.forEach(status => {
          contador[status] = (contador[status] || 0) + 1;
        });
      }
    });

    const legend = estados
      .filter(estado => contador[estado.key] > 0)
      .map(estado => `
        <span class="odontogram-legend-item">
          <span class="odontogram-swatch" style="background:${estado.color}; ${estado.color === '#FFFFFF' ? 'border:1px solid #ccc;' : ''}"></span>
          ${estado.label}
          <span>${contador[estado.key]}</span>
        </span>`)
      .join('');

    const mordidas = (datos.mordidas || []).map((m: string) =>
      `<span class="odontogram-chip"><span class="odontogram-chip-check">✓</span>${ODONT_MORDIDAS_LABELS[m] || m}</span>`).join('');

    const gingivitis = (datos.gingivitis || []).map((g: any) =>
      `<span class="odontogram-chip"><span class="odontogram-chip-warn">⚠</span>${ODONT_GINGIVITIS_LABELS[g.tipo] || g.tipo}${g.detalle ? ` - ${g.detalle}` : ''}</span>`).join('');

    const fecha = (datos as any).fecha || odontogram.fecha_creacion || '';
    const fechaLabel = fecha
      ? new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const tipoLabel = tipo === 'adulto' ? 'Adulto' : tipo === 'nino' ? 'Niño' : "O'Leary Adulto";

    const notaToothCount = [...upperTeeth, ...lowerTeeth].filter(num => this.getOdontTooth(datos, num).nota).length;

    return `
    <div class="section">
        <h2>Odontograma</h2>
        <div class="odontogram-badges" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span class="odontogram-badge odontogram-badge-teal">Versión ${odontogram.version}</span>
            <span class="odontogram-badge odontogram-badge-gray">${tipoLabel}</span>
            ${odontogram.activo ? '<span class="odontogram-badge odontogram-badge-green">Actual</span>' : ''}
        </div>
        <p class="odontogram-fecha" style="margin-top:8px;">Fecha: ${fechaLabel || 'No disponible'}</p>
        <div class="odontogram-chart">
            <div class="odontogram-row">${upperRow}</div>
            <div class="odontogram-row">${lowerRow}</div>
            ${legend ? `<div class="odontogram-legend">${legend}</div>` : ''}
        </div>
        ${mordidas ? `<div class="odontogram-section"><h4>Mordida</h4><div class="odontogram-chips">${mordidas}</div></div>` : ''}
        ${gingivitis ? `<div class="odontogram-section"><h4>Gingivitis / Periodontitis</h4><div class="odontogram-chips">${gingivitis}</div></div>` : ''}
        ${odontogram.notas ? `<div class="odontogram-notas"><h4>Notas generales</h4><p>${odontogram.notas}</p></div>` : ''}
        ${notaToothCount > 0 ? `<p class="odontogram-nota-count">${notaToothCount} diente(s) con nota</p>` : ''}
    </div>`;
  }

}
