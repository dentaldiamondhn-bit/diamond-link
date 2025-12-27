import { Patient } from '../types/patient';

export class ExportService {
  static async exportToPDF(patient: Patient): Promise<void> {
    // Create a new window with print-friendly content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para exportar a PDF');
      return;
    }

    const printContent = this.generatePrintContent(patient);
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  static exportToHTML(patient: Patient): void {
    const htmlContent = this.generateHTMLContent(patient);
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

  private static generatePrintContent(patient: Patient): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historia Clínica - ${patient.nombre_completo}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0a4d4a;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
            page-break-inside: avoid;
        }
        .section h2 {
            color: #0a4d4a;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .field {
            margin-bottom: 10px;
        }
        .field-label {
            font-weight: bold;
            color: #555;
        }
        .field-value {
            margin-left: 10px;
        }
        .signature {
            border: 1px solid #ccc;
            padding: 10px;
            margin-top: 10px;
            text-align: center;
        }
        .signature img {
            max-width: 300px;
            max-height: 150px;
        }
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
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

    <div class="grid-2">
        <div class="section">
            <h2>Información Personal</h2>
            <div class="field">
                <span class="field-label">Nombre Completo:</span>
                <span class="field-value">${patient.nombre_completo}</span>
            </div>
            <div class="field">
                <span class="field-label">Tipo de Identificación:</span>
                <span class="field-value">${patient.tipo_identificacion}</span>
            </div>
            <div class="field">
                <span class="field-label">Número de Identidad:</span>
                <span class="field-value">${patient.numero_identidad || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="field-label">Fecha de Nacimiento:</span>
                <span class="field-value">${patient.fecha_nacimiento || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="field-label">Edad:</span>
                <span class="field-value">${patient.edad || 'N/A'} años</span>
            </div>
            <div class="field">
                <span class="field-label">Sexo:</span>
                <span class="field-value">${patient.sexo}</span>
            </div>
            <div class="field">
                <span class="field-label">Tipo de Sangre:</span>
                <span class="field-value">${patient.tipo_sangre}</span>
            </div>
            <div class="field">
                <span class="field-label">Dirección:</span>
                <span class="field-value">${patient.direccion}</span>
            </div>
            <div class="field">
                <span class="field-label">Teléfono:</span>
                <span class="field-value">${patient.telefono || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="field-label">Email:</span>
                <span class="field-value">${patient.email || 'N/A'}</span>
            </div>
        </div>

        <div class="section">
            <h2>Información de Contacto</h2>
            <div class="field">
                <span class="field-label">Contacto de Emergencia:</span>
                <span class="field-value">${patient.contacto_emergencia || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="field-label">Teléfono de Emergencia:</span>
                <span class="field-value">${patient.contacto_telefono || 'N/A'}</span>
            </div>
            <div class="field">
                <span class="field-label">Doctor:</span>
                <span class="field-value">${patient.doctor}</span>
            </div>
            <div class="field">
                <span class="field-label">Fecha de Inicio:</span>
                <span class="field-value">${patient.fecha_inicio}</span>
            </div>
            <div class="field">
                <span class="field-label">Seguro:</span>
                <span class="field-value">${patient.seguro}</span>
            </div>
            <div class="field">
                <span class="field-label">Póliza:</span>
                <span class="field-value">${patient.poliza || 'N/A'}</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Información Médica</h2>
        <div class="field">
            <span class="field-label">Enfermedades:</span>
            <span class="field-value">${patient.enfermedades || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Alergias:</span>
            <span class="field-value">${patient.alergias || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Medicamentos:</span>
            <span class="field-value">${patient.medicamentos || 'Ninguno'}</span>
        </div>
        <div class="field">
            <span class="field-label">Hospitalizaciones:</span>
            <span class="field-value">${patient.hospitalizaciones || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Cirugías:</span>
            <span class="field-value">${patient.cirugias || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Antecedentes Familiares:</span>
            <span class="field-value">${patient.antecedentes_familiares || 'Ninguno'}</span>
        </div>
    </div>

    <div class="section">
        <h2>Hábitos</h2>
        <div class="field">
            <span class="field-label">Fuma:</span>
            <span class="field-value">${patient.fuma}</span>
        </div>
        <div class="field">
            <span class="field-label">Alcohol:</span>
            <span class="field-value">${patient.alcohol}</span>
        </div>
        <div class="field">
            <span class="field-label">Drogas:</span>
            <span class="field-value">${patient.drogas}</span>
        </div>
        <div class="field">
            <span class="field-label">Café:</span>
            <span class="field-value">${patient.cafe}</span>
        </div>
    </div>

    <div class="section">
        <h2>Información Dental</h2>
        <div class="field">
            <span class="field-label">Motivo de Consulta:</span>
            <span class="field-value">${patient.motivo}</span>
        </div>
        <div class="field">
            <span class="field-label">Encías:</span>
            <span class="field-value">${patient.encias}</span>
        </div>
        <div class="field">
            <span class="field-label">Dolor:</span>
            <span class="field-value">${patient.dolor}</span>
        </div>
        <div class="field">
            <span class="field-label">Higiene Oral - Cepillado:</span>
            <span class="field-value">${patient.f_cepillado} veces al día</span>
        </div>
        <div class="field">
            <span class="field-label">Higiene Oral - Hilo Dental:</span>
            <span class="field-value">${patient.hilo_dental}</span>
        </div>
        <div class="field">
            <span class="field-label">Ortodoncia:</span>
            <span class="field-value">${patient.ortodoncia}</span>
        </div>
    </div>

    ${patient.firma_digital ? `
    <div class="section">
        <h2>Firma Digital</h2>
        <div class="signature">
            <img src="${patient.firma_digital}" alt="Firma del paciente" />
            <p>Firma digital registrada el ${patient.fecha_inicio}</p>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Sistema de Gestión Dental - Clínica Diamond</strong></p>
    </div>
</body>
</html>
    `;
  }

  private static generateHTMLContent(patient: Patient): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Historia Clínica - ${patient.nombre_completo}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #0a4d4a;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        }
        .section h2 {
            color: #0a4d4a;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .field {
            margin-bottom: 10px;
        }
        .field-label {
            font-weight: bold;
            color: #555;
        }
        .field-value {
            margin-left: 10px;
        }
        .signature {
            border: 1px solid #ccc;
            padding: 10px;
            margin-top: 10px;
            text-align: center;
        }
        .signature img {
            max-width: 300px;
            max-height: 150px;
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
        <h2>Información Personal</h2>
        <div class="field">
            <span class="field-label">Nombre Completo:</span>
            <span class="field-value">${patient.nombre_completo}</span>
        </div>
        <div class="field">
            <span class="field-label">Tipo de Identificación:</span>
            <span class="field-value">${patient.tipo_identificacion}</span>
        </div>
        <div class="field">
            <span class="field-label">Número de Identidad:</span>
            <span class="field-value">${patient.numero_identidad || 'N/A'}</span>
        </div>
        <div class="field">
            <span class="field-label">Fecha de Nacimiento:</span>
            <span class="field-value">${patient.fecha_nacimiento || 'N/A'}</span>
        </div>
        <div class="field">
            <span class="field-label">Edad:</span>
            <span class="field-value">${patient.edad || 'N/A'} años</span>
        </div>
        <div class="field">
            <span class="field-label">Sexo:</span>
            <span class="field-value">${patient.sexo}</span>
        </div>
        <div class="field">
            <span class="field-label">Tipo de Sangre:</span>
            <span class="field-value">${patient.tipo_sangre}</span>
        </div>
        <div class="field">
            <span class="field-label">Dirección:</span>
            <span class="field-value">${patient.direccion}</span>
        </div>
        <div class="field">
            <span class="field-label">Teléfono:</span>
            <span class="field-value">${patient.telefono || 'N/A'}</span>
        </div>
        <div class="field">
            <span class="field-label">Email:</span>
            <span class="field-value">${patient.email || 'N/A'}</span>
        </div>
    </div>

    <div class="section">
        <h2>Información Médica</h2>
        <div class="field">
            <span class="field-label">Enfermedades:</span>
            <span class="field-value">${patient.enfermedades || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Alergias:</span>
            <span class="field-value">${patient.alergias || 'Ninguna'}</span>
        </div>
        <div class="field">
            <span class="field-label">Medicamentos:</span>
            <span class="field-value">${patient.medicamentos || 'Ninguno'}</span>
        </div>
        <div class="field">
            <span class="field-label">Antecedentes Familiares:</span>
            <span class="field-value">${patient.antecedentes_familiares || 'Ninguno'}</span>
        </div>
    </div>

    <div class="section">
        <h2>Información Dental</h2>
        <div class="field">
            <span class="field-label">Motivo de Consulta:</span>
            <span class="field-value">${patient.motivo}</span>
        </div>
        <div class="field">
            <span class="field-label">Doctor:</span>
            <span class="field-value">${patient.doctor}</span>
        </div>
        <div class="field">
            <span class="field-label">Fecha de Inicio:</span>
            <span class="field-value">${patient.fecha_inicio}</span>
        </div>
        <div class="field">
            <span class="field-label">Seguro:</span>
            <span class="field-value">${patient.seguro}</span>
        </div>
    </div>

    ${patient.firma_digital ? `
    <div class="section">
        <h2>Firma Digital</h2>
        <div class="signature">
            <img src="${patient.firma_digital}" alt="Firma del paciente" />
            <p>Firma digital registrada el ${patient.fecha_inicio}</p>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Sistema de Gestión Dental - Clínica Diamond</strong></p>
    </div>
</body>
</html>
    `;
  }
}
