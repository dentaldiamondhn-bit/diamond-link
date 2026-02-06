// Pre-defined consent templates for the dental clinic
export interface ConsentTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  content: string;
}

export const CONSENT_TEMPLATES: ConsentTemplate[] = [
  {
    id: 'ortodoncia',
    name: 'Consentimiento Informado para Tratamiento de Ortodoncia',
    type: 'ortodoncia',
    description: 'Consentimiento informado especial para tratamientos de ortodoncia y ortopedia dentofacial',
    content: `CONSENTIMIENTO INFORMADO PARA TRATAMIENTO DE ORTODONCIA
CLÍNICA DENTAL DIAMOND

Un tratamiento de ortodoncia exitoso es el resultado de una excelente relación entre el especialista y el paciente. En Clínica Dental Diamond, nos dedicamos a lograr su mejor sonrisa; sin embargo, como en toda disciplina médica, existen riesgos y limitaciones que usted debe conocer y aceptar antes de iniciar.

I. GENERALIDADES DEL TRATAMIENTO
Naturaleza de la Especialidad: La Ortodoncia y Ortopedia Dentofacial se encarga del diagnóstico, prevención y corrección de las maloclusiones y anomalías óseas. En nuestra clínica, este tratamiento es supervisado o ejecutado por especialistas con postgrado acreditado.
Resultados: Aunque planificamos para el éxito, no es posible garantizar satisfacción total ni prever todas las complicaciones. El éxito depende de su cooperación (citas, higiene y cuidado de aparatos).
Duración: El tiempo estimado puede extenderse por crecimiento imprevisto, falta de cooperación o problemas biológicos (periodontales). Extensiones significativas podrían generar honorarios adicionales.

II. RIESGOS Y LIMITACIONES COMUNES
Molestias: Durante el periodo de adaptación o ajustes, es normal sentir sensibilidad. Se pueden utilizar analgésicos comunes.
Descalcificación y Caries: La higiene deficiente con brackets aumenta drásticamente el riesgo de manchas blancas, caries y enfermedad periodontal. Son necesarias limpiezas regulares en Clínica Dental Diamond.
Resorción Radicular: Las raíces de algunos pacientes pueden acortarse durante el movimiento. Si se detecta una resorción significativa, el tratamiento podría pausarse o interrumpirse.
Recidiva (Movimiento Post-Tratamiento): Los dientes tienden a moverse toda la vida. El uso de retenedores es obligatorio por años para mantener los resultados. Sin ellos, los dientes se desplazarán.

III. COMPLICACIONES POTENCIALES
Daño Pulpar: Dientes con traumas previos o caries profundas pueden sufrir daño en el nervio al ser movidos, requiriendo endodoncia o, en casos graves, la pérdida del diente.
Articulación Temporomandibular (ATM): Pueden aparecer ruidos, dolor o dolores de cabeza. Cualquier síntoma debe informarse de inmediato a la Dra. Calix.
Lesiones por Aparatos: Brackets o alambres sueltos pueden causar llagas o ser ingeridos/inhalados. Informe cualquier daño en cuanto lo advierta.
Anclaje Temporal (Microtornillos): Si se requieren, existe riesgo de inflamación, aflojamiento o contacto con raíces nerviosas.

IV. RECONOCIMIENTO Y AUTORIZACIÓN
Consentimiento de Tratamiento: Reconozco que he leído y entendido este formulario. He tenido la oportunidad de hacer preguntas y comprendo las alternativas al tratamiento (incluyendo no realizarse nada). Doy mi consentimiento para el plan propuesto en Clínica Dental Diamond.
Registros Diagnósticos: Autorizo la toma de radiografías, fotografías y modelos antes, durante y después del tratamiento.
Uso de Información: Autorizo el uso de mis registros para fines de interconsulta profesional, educación o publicaciones científicas, resguardando mi identidad.
Honorarios: Entiendo que el costo de ortodoncia no incluye servicios de otros especialistas (cirugía, limpiezas, endodoncias o restauraciones).

Firma del Paciente / Padre o Tutor: ____________________________________________ 
(Nombre del Paciente: _______________________________________________________)
Fecha: ____________________

Firma del Profesional (Clínica Dental Diamond): ____________________________________`
  },
  {
    id: 'general',
    name: 'Consentimiento Informado General',
    type: 'otros',
    description: 'Consentimiento informado general para tratamientos odontológicos',
    content: `CONSENTIMIENTO INFORMADO GENERAL
CLÍNICA DENTAL DIAMOND

Yo, {{PATIENT_NAME}} con el documento de identidad{{PATIENT_ID}} y que resido en el domicilio{{PATIENT_ADDRESS}} por medio del presente documento hago constar lo siguiente.

• Que he acudido a la clínica Dental Diamond donde he sido atendido por {{DOCTOR_NAME}}.

• Que se me ha explicado que debo participar en la elaboración de un diagnostico odontológico el cual incluirá un exámen clínico, un examen radiográfico de ser necesario y un expediente clínico con mi información personal. Asi mismo, me ha sido advertido y se me ha explicado claramente los riesgos de salud que ocurrirían al no cumplir con las recomendaciones que el odontólogo me proporcione, liberándolo de toda responsabilidad.

• Que entiendo que todos los tratamientos NO son gratuitos, ya que conllevan un costo el cual será comunicado previamente a realizar cualquier tratamiento y al llegar a un acuerdo se procederá luego de su cancelación.

• Autorizo a la clínica antes dicha a la toma de fotografías publicación con fines demostrativos y educativos para posteriormente publicar en redes sociales.`
  }
];

// Helper function to get template by ID
export function getConsentTemplate(templateId: string): ConsentTemplate | undefined {
  return CONSENT_TEMPLATES.find(template => template.id === templateId);
}

// Helper function to get templates by type
export function getConsentTemplatesByType(type: string): ConsentTemplate[] {
  return CONSENT_TEMPLATES.filter(template => template.type === type);
}

// Helper function to get all template types
export function getConsentTemplateTypes(): string[] {
  return [...new Set(CONSENT_TEMPLATES.map(template => template.type))];
}
