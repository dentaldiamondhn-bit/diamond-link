'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PatientService } from '../../services/patientService';
import { Patient } from '../../types/patient';
import { createPatient } from './actions';
import { updatePatient } from './edit-actions';
import SignaturePadComponent from '../../components/SignaturePad';
import SignatureDisplay from '../../components/SignatureDisplay';

export default function PatientForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for toggles and conditional fields
  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [sexo, setSexo] = useState('');
  const [doctor, setDoctor] = useState('');
  const [seguro, setSeguro] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [fuma, setFuma] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [drogas, setDrogas] = useState('');

  // Load existing patient data if editing
  useEffect(() => {
    const patientId = searchParams.get('id');
    if (patientId) {
      loadPatientData(patientId);
    }
  }, [searchParams]);

  const loadPatientData = async (patientId: string) => {
    try {
      const patient = await PatientService.getPatientById(patientId);
      setIsEditing(true);
      setExistingSignature(patient.firma_digital);
      
      // Set all controlled component states
      setTipoIdentificacion(patient.tipo_identificacion);
      setParentesco(patient.parentesco || '');
      setSexo(patient.sexo);
      setDoctor(patient.doctor);
      setSeguro(patient.seguro);
      setEdad(patient.edad || '');
      setFuma(patient.fuma);
      setAlcohol(patient.alcohol);
      setDrogas(patient.drogas);
      
      // Set dental evaluation states
      setEncias(patient.encias);
      setDolor(patient.dolor);
      setDolorCabeza(patient.dolor_cabeza);
      setChasquidos(patient.chasquidos);
      setDolorOido(patient.dolor_oido);
      setOrtodoncia(patient.ortodoncia);
      setFinalizoTratamiento(patient.orto_finalizado || '');
      setProtesis(patient.protesis);
      setBruxismo(patient.bruxismo);
      setNecesitaOrtodoncia(patient.necesita_ortodoncia);
      
      // Set other states
      setObjetos(patient.objetos);
      setCafe(patient.cafe);
      
      // Populate form inputs after a small delay to ensure DOM is ready
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          // Personal Information
          const nameInput = form.querySelector('#nombre_completo') as HTMLInputElement;
          if (nameInput) nameInput.value = patient.nombre_completo;
          
          const idTypeSelect = form.querySelector('#tipo_identificacion') as HTMLSelectElement;
          if (idTypeSelect) idTypeSelect.value = patient.tipo_identificacion;
          
          const idNumberInput = form.querySelector('#numero_identidad') as HTMLInputElement;
          if (idNumberInput) idNumberInput.value = patient.numero_identidad || '';
          
          const birthDateInput = form.querySelector('#fecha_nacimiento') as HTMLInputElement;
          if (birthDateInput) birthDateInput.value = patient.fecha_nacimiento || '';
          
          const ageInput = form.querySelector('#edad') as HTMLInputElement;
          if (ageInput) ageInput.value = patient.edad?.toString() || '';
          
          const sexSelect = form.querySelector('#sexo') as HTMLSelectElement;
          if (sexSelect) sexSelect.value = patient.sexo;
          
          const bloodTypeSelect = form.querySelector('#tipo_sangre') as HTMLSelectElement;
          if (bloodTypeSelect) bloodTypeSelect.value = patient.tipo_sangre;
          
          const phoneInput = form.querySelector('#telefono') as HTMLInputElement;
          if (phoneInput) phoneInput.value = patient.telefono || '';
          
          const addressInput = form.querySelector('#direccion') as HTMLInputElement;
          if (addressInput) addressInput.value = patient.direccion;
          
          const emailInput = form.querySelector('#email') as HTMLInputElement;
          if (emailInput) emailInput.value = patient.email || '';
          
          const emergencyContactInput = form.querySelector('#contacto_emergencia') as HTMLInputElement;
          if (emergencyContactInput) emergencyContactInput.value = patient.contacto_emergencia || '';
          
          const emergencyPhoneInput = form.querySelector('#contacto_telefono') as HTMLInputElement;
          if (emergencyPhoneInput) emergencyPhoneInput.value = patient.contacto_telefono || '';
          
          const doctorSelect = form.querySelector('#doctor') as HTMLSelectElement;
          if (doctorSelect) doctorSelect.value = patient.doctor;
          
          const startDateInput = form.querySelector('#fecha_inicio') as HTMLInputElement;
          if (startDateInput) startDateInput.value = patient.fecha_inicio;
          
          const insuranceSelect = form.querySelector('#seguro') as HTMLSelectElement;
          if (insuranceSelect) insuranceSelect.value = patient.seguro;
          
          // Medical Information
          const diseasesInput = form.querySelector('#enfermedades') as HTMLInputElement;
          if (diseasesInput) diseasesInput.value = patient.enfermedades || '';
          
          const allergiesInput = form.querySelector('#alergias') as HTMLInputElement;
          if (allergiesInput) allergiesInput.value = patient.alergias || '';
          
          const medicationsInput = form.querySelector('#medicamentos') as HTMLInputElement;
          if (medicationsInput) medicationsInput.value = patient.medicamentos || '';
          
          const hospitalizationsInput = form.querySelector('#hospitalizaciones') as HTMLInputElement;
          if (hospitalizationsInput) hospitalizationsInput.value = patient.hospitalizaciones || '';
          
          const surgeriesInput = form.querySelector('#cirugias') as HTMLInputElement;
          if (surgeriesInput) surgeriesInput.value = patient.cirugias || '';
          
          const familyHistoryInput = form.querySelector('#antecedentes_familiares') as HTMLInputElement;
          if (familyHistoryInput) familyHistoryInput.value = patient.antecedentes_familiares || '';
          
          // Habits
          const fumaSelect = form.querySelector('#fuma') as HTMLSelectElement;
          if (fumaSelect) fumaSelect.value = patient.fuma;
          
          const alcoholSelect = form.querySelector('#alcohol') as HTMLSelectElement;
          if (alcoholSelect) alcoholSelect.value = patient.alcohol;
          
          const drogasSelect = form.querySelector('#drogas') as HTMLSelectElement;
          if (drogasSelect) drogasSelect.value = patient.drogas;
          
          const cafeSelect = form.querySelector('#cafe') as HTMLSelectElement;
          if (cafeSelect) cafeSelect.value = patient.cafe;
          
          // Dental Information - Evaluación Odontológica
          const motivoTextarea = form.querySelector('#motivo') as HTMLTextAreaElement;
          if (motivoTextarea) motivoTextarea.value = patient.motivo;
          
          const historialTextarea = form.querySelector('#historial') as HTMLTextAreaElement;
          if (historialTextarea) historialTextarea.value = patient.historial || '';
          
          // For controlled selects, the state should already handle this
          // But let's also try to set the DOM value as backup
          const enciasSelect = form.querySelector('#sangradoEnciasSelect') as HTMLSelectElement;
          if (enciasSelect) enciasSelect.value = patient.encias;
          
          const dolorSelect = form.querySelector('#dolorMasticarSelect') as HTMLSelectElement;
          if (dolorSelect) dolorSelect.value = patient.dolor;
          
          const dolorCabezaSelect = form.querySelector('#dolorCabezaSelect') as HTMLSelectElement;
          if (dolorCabezaSelect) dolorCabezaSelect.value = patient.dolor_cabeza;
          
          const chasquidosSelect = form.querySelector('#chasquidosSelect') as HTMLSelectElement;
          if (chasquidosSelect) chasquidosSelect.value = patient.chasquidos;
          
          const dolorOidoSelect = form.querySelector('#dolorOidoSelect') as HTMLSelectElement;
          if (dolorOidoSelect) dolorOidoSelect.value = patient.dolor_oido;
          
          const ortodonciaSelect = form.querySelector('#ortodonciaSelect') as HTMLSelectElement;
          if (ortodonciaSelect) ortodonciaSelect.value = patient.ortodoncia;
          
          const finalizoTratamientoSelect = form.querySelector('#finalizoTratamientoSelect') as HTMLSelectElement;
          if (finalizoTratamientoSelect) finalizoTratamientoSelect.value = patient.orto_finalizado || '';
          
          // Textareas for conditional fields
          const sangradoEnciaTextarea = form.querySelector('#sangrado_encia') as HTMLTextAreaElement;
          if (sangradoEnciaTextarea) sangradoEnciaTextarea.value = patient.sangrado_encia || '';
          
          const dolorMasticarTextarea = form.querySelector('#dolor_masticar') as HTMLTextAreaElement;
          if (dolorMasticarTextarea) dolorMasticarTextarea.value = patient.dolor_masticar || '';
          
          const dolorCabezaDetalleTextarea = form.querySelector('#dolor_cabeza_detalle') as HTMLTextAreaElement;
          if (dolorCabezaDetalleTextarea) dolorCabezaDetalleTextarea.value = patient.dolor_cabeza_detalle || '';
          
          const chasquidosMandibularesTextarea = form.querySelector('#chasquidos_mandibulares') as HTMLTextAreaElement;
          if (chasquidosMandibularesTextarea) chasquidosMandibularesTextarea.value = patient.chasquidos_mandibulares || '';
          
          const dolorOidoDetalleTextarea = form.querySelector('#dolor_oido_detalle') as HTMLTextAreaElement;
          if (dolorOidoDetalleTextarea) dolorOidoDetalleTextarea.value = patient.dolor_oido_detalle || '';
          
          const ortoMotivoNoFinalizadoTextarea = form.querySelector('#orto_motivo_no_finalizado') as HTMLTextAreaElement;
          if (ortoMotivoNoFinalizadoTextarea) ortoMotivoNoFinalizadoTextarea.value = patient.orto_motivo_no_finalizado || '';
          
          // Other fields
          const fCepilladoInput = form.querySelector('#f_cepillado') as HTMLInputElement;
          if (fCepilladoInput) fCepilladoInput.value = patient.f_cepillado?.toString() || '';
          
          const hiloDentalSelect = form.querySelector('#hilo_dental') as HTMLSelectElement;
          if (hiloDentalSelect) hiloDentalSelect.value = patient.hilo_dental;
          
          const protesisSelect = form.querySelector('#protesis') as HTMLSelectElement;
          if (protesisSelect) protesisSelect.value = patient.protesis;
          
          const sensibilidadSelect = form.querySelector('#sensibilidad') as HTMLSelectElement;
          if (sensibilidadSelect) sensibilidadSelect.value = patient.sensibilidad;
          
          const bruxismoSelect = form.querySelector('#bruxismo') as HTMLSelectElement;
          if (bruxismoSelect) bruxismoSelect.value = patient.bruxismo;
          
          const necesitaOrtodonciaSelect = form.querySelector('#necesita_ortodoncia') as HTMLSelectElement;
          if (necesitaOrtodonciaSelect) necesitaOrtodonciaSelect.value = patient.necesita_ortodoncia;
          
          // Additional fields that were missing
          const escolaridadSelect = form.querySelector('#escolaridad') as HTMLSelectElement;
          if (escolaridadSelect) escolaridadSelect.value = patient.escolaridad;
          
          const estadoCivilSelect = form.querySelector('#estado_civil') as HTMLSelectElement;
          if (estadoCivilSelect) estadoCivilSelect.value = patient.estado_civil;
          
          const trabajoInput = form.querySelector('#trabajo') as HTMLInputElement;
          if (trabajoInput) trabajoInput.value = patient.trabajo || '';
          
          const vacunasInput = form.querySelector('#vacunas') as HTMLInputElement;
          if (vacunasInput) vacunasInput.value = patient.vacunas || '';
          
          const observacionesMedicasInput = form.querySelector('#observaciones_medicas') as HTMLInputElement;
          if (observacionesMedicasInput) observacionesMedicasInput.value = patient.observaciones_medicas || '';
          
          // Habits frequency fields
          const fumaCantidadInput = form.querySelector('#fuma_cantidad') as HTMLInputElement;
          if (fumaCantidadInput) fumaCantidadInput.value = patient.fuma_cantidad || '';
          
          const fumaFrecuenciaSelect = form.querySelector('#fuma_frecuencia') as HTMLSelectElement;
          if (fumaFrecuenciaSelect) fumaFrecuenciaSelect.value = patient.fuma_frecuencia || '';
          
          const alcoholFrecuenciaSelect = form.querySelector('#alcohol_frecuencia') as HTMLSelectElement;
          if (alcoholFrecuenciaSelect) alcoholFrecuenciaSelect.value = patient.alcohol_frecuencia || '';
          
          const tipoDrogaInput = form.querySelector('#tipo_droga') as HTMLInputElement;
          if (tipoDrogaInput) tipoDrogaInput.value = patient.tipo_droga || '';
          
          const drogasFrecuenciaInput = form.querySelector('#drogas_frecuencia') as HTMLInputElement;
          if (drogasFrecuenciaInput) drogasFrecuenciaInput.value = patient.drogas_frecuencia || '';
          
          const cantidadTazasInput = form.querySelector('#cantidad_tazas') as HTMLInputElement;
          if (cantidadTazasInput) cantidadTazasInput.value = patient.cantidad_tazas?.toString() || '';
          
          // Diet fields
          const objetosSelect = form.querySelector('#objetos') as HTMLSelectElement;
          if (objetosSelect) objetosSelect.value = patient.objetos;
          
          const morderSelect = form.querySelector('#morder') as HTMLSelectElement;
          if (morderSelect) morderSelect.value = patient.morder || '';
          
          const hieloSelect = form.querySelector('#hielo') as HTMLSelectElement;
          if (hieloSelect) hieloSelect.value = patient.hielo;
          
          const bocaSelect = form.querySelector('#boca') as HTMLSelectElement;
          if (bocaSelect) bocaSelect.value = patient.boca;
          
          const refrescosSelect = form.querySelector('#refrescos') as HTMLSelectElement;
          if (refrescosSelect) refrescosSelect.value = patient.refrescos;
          
          const dulcesSelect = form.querySelector('#dulces') as HTMLSelectElement;
          if (dulcesSelect) dulcesSelect.value = patient.dulces;
          
          const pegajososSelect = form.querySelector('#pegajosos') as HTMLSelectElement;
          if (pegajososSelect) pegajososSelect.value = patient.pegajosos;
          
          const azucaradosSelect = form.querySelector('#azucarados') as HTMLSelectElement;
          if (azucaradosSelect) azucaradosSelect.value = patient.azucarados;
          
          const obsInput = form.querySelector('#obs') as HTMLInputElement;
          if (obsInput) obsInput.value = patient.obs || '';
          
          // Other important fields
          const diagnosticoInput = form.querySelector('#diagnostico') as HTMLInputElement;
          if (diagnosticoInput) diagnosticoInput.value = patient.diagnostico || '';
          
          const tratamientoInput = form.querySelector('#tratamiento') as HTMLInputElement;
          if (tratamientoInput) tratamientoInput.value = patient.tratamiento || '';
          
          const observacionesPlanInput = form.querySelector('#observaciones_plan') as HTMLInputElement;
          if (observacionesPlanInput) observacionesPlanInput.value = patient.observaciones_plan || '';
          
          // Missing fields that need to be populated
          const medicoCabeceraInput = form.querySelector('#medico_cabecera') as HTMLInputElement;
          if (medicoCabeceraInput) medicoCabeceraInput.value = patient.medico_cabecera || '';
          
          const polizaInput = form.querySelector('#poliza') as HTMLInputElement;
          if (polizaInput) polizaInput.value = patient.poliza || '';
          
          const contactoInput = form.querySelector('#contacto') as HTMLInputElement;
          if (contactoInput) contactoInput.value = patient.contacto || '';
          
          const embarazoSelect = form.querySelector('#embarazo') as HTMLSelectElement;
          if (embarazoSelect) embarazoSelect.value = patient.embarazo || '';
          
          const visitasDentistaInput = form.querySelector('#visitas_dentista') as HTMLInputElement;
          if (visitasDentistaInput) visitasDentistaInput.value = patient.visitas_dentista || '';
          
          const obsgenInput = form.querySelector('#obsgen') as HTMLInputElement;
          if (obsgenInput) obsgenInput.value = patient.obsgen || '';
          
          const suctionDigitalSelect = form.querySelector('#suction_digital') as HTMLSelectElement;
          if (suctionDigitalSelect) suctionDigitalSelect.value = patient.suction_digital;
          
          const ultimaLimpiezaInput = form.querySelector('#ultima_limpieza') as HTMLInputElement;
          if (ultimaLimpiezaInput) ultimaLimpiezaInput.value = patient.ultima_limpieza || '';
          
          const tipocepilloSelect = form.querySelector('#tipocepillo') as HTMLSelectElement;
          if (tipocepilloSelect) tipocepilloSelect.value = patient.tipocepillo || '';
          
          const pastadentalSelect = form.querySelector('#pastadental') as HTMLSelectElement;
          if (pastadentalSelect) pastadentalSelect.value = patient.pastadental || '';
          
          const cambioCepilloSelect = form.querySelector('#cambio_cepillo') as HTMLSelectElement;
          if (cambioCepilloSelect) cambioCepilloSelect.value = patient.cambio_cepillo;
          
          const enjuagueBucalSelect = form.querySelector('#enjuague_bucal') as HTMLSelectElement;
          if (enjuagueBucalSelect) enjuagueBucalSelect.value = patient.enjuague_bucal;
        }
      }, 100);
      
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };
  const [objetos, setObjetos] = useState('');
  const [cafe, setCafe] = useState('');
  const [encias, setEncias] = useState('');
  const [dolor, setDolor] = useState('');
  const [dolorCabeza, setDolorCabeza] = useState('');
  const [chasquidos, setChasquidos] = useState('');
  const [dolorOido, setDolorOido] = useState('');
  const [ortodoncia, setOrtodoncia] = useState('');
  const [finalizoTratamiento, setFinalizoTratamiento] = useState('');
  const [protesis, setProtesis] = useState('');
  const [bruxismo, setBruxismo] = useState('');
  const [necesitaOrtodoncia, setNecesitaOrtodoncia] = useState('');

  // Calculate age from birthdate
  const handleFechaNacimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value;
    if (!fecha) {
      setEdad('');
      return;
    }
    const birthDate = new Date(fecha);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setEdad(age);
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Debug: Check signature data before sending
      console.log('Client side - Signature data exists:', !!signatureData);
      console.log('Client side - Signature data starts with data:image:', signatureData?.startsWith('data:image'));
      console.log('Client side - Signature data length:', signatureData?.length || 0);
      
      // Add signature data to form
      if (signatureData) {
        formData.set('firma_digital', signatureData);
      } else if (isEditing && existingSignature) {
        // Keep existing signature when editing and no new signature provided
        formData.set('firma_digital', existingSignature);
      }
      
      if (isEditing) {
        const patientId = searchParams.get('id')!;
        await updatePatient(patientId, formData);
      } else {
        await createPatient(formData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al guardar el paciente. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-md my-8">
      <h1 className="text-3xl font-bold text-center mb-8 text-teal-700">
        {isEditing ? 'Editar Historia Clínica' : 'Nueva Historia Clínica'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Datos Personales */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Datos Personales</h2>

          <label htmlFor="nombre_completo" className="block mb-1 font-medium">Nombre completo:</label>
          <input type="text" id="nombre_completo" name="nombre_completo" required className="input" />

          <label htmlFor="tipo_identificacion" className="block mb-1 font-medium">Tipo de Identificación:</label>
          <select
            id="tipo_identificacion"
            name="tipo_identificacion"
            required
            className="input"
            value={tipoIdentificacion}
            onChange={e => setTipoIdentificacion(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="HN">Honduras (RTN/Identidad)</option>
            <option value="US">Estados Unidos (Licencia)</option>
            <option value="GT">Guatemala (DPI)</option>
            <option value="SV">El Salvador (DUI/NIT)</option>
            <option value="NI">Nicaragua (Cédula)</option>
            <option value="ES">España (DNI/NIE)</option>
            <option value="OTRO">Otro (especificar)</option>
          </select>

          {tipoIdentificacion === 'OTRO' && (
            <>
              <label htmlFor="otro_tipo_identificacion" className="block mb-1 font-medium mt-2">Especifique el tipo de identificación:</label>
              <input type="text" id="otro_tipo_identificacion" name="otro_tipo_identificacion" className="input" />
            </>
          )}

          <label htmlFor="numero_identidad" className="block mb-1 font-medium">Número de Identificación:</label>
          <input type="text" id="numero_identidad" name="numero_identidad" required className="input" placeholder="Ingrese el número de identificación" />

          <label htmlFor="fecha_nacimiento" className="block mb-1 font-medium">Fecha de nacimiento:</label>
          <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" required className="input" onChange={handleFechaNacimientoChange} />

          <label htmlFor="edad" className="block mb-1 font-medium">Edad:</label>
          <input type="number" id="edad" name="edad" value={edad} readOnly className="input bg-gray-100 cursor-not-allowed" />

          {/* Representante Legal if under 18 */}
          {edad !== '' && edad < 18 && (
            <div className="p-4 bg-gray-50 rounded border border-gray-300 mt-4">
              <label htmlFor="representante_legal" className="block mb-1 font-medium">Representante Legal:</label>
              <input type="text" id="representante_legal" name="representante_legal" className="input" />

              <label htmlFor="parentesco" className="block mb-1 font-medium mt-2">Parentesco:</label>
              <select
                id="parentesco"
                name="parentesco"
                className="input"
                value={parentesco}
                onChange={e => setParentesco(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="padre">Padre</option>
                <option value="madre">Madre</option>
                <option value="tutor">Tutor Legal</option>
                <option value="otro">Otro (especificar)</option>
              </select>

              {parentesco === 'otro' && (
                <>
                  <label htmlFor="otro_parentesco" className="block mb-1 font-medium mt-2">Especifique el parentesco:</label>
                  <input type="text" id="otro_parentesco" name="otro_parentesco" className="input" />
                </>
              )}

              <label htmlFor="rep_celular" className="block mb-1 font-medium mt-2">Teléfono representante:</label>
              <input type="text" id="rep_celular" name="rep_celular" placeholder="Ingrese número" className="input" />
            </div>
          )}

          <label htmlFor="genero" className="block mb-1 font-medium mt-4">Sexo:</label>
          <select
            id="genero"
            name="sexo"
            required
            className="input"
            value={sexo}
            onChange={e => setSexo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {sexo === 'otro' && (
            <>
              <label htmlFor="otro_genero" className="block mb-1 font-medium mt-2">Especifique el sexo:</label>
              <input type="text" id="otro_genero" name="otro_genero" className="input" />
            </>
          )}

          <label htmlFor="tipo_sangre" className="block mb-1 font-medium mt-4">Tipo de sangre:</label>
          <select id="tipo_sangre" name="tipo_sangre" required className="input">
            <option value="">Seleccionar</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="Desconocido">Desconocido</option>
          </select>

          <label htmlFor="telefono" className="block mb-1 font-medium mt-4">Teléfono:</label>
          <input type="text" id="telefono" name="telefono" placeholder="Ingrese número" className="input" />

          <label htmlFor="direccion" className="block mb-1 font-medium mt-4">Dirección:</label>
          <input type="text" id="direccion" name="direccion" required className="input" />

          <label htmlFor="escolaridad" className="block mb-1 font-medium mt-4">Escolaridad:</label>
          <input type="text" id="escolaridad" name="escolaridad" required className="input" />

          <label htmlFor="estado_civil" className="block mb-1 font-medium mt-4">Estado Civil:</label>
          <select id="estado_civil" name="estado_civil" required className="input">
            <option value="">Seleccionar</option>
            <option value="Soltero">Soltero(a)</option>
            <option value="Casado">Casado(a)</option>
            <option value="Viudo">Viudo(a)</option>
            <option value="Divorciado">Divorciado(a)</option>
            <option value="Union Libre">Unión Libre</option>
          </select>

          <label htmlFor="email" className="block mb-1 font-medium mt-4">Correo electrónico:</label>
          <input type="email" id="email" name="email" className="input" />

          <label htmlFor="trabajo" className="block mb-1 font-medium mt-4">Lugar de trabajo:</label>
          <input type="text" id="trabajo" name="trabajo" className="input" />

          <label htmlFor="contacto_emergencia" className="block mb-1 font-medium mt-4">Contacto de emergencia:</label>
          <input type="text" id="contacto_emergencia" name="contacto_emergencia" required className="input" />

          <label htmlFor="contacto_telefono" className="block mb-1 font-medium mt-4">Teléfono de emergencia:</label>
          <input type="text" id="contacto_telefono" name="contacto_telefono" placeholder="Ingrese número" required className="input" />

          <label htmlFor="medico_cabecera" className="block mb-1 font-medium mt-4">Medico de cabecera:</label>
          <input type="text" id="medico_cabecera" name="medico_cabecera" className="input" />

          <label htmlFor="doctor" className="block mb-1 font-medium mt-4">Atendido por:</label>
          <select
            id="doctor"
            name="doctor"
            required
            className="input"
            value={doctor}
            onChange={e => setDoctor(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Dra. Sully Calix">Dra. Sully Calix</option>
            <option value="Dra. Karen Pacheco">Dra. Karen Pacheco</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {doctor === 'otro' && (
            <>
              <label htmlFor="otro_doctor" className="block mb-1 font-medium mt-2">Especifique el nombre del doctor:</label>
              <input type="text" id="otro_doctor" name="otro_doctor" className="input" />
            </>
          )}

          <label htmlFor="fecha_inicio" className="block mb-1 font-medium mt-4">Fecha inicio de consulta:</label>
          <input type="date" id="fecha_inicio" name="fecha_inicio" required className="input" />

          <label htmlFor="seguro" className="block mb-1 font-medium mt-4">Seguro Medico:</label>
          <select
            id="seguro"
            name="seguro"
            required
            className="input"
            value={seguro}
            onChange={e => setSeguro(e.target.value)}
          >
            <option value="Ninguno">Ninguno</option>
            <option value="IHSS">IHSS</option>
            <option value="Mapfre">Mapfre</option>
            <option value="Palic">Palic</option>
            <option value="ficohsa_seguros">Ficohsa Seguros</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {seguro === 'otro' && (
            <>
              <label htmlFor="otro_seguro" className="block mb-1 font-medium mt-2">Especifique el nombre del seguro:</label>
              <input type="text" id="otro_seguro" name="otro_seguro" className="input" />
            </>
          )}

          {seguro !== 'Ninguno' && seguro !== '' && (
            <>
              <label htmlFor="poliza" className="block mb-1 font-medium mt-4"># Poliza:</label>
              <input type="text" id="poliza" name="poliza" className="input" />
            </>
          )}

          <label htmlFor="contacto" className="block mb-1 font-medium mt-4">Como nos contacto?</label>
          <input type="text" id="contacto" name="contacto" className="input" />
        </section>

        {/* Antecedentes Médicos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Antecedentes Médicos</h2>

          <label htmlFor="enfermedades" className="block mb-1 font-medium">Enfermedades sistémicas:</label>
          <textarea id="enfermedades" name="enfermedades" required className="textarea" />

          <label htmlFor="alergias" className="block mb-1 font-medium mt-4">Alergias:</label>
          <textarea id="alergias" name="alergias" required className="textarea" />

          <label htmlFor="medicamentos" className="block mb-1 font-medium mt-4">Medicamentos actuales:</label>
          <textarea id="medicamentos" name="medicamentos" required className="textarea" />

          <label htmlFor="hospitalizaciones" className="block mb-1 font-medium mt-4">Hospitalizaciones:</label>
          <textarea id="hospitalizaciones" name="hospitalizaciones" required className="textarea" />

          <label htmlFor="cirugias" className="block mb-1 font-medium mt-4">Cirugías previas:</label>
          <textarea id="cirugias" name="cirugias" required className="textarea" />

          <label htmlFor="embarazo" className="block mb-1 font-medium mt-4">Embarazo (si aplica):</label>
          <select id="embarazo" name="embarazo" className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="antecedentes_familiares" className="block mb-1 font-medium mt-4">Antecedentes Médicos Familiares:</label>
          <textarea id="antecedentes_familiares" name="antecedentes_familiares" required className="textarea" />

          <label htmlFor="vacunas" className="block mb-1 font-medium mt-4">Vacunas:</label>
          <textarea id="vacunas" name="vacunas" className="textarea" />

          <label htmlFor="observaciones_medicas" className="block mb-1 font-medium mt-4">Observaciones:</label>
          <textarea id="observaciones_medicas" name="observaciones_medicas" className="textarea" />
        </section>

        {/* Habitos */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Hábitos</h2>

          <label htmlFor="fumaSelect" className="block mb-1 font-medium">¿Fuma?</label>
          <select
            id="fumaSelect"
            name="fuma"
            required
            className="input"
            value={fuma}
            onChange={e => setFuma(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {fuma === 'si' && (
            <>
              <label htmlFor="fuma_cantidad" className="block mb-1 font-medium mt-2">Cantidad de cigarrillos:</label>
              <input type="number" id="fuma_cantidad" name="fuma_cantidad" className="input" />

              <label htmlFor="fuma_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia:</label>
              <select id="fuma_frecuencia" name="fuma_frecuencia" className="input">
                <option value="">Seleccionar</option>
                <option value="Social">Social</option>
                <option value="Diario">Diario</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensual">Mensual</option>
                <option value="Ocasional">Ocasional</option>
              </select>
            </>
          )}

          <label htmlFor="alcoholSelect" className="block mb-1 font-medium mt-4">¿Consume alcohol?</label>
          <select
            id="alcoholSelect"
            name="alcohol"
            required
            className="input"
            value={alcohol}
            onChange={e => setAlcohol(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {alcohol === 'si' && (
            <>
              <label htmlFor="alcohol_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia alcohol:</label>
              <select id="alcohol_frecuencia" name="alcohol_frecuencia" className="input">
                <option value="">Seleccionar</option>
                <option value="Social">Social</option>
                <option value="Diario">Diario</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensual">Mensual</option>
                <option value="Ocasional">Ocasional</option>
              </select>
            </>
          )}

          <label htmlFor="drogasSelect" className="block mb-1 font-medium mt-4">¿Consume drogas?</label>
          <select
            id="drogasSelect"
            name="drogas"
            required
            className="input"
            value={drogas}
            onChange={e => setDrogas(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {drogas === 'si' && (
            <>
              <label htmlFor="tipo_droga" className="block mb-1 font-medium mt-2">Tipo de droga:</label>
              <input type="text" id="tipo_droga" name="tipo_droga" className="input" />

              <label htmlFor="drogas_frecuencia" className="block mb-1 font-medium mt-2">Frecuencia drogas:</label>
              <select id="drogas_frecuencia" name="drogas_frecuencia" className="input">
                <option value="">Seleccionar</option>
                <option value="Social">Social</option>
                <option value="Diario">Diario</option>
                <option value="Semanal">Semanal</option>
                <option value="Mensual">Mensual</option>
                <option value="Ocasional">Ocasional</option>
              </select>
            </>
          )}

          <label htmlFor="cafeSelect" className="block mb-1 font-medium mt-4">Toma cafe:</label>
          <select
            id="cafeSelect"
            name="cafe"
            required
            className="input"
            value={cafe}
            onChange={e => setCafe(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {cafe === 'si' && (
            <>
              <label htmlFor="cantidad_tazas" className="block mb-1 font-medium mt-2">Cantidad de tazas:</label>
              <input type="number" id="cantidad_tazas" name="cantidad_tazas" min={1} defaultValue={1} className="input" />
            </>
          )}

          <label htmlFor="muerdeObjetosSelect" className="block mb-1 font-medium mt-4">Muerde objetos:</label>
          <select
            id="muerdeObjetosSelect"
            name="objetos"
            required
            className="input"
            value={objetos}
            onChange={e => setObjetos(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          {objetos === 'si' && (
            <>
              <label htmlFor="morder" className="block mb-1 font-medium mt-2">Tipo de objetos:</label>
              <textarea id="morder" name="morder" className="textarea" />
            </>
          )}

          <label htmlFor="hielo" className="block mb-1 font-medium mt-4">Muerde Hielo:</label>
          <select id="hielo" name="hielo" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="boca" className="block mb-1 font-medium mt-4">Respira por la boca:</label>
          <select id="boca" name="boca" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="refrescos" className="block mb-1 font-medium mt-4">Toma refrescos de cola:</label>
          <select id="refrescos" name="refrescos" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="dulces" className="block mb-1 font-medium mt-4">Come dulces:</label>
          <select id="dulces" name="dulces" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="pegajosos" className="block mb-1 font-medium mt-4">Consume alimentos pegajosos (chicles):</label>
          <select id="pegajosos" name="pegajosos" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="azucarados" className="block mb-1 font-medium mt-4">Consume alimentos azucarados:</label>
          <select id="azucarados" name="azucarados" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>

          <label htmlFor="obs" className="block mb-1 font-medium mt-4">Observaciones Adicionales:</label>
          <input type="text" id="obs" name="obs" className="input" />

          <label htmlFor="visitas_dentista" className="block mb-1 font-medium mt-4">Visitas al dentista (frecuencia):</label>
          <input type="text" id="visitas_dentista" name="visitas_dentista" className="input" />

          <label htmlFor="obsgen" className="block mb-1 font-medium mt-4">Observaciones generales:</label>
          <textarea id="obsgen" name="obsgen" className="textarea" />
        </section>

        {/* Evaluación Odontológica */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Evaluación Odontológica</h2>

          <label htmlFor="motivo" className="block mb-1 font-medium">Motivo de consulta:</label>
          <textarea id="motivo" name="motivo" required className="textarea" />

          <label htmlFor="historial" className="block mb-1 font-medium mt-4">Historial dental previo:</label>
          <textarea id="historial" name="historial" className="textarea" />

          <label htmlFor="sangradoEnciasSelect" className="block mb-1 font-medium mt-4">Sangrado de Encias:</label>
          <select
            id="sangradoEnciasSelect"
            name="encias"
            required
            className="input"
            value={encias}
            onChange={e => setEncias(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {encias === 'si' && (
            <>
              <label htmlFor="sangrado_encia" className="block mb-1 font-medium mt-2">Tipo de sangrado de encia:</label>
              <textarea id="sangrado_encia" name="sangrado_encia" className="textarea" />
            </>
          )}

          <label htmlFor="dolorMasticarSelect" className="block mb-1 font-medium mt-4">Dolor al masticar:</label>
          <select
            id="dolorMasticarSelect"
            name="dolor"
            required
            className="input"
            value={dolor}
            onChange={e => setDolor(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolor === 'si' && (
            <>
              <label htmlFor="dolor_masticar" className="block mb-1 font-medium mt-2">Tipo de dolor:</label>
              <textarea id="dolor_masticar" name="dolor_masticar" className="textarea" />
            </>
          )}

          <label htmlFor="dolorCabezaSelect" className="block mb-1 font-medium mt-4">Dolor de cabeza frecuente:</label>
          <select
            id="dolorCabezaSelect"
            name="dolor_cabeza"
            required
            className="input"
            value={dolorCabeza}
            onChange={e => setDolorCabeza(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolorCabeza === 'si' && (
            <>
              <label htmlFor="dolor_cabeza_detalle" className="block mb-1 font-medium mt-2">Tipo de dolor de cabeza:</label>
              <textarea id="dolor_cabeza_detalle" name="dolor_cabeza_detalle" className="textarea" />
            </>
          )}

          <label htmlFor="chasquidosSelect" className="block mb-1 font-medium mt-4">Chasquidos mandibulares:</label>
          <select
            id="chasquidosSelect"
            name="chasquidos"
            required
            className="input"
            value={chasquidos}
            onChange={e => setChasquidos(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {chasquidos === 'si' && (
            <>
              <label htmlFor="chasquidos_mandibulares" className="block mb-1 font-medium mt-2">Tipo de chasquidos mandibulares:</label>
              <textarea id="chasquidos_mandibulares" name="chasquidos_mandibulares" className="textarea" />
            </>
          )}

          <label htmlFor="dolorOidoSelect" className="block mb-1 font-medium mt-4">Dolor de oido frecuente:</label>
          <select
            id="dolorOidoSelect"
            name="dolor_oido"
            required
            className="input"
            value={dolorOido}
            onChange={e => setDolorOido(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {dolorOido === 'si' && (
            <>
              <label htmlFor="dolor_oido_detalle" className="block mb-1 font-medium mt-2">Tipo de dolor de oido:</label>
              <textarea id="dolor_oido_detalle" name="dolor_oido_detalle" className="textarea" />
            </>
          )}

          <label htmlFor="suction_digital" className="block mb-1 font-medium mt-4">Succión digital:</label>
          <select id="suction_digital" name="suction_digital" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="ortodonciaSelect" className="block mb-1 font-medium mt-4">Utilizo ortodoncia?</label>
          <select
            id="ortodonciaSelect"
            name="ortodoncia"
            required
            className="input"
            value={ortodoncia}
            onChange={e => setOrtodoncia(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {ortodoncia === 'si' && (
            <>
              <label htmlFor="finalizoTratamientoSelect" className="block mb-1 font-medium mt-2">Finalizó tratamiento:</label>
              <select
                id="finalizoTratamientoSelect"
                name="orto_finalizado"
                className="input"
                value={finalizoTratamiento}
                onChange={e => setFinalizoTratamiento(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>

              {finalizoTratamiento === 'no' && (
                <>
                  <label htmlFor="orto_motivo_no_finalizado" className="block mb-1 font-medium mt-2">Motivo de no finalizar tratamiento:</label>
                  <textarea id="orto_motivo_no_finalizado" name="orto_motivo_no_finalizado" className="textarea" />
                </>
              )}
            </>
          )}

          <label htmlFor="protesisSelect" className="block mb-1 font-medium mt-4">Uso de Prótesis:</label>
          <select
            id="protesisSelect"
            name="protesis"
            required
            className="input"
            value={protesis}
            onChange={e => setProtesis(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {protesis === 'si' && (
            <>
              <label htmlFor="protesis_tipo" className="block mb-1 font-medium mt-2">Tipo de Prótesis:</label>
              <select id="protesis_tipo" name="protesis_tipo" className="input">
                <option value="">Seleccionar</option>
                <option value="Removible">Removible</option>
                <option value="Fija">Fija</option>
                <option value="Implante">Implante</option>
              </select>

              <label htmlFor="protesis_nocturno" className="block mb-1 font-medium mt-2">Uso nocturno de protesis:</label>
              <select id="protesis_nocturno" name="protesis_nocturno" className="input">
                <option value="">Seleccionar</option>
                <option value="no">No</option>
                <option value="si">Si</option>
              </select>
            </>
          )}

          <label htmlFor="sensibilidad" className="block mb-1 font-medium mt-4">Sensibilidad:</label>
          <select id="sensibilidad" name="sensibilidad" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="bruxismoSelect" className="block mb-1 font-medium mt-4">Bruxismo:</label>
          <select
            id="bruxismoSelect"
            name="bruxismo"
            required
            className="input"
            value={bruxismo}
            onChange={e => setBruxismo(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          {bruxismo === 'si' && (
            <>
              <label htmlFor="tipo_bruxismo" className="block mb-1 font-medium mt-2">Tipo de Bruxismo:</label>
              <select id="tipo_bruxismo" name="tipo_bruxismo" className="input">
                <option value="">Seleccionar</option>
                <option value="diurno">Diurno</option>
                <option value="nocturno">Nocturno</option>
                <option value="ambos">Ambos</option>
              </select>
            </>
          )}

          <label htmlFor="ultima_limpieza" className="block mb-1 font-medium mt-4">Última Limpieza Dental:</label>
          <input type="text" id="ultima_limpieza" name="ultima_limpieza" className="input" />

          <label htmlFor="f_cepillado" className="block mb-1 font-medium mt-4">Frecuencia de cepillado diario:</label>
          <input type="number" id="f_cepillado" name="f_cepillado" required className="input" />

          <label htmlFor="tipocepillo" className="block mb-1 font-medium mt-4">Tipo de cepillo dental:</label>
          <input type="text" id="tipocepillo" name="tipocepillo" className="input" />

          <label htmlFor="pastadental" className="block mb-1 font-medium mt-4">Tipo de pasta dental:</label>
          <input type="text" id="pastadental" name="pastadental" required className="input" />

          <label htmlFor="cambio_cepillo" className="block mb-1 font-medium mt-4">Cada cuanto cambia el cepillo dental?</label>
          <input type="text" id="cambio_cepillo" name="cambio_cepillo" required className="input" />

          <label htmlFor="hilo_dental" className="block mb-1 font-medium mt-4">Uso de hilo dental:</label>
          <select id="hilo_dental" name="hilo_dental" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="enjuague_bucal" className="block mb-1 font-medium mt-4">Uso de enjuague bucal:</label>
          <select id="enjuague_bucal" name="enjuague_bucal" required className="input">
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>

          <label htmlFor="necesita_ortodoncia" className="block mb-1 font-medium mt-4">¿Desea Ortodoncia?</label>
          <select
            id="necesita_ortodoncia"
            name="necesita_ortodoncia"
            required
            className="input"
            value={necesitaOrtodoncia}
            onChange={e => setNecesitaOrtodoncia(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="no">No</option>
            <option value="si">Si</option>
            <option value="en_tratamiento">En tratamiento</option>
          </select>

          {(necesitaOrtodoncia === 'si' || necesitaOrtodoncia === 'en_tratamiento') && (
            <>
              <label htmlFor="detalles_ortodoncia_text" className="block mb-1 font-medium mt-2">Diagnóstico Ortodóntico:</label>
              <textarea id="detalles_ortodoncia_text" name="detalles_ortodoncia" className="textarea" rows={3} />
            </>
          )}

          <h3 className="text-lg font-semibold mt-8 mb-4 border-b border-teal-300 pb-1">Examen Intraoral</h3>

          <label htmlFor="relacion_molar" className="block mb-1 font-medium">Relación molar:</label>
          <select id="relacion_molar" name="relacion_molar" className="input">
            <option value="clase1">Clase I</option>
            <option value="clase2_div1">Clase II div.1</option>
            <option value="clase2_div2">Clase II div.2</option>
            <option value="clase3">Clase III</option>
          </select>

          <label htmlFor="relacion_canina" className="block mb-1 font-medium mt-4">Relación Canina:</label>
          <select id="relacion_canina" name="relacion_canina" className="input">
            <option value="clase1">Clase I</option>
            <option value="clase2">Clase II</option>
            <option value="clase3">Clase III</option>
          </select>

          <label htmlFor="tipo_mordida" className="block mb-1 font-medium mt-4">Tipo de mordida:</label>
          <select id="tipo_mordida" name="tipo_mordida" className="input">
            <option value="normal">Normal</option>
            <option value="abierta">Abierta</option>
            <option value="cruzada">Cruzada</option>
            <option value="bordeaborde">Borde a borde</option>
            <option value="profunda">Profunda</option>
          </select>

          <label htmlFor="apiñamiento" className="block mb-1 font-medium mt-4">Apiñamiento:</label>
          <select id="apiñamiento" name="apiñamiento" className="input">
            <option value="ninguno">Ninguno</option>
            <option value="leve">Leve</option>
            <option value="medio">Moderado</option>
            <option value="grave">Severo</option>
          </select>

          <label htmlFor="espacios" className="block mb-1 font-medium mt-4">Espacio:</label>
          <select id="espacios" name="espacios" className="input">
            <option value="ninguno">Ninguno</option>
            <option value="diastemas">Diastemas</option>
            <option value="exodonciaprevias">Exodoncias previas</option>
          </select>

          <label htmlFor="lineamedia" className="block mb-1 font-medium mt-4">Línea media dental:</label>
          <select id="lineamedia" name="lineamedia" className="input">
            <option value="centrada">Centrada</option>
            <option value="desviada_derecha">Desviada a derecha</option>
            <option value="desviada_izquierda">Desviada a izquierda</option>
          </select>
        </section>

        {/* Plan de Tratamiento */}
        <section>
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-teal-300 pb-2">Plan de Tratamiento</h2>

          <label htmlFor="diagnostico" className="block mb-1 font-medium">Diagnóstico:</label>
          <textarea id="diagnostico" name="diagnostico" className="textarea" />

          <label htmlFor="tipo_aparatologia_select" className="block mb-1 font-medium mt-4">Seleccione el tipo de aparatología:</label>
          <select id="tipo_aparatologia_select" name="tipo_aparatologia" className="input">
            <option value="">Seleccionar</option>
            <option value="brackets_metalicos">Brackets Metálicos</option>
            <option value="brackets_esteticos">Brackets Estéticos</option>
            <option value="ortodoncia_lingual">Ortodoncia Lingual</option>
            <option value="alineadores_invisalign">Alineadores (Invisalign)</option>
            <option value="aparato_removible">Aparato Removible</option>
            <option value="expansor_palatino">Expansor Palatino</option>
            <option value="retenedores">Retenedores</option>
            <option value="aparato_funcional">Aparato Funcional</option>
            <option value="otro">Otro (especificar)</option>
          </select>

          {/* TODO: Add conditional input for otro_aparatologia if needed */}

          <label htmlFor="tratamiento" className="block mb-1 font-medium mt-4">Tratamiento propuesto:</label>
          <textarea id="tratamiento" name="tratamiento" className="textarea" style={{ minHeight: '100px' }} />

          <label htmlFor="documentos" className="block mb-1 font-medium mt-4">Documentos adjuntos:</label>
          <input type="file" id="documentos" name="documentos" multiple accept=".pdf,.jpg,.jpeg,.png" className="input" />

          <label htmlFor="observaciones_plan" className="block mb-1 font-medium mt-4">Observaciones:</label>
          <textarea id="observaciones_plan" name="observaciones_plan" className="textarea" />

          <div className="mt-6 flex items-center space-x-2">
            <input type="checkbox" id="confirm_info" name="confirm_info" required />
            <label htmlFor="confirm_info" className="font-medium">Confirmo que la información proporcionada es correcta.</label>
          </div>

          {/* Signature Section */}
          {isEditing && existingSignature ? (
            <SignatureDisplay signatureUrl={existingSignature} />
          ) : (
            <SignaturePadComponent 
              onChange={setSignatureData}
              value={signatureData}
            />
          )}

          <div className="mt-8 text-center">
            <button 
              type="submit" 
              className="btn btn-primary px-6 py-2 rounded bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}