'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientService } from '../../../../../services/patientService';
import { consentimientoService } from '../../../../../services/consentimientoService';
import { Patient } from '../../../../../types/patient';
import { supabase } from '../../../../../lib/supabase';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { useHistoricalMode } from '../../../../../contexts/HistoricalModeContext';
import { getRecordCategoryInfo } from '../../../../../utils/recordCategoryUtils';
import HistoricalBanner from '../../../../../components/HistoricalBanner';
import HistoricalBadge from '../../../../../components/HistoricalBadge';

export default function ConsentimientoPreview() {
  const [consentimiento, setConsentimiento] = useState<any>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordCategoryInfo, setRecordCategoryInfo] = useState<any>(null);
  
  const params = useParams();
  const router = useRouter();
  const consentimientoId = params.id as string;
  const { bypassHistoricalMode, loadPatientSettings } = useHistoricalMode();

  // Watch for bypass state changes
  useEffect(() => {
    // Bypass state changes are handled by the context
  }, [bypassHistoricalMode]);

  useEffect(() => {
    const loadConsentimientoData = async () => {
      try {
        if (!consentimientoId) {
          setError('No se proporcionó un ID de consentimiento válido');
          setLoading(false);
          return;
        }

        // Fetch consentimiento by ID
        const { data: consentimientoData, error: consentimientoError } = await supabase
          .from('consentimientos')
          .select('*')
          .eq('id', consentimientoId)
          .single();

        if (consentimientoError || !consentimientoData) {
          setError('Consentimiento no encontrado');
          setLoading(false);
          return;
        }

        // Fetch patient data
        const patientData = await PatientService.getPatientById(consentimientoData.paciente_id);
        
        setConsentimiento(consentimientoData);
        setPatient(patientData);
        
        // Check record category (historical, active, archived)
        const categoryInfo = await getRecordCategoryInfo(patientData.fecha_inicio || patientData.fecha_inicio_consulta);
        setRecordCategoryInfo(categoryInfo);
        
        // Load patient-specific historical mode settings
        await loadPatientSettings(consentimientoData.paciente_id);
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading consentimiento:', err);
        setError('Error al cargar el consentimiento');
        setLoading(false);
      }
    };

    loadConsentimientoData();
  }, [consentimientoId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!consentimiento || !patient) return;
    
    try {
      // Create PDF
      const pdf = new jsPDF();
      
      // Add title (skip logo for now to ensure PDF works)
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLINICA DENTAL DIAMOND', 105, 25, { align: 'center' });
      pdf.text('CONSENTIMIENTO INFORMADO', 105, 35, { align: 'center' });
      
      // Add patient info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Yo, ${patient.nombre_completo} con el documento de identidad ${patient.numero_identidad}`, 20, 70);
      pdf.text(`y que resido en el domicilio ${patient.direccion}`, 20, 80);
      pdf.text('por medio del presente documento hago constar lo siguiente.', 20, 90);
      
      // Add consentimiento points
      pdf.text('• Que he acudido a la clínica Dental Diamond donde he sido atendido por', 30, 110);
      pdf.text(`${patient.doctor}.`, 30, 120);
      pdf.text('• Que se me ha explicado que debo participar en la elaboración de un', 30, 130);
      pdf.text('diagnostico odontológico el cual incluirá un exámen clínico, un examen', 30, 140);
      pdf.text('radiográfico de ser necesario y un expediente clínico con mi información', 30, 150);
      pdf.text('personal. Asi mismo, me ha sido advertido y se me ha explicado', 30, 160);
      pdf.text('claramente los riesgos de salud que ocurrirían al no cumplir con las', 30, 170);
      pdf.text('recomendaciones que el odontólogo me proporcione, liberándolo de toda', 30, 180);
      pdf.text('responsabilidad.', 30, 190);
      
      pdf.text('• Que entiendo que todos los tratamientos NO son gratuitos, ya que', 30, 210);
      pdf.text('conllevan un costo el cual será comunicado previamente a realizar', 30, 220);
      pdf.text('cualquier tratamiento y al llegar a un acuerdo se procederá luego de su', 30, 230);
      pdf.text('cancelación.', 30, 240);
      
      pdf.text('• Autorizo a la clínica antes dicha a la toma de fotografías', 30, 250);
      pdf.text('publicación con fines demostrativos y educativos para posteriormente', 30, 260);
      pdf.text('publicar en redes sociales.', 30, 270);
      
      // Add date
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Fecha: ${consentimiento.fecha_consentimiento}`, 105, 290, { align: 'center' });
      
      // Add signature images if they exist
      let yPosition = 320;
      
      if (consentimiento.firma_paciente_url) {
        try {
          pdf.text('Firma del Paciente:', 20, yPosition, { align: 'left' });
          yPosition += 10;
          
          // Add a placeholder for signature
          pdf.rect(20, yPosition, 60, 30);
          pdf.text('[Firma digital del paciente]', 35, yPosition + 20, { align: 'center' });
          yPosition += 40;
        } catch (error) {
          pdf.text('Firma del Paciente:', 20, yPosition, { align: 'left' });
          yPosition += 10;
          pdf.rect(20, yPosition, 60, 30);
          pdf.text('[Firma digital]', 35, yPosition + 20, { align: 'center' });
          yPosition += 40;
        }
      }
      
      if (consentimiento.firma_doctor_url) {
        try {
          pdf.text('Firma del Doctor/a:', 120, yPosition, { align: 'left' });
          yPosition += 10;
          
          // Add a placeholder for signature
          pdf.rect(120, yPosition, 60, 30);
          pdf.text('[Firma digital del doctor]', 135, yPosition + 20, { align: 'center' });
        } catch (error) {
          pdf.text('Firma del Doctor/a:', 120, yPosition, { align: 'left' });
          yPosition += 10;
          pdf.rect(120, yPosition, 60, 30);
          pdf.text('[Firma digital]', 135, yPosition + 20, { align: 'center' });
        }
      }
      
      // Save PDF
      pdf.save(`consentimiento_${patient.nombre_completo}_${consentimiento.fecha_consentimiento}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleDownloadHTML = async () => {
    if (!consentimiento || !patient) return;
    
    try {
      // Create a printable version
      const printContent = createPrintableContent(consentimiento, patient);
      
      // Open in new window for manual save
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(printContent);
        newWindow.document.title = `Consentimiento_${patient.nombre_completo}_${consentimiento.fecha_consentimiento}`;
        newWindow.document.close();
        
        // Show instruction
        setTimeout(() => {
          alert('El consentimiento se ha abierto en una nueva pestaña. Usa Ctrl+S o Cmd+S para guardar el archivo.');
        }, 500);
      } else {
        // Fallback: try to copy to clipboard
        const textArea = document.createElement('textarea');
        textArea.value = printContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('El contenido del consentimiento se ha copiado al portapapeles. Pégalo en un editor de texto y guárdalo como archivo HTML.');
      }
      
    } catch (error) {
      console.error('Error opening consentimiento:', error);
      alert('Error al abrir el consentimiento');
    }
  };

  const createPrintableContent = (consentimiento: any, patient: Patient) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consentimiento Informado - ${patient.nombre_completo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { width: 80px; height: 80px; margin-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 30px; }
          .content { margin-bottom: 30px; }
          .field { display: inline-block; border-bottom: 2px solid #333; padding: 0 5px; min-width: 200px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 45%; text-align: center; }
          .signature-line { border-bottom: 2px solid #333; height: 60px; margin-bottom: 5px; }
          .signature-label { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/Logo.svg" alt="Clínica Dental Diamond" class="logo" />
          <div class="title">CLINICA DENTAL DIAMOND</div>
          <div class="subtitle">CONSENTIMIENTO INFORMADO</div>
        </div>
        
        <div class="content">
          <p>Yo, <span class="field">${patient.nombre_completo}</span> con el documento de identidad <span class="field">${patient.numero_identidad}</span> y que resido en el domicilio <span class="field">${patient.direccion}</span> por medio del presente documento hago constar lo siguiente.</p>
          
          <div style="margin-left: 30px;">
            <p>• Que he acudido a la clínica Dental Diamond donde he sido atendido por <span class="field">${patient.doctor}</span>.</p>
            <p>• Que se me ha explicado que debo participar en la elaboración de un diagnostico odontológico el cual incluirá un exámen clínico, un examen radiográfico de ser necesario y un expediente clínico con mi información personal. Asi mismo, me ha sido advertido y se me ha explicado claramente los riesgos de salud que ocurrirían al no cumplir con las recomendaciones que el odontólogo me proporcione, liberándolo de toda responsabilidad.</p>
            <p>• Que entiendo que todos los tratamientos NO son gratuitos, ya que conllevan un costo el cual será comunicado previamente a realizar cualquier tratamiento y al llegar a un acuerdo se procederá luego de su cancelación.</p>
            <p>• Autorizo a la clínica antes dicha a la toma de fotografías publicación con fines demostrativos y educativos para posteriormente publicar en redes sociales.</p>
          </div>
          
          <p style="margin-top: 30px; text-align: center;">
            <strong>Fecha:</strong> ${consentimiento.fecha_consentimiento}
          </p>
        </div>
        
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Firma del Paciente</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Firma del Doctor/a</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600"></div>
          <div className="absolute top-0 left-0 animate-ping rounded-full h-16 w-16 border-4 border-teal-300 opacity-20"></div>
        </div>
        <span className="ml-6 text-lg font-medium text-gray-600">Cargando consentimiento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <p className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!consentimiento || !patient) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <i className="fas fa-file-signature text-6xl text-gray-400 mb-4"></i>
          <p className="text-xl font-semibold text-gray-800 dark:text-white mb-2">No se encontró el consentimiento</p>
          <button
            onClick={() => router.back()}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      {/* Aggressive global print styles */}
      <style jsx global>{`
        @media print {
          /* Hide absolutely everything except our content */
          body * {
            visibility: hidden;
          }
          
          /* Show only our document container and its children */
          .bg-white, .bg-white * {
            visibility: visible;
          }
          
          /* Force the document to be the only thing visible */
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 20px !important;
            border-radius: 0 !important;
          }
          
          /* Override all colors for print */
          .bg-white * {
            color: black !important;
            background: white !important;
            border-color: #ccc !important;
          }
          
          /* Remove all styling */
          .bg-white * {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          
          /* Page setup */
          @page {
            margin: 0.5in;
            size: A4;
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 mb-8 print:hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <HistoricalBadge 
                isHistorical={recordCategoryInfo?.isHistorical} 
                isBypassed={bypassHistoricalMode} 
                size="sm" 
              />
              <Link
                href={`/menu-navegacion?id=${patient.paciente_id}`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Volver al Menú
              </Link>
              <Link
                href={`/consentimientos/${patient.paciente_id}`}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
              >
                <i className="fas fa-plus mr-2"></i>
                Crear Nuevo
              </Link>
            </div>
            <div className="flex items-center space-x-2 print:hidden">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <i className="fas fa-print mr-2"></i>
                Imprimir
              </button>
            </div>
          </div>

          {/* Historical Mode Banner */}
          <HistoricalBanner
            isHistorical={recordCategoryInfo?.isHistorical}
            isBypassed={bypassHistoricalMode}
            patientId={patient?.paciente_id}
            loading={false}
            compact={true}
          />
        </div>

        {/* Consent Document Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 print:shadow-none print:border-none print:bg-white print:rounded-none">
          {/* Logo and Clinic Header */}
          <div className="flex items-center space-x-4 mb-8">
            <img 
              src="/Logo.svg" 
              alt="Clínica Dental Diamond" 
              className="w-16 h-16"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                CLINICA DENTAL DIAMOND
              </h1>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-center mb-8">CONSENTIMIENTO INFORMADO</h2>
          
          <div className="space-y-6 text-base leading-relaxed">
            <p className="text-justify">
              Yo, <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                {patient?.nombre_completo || '_________________________'}
              </span> con el documento de identidad 
              <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                {patient?.numero_identidad || '_____________________'}
              </span>
            </p>
            
            <p className="text-justify">
              y que resido en el domicilio
              <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                {patient?.direccion || '__________________________________________'}
              </span>
              por medio del presente documento hago constar lo siguiente.
            </p>
            
            <div className="space-y-4 ml-6">
              <div className="flex items-start">
                <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                <p className="text-justify">
                  Que he acudido a la clínica Dental Diamond donde he sido atendido por 
                  <span className="font-semibold border-b-2 border-gray-400 dark:border-gray-500 px-1 pb-1 inline-block">
                    {patient?.doctor || '_________________________'}
                  </span>
                </p>
              </div>
              
              <div className="flex items-start">
                <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                <p className="text-justify">
                  Que se me ha explicado que debo participar en la elaboración de un
                  diagnostico odontológico el cual incluirá un exámen clínico, un examen
                  radiográfico de ser necesario y un expediente clínico con mi información
                  personal. Asi mismo, me ha sido advertido y se me ha explicado claramente
                  los riesgos de salud que ocurrirían al no cumplir con las recomendaciones
                  que el odontólogo me proporcione, liberándolo de toda responsabilidad.
                </p>
              </div>
              
              <div className="flex items-start">
                <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                <p className="text-justify">
                  Que entiendo que todos los tratamientos NO son gratuitos, ya que
                  conllevan un costo el cual será comunicado previamente a realizar
                  cualquier tratamiento y al llegar a un acuerdo se procederá luego de su
                  cancelación.
                </p>
              </div>
              
              <div className="flex items-start">
                <span className="text-teal-600 dark:text-teal-400 mr-3">•</span>
                <p className="text-justify">
                  Autorizo a la clínica antes dicha a la toma de fotografías publicación con
                  fines demostrativos y educativos para posteriormente publicar en redes
                  sociales.
                </p>
              </div>
            </div>
          </div>

          {/* Date Section */}
          <div className="mt-4 text-center">
            <p className="text-base font-semibold">
              <strong>Fecha:</strong> {consentimiento.fecha_consentimiento}
            </p>
          </div>

          {/* Signatures Section - Professional document style */}
          <div className="mt-16 flex justify-between items-start">
            {/* Patient Signature */}
            <div className="flex-1 mr-4">
              <div className="bg-transparent p-2 min-h-[80px] flex items-end justify-center">
                {consentimiento.firma_paciente_url ? (
                  <img 
                    src={consentimiento.firma_paciente_url} 
                    alt="Firma del paciente" 
                    className="max-h-16 max-w-full"
                  />
                ) : (
                  <div className="w-full border-b-2 border-gray-400"></div>
                )}
              </div>
              <div className="w-full border-b-2 border-gray-400 mt-2"></div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-4 text-center">
                Firma de paciente:
              </label>
            </div>

            {/* Doctor Signature */}
            <div className="flex-1 ml-4">
              <div className="bg-transparent p-2 min-h-[80px] flex items-end justify-center">
                {consentimiento.firma_doctor_url ? (
                  <img 
                    src={consentimiento.firma_doctor_url} 
                    alt="Firma del doctor" 
                    className="max-h-16 max-w-full"
                  />
                ) : (
                  <div className="w-full border-b-2 border-gray-400"></div>
                )}
              </div>
              <div className="w-full border-b-2 border-gray-400 mt-2"></div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mt-4 text-center">
                Firma de doctor/a:
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Este es un consentimiento informado firmado digitalmente.</p>
          <p>Generado el {new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      </div>
    </div>
  );
}