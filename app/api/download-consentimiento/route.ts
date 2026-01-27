import { NextRequest, NextResponse } from 'next/server';
import { URL } from 'url';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const consentimientoId = searchParams.get('id');
    const patientName = searchParams.get('patient');
    const date = searchParams.get('date');

    if (!consentimientoId || !patientName || !date) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Simple HTML content to avoid any template issues
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Consentimiento Informado - ${patientName}</title>
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
        <p>Yo, <span class="field">${patientName}</span> con el documento de identidad <span class="field">_____________________</span> y que resido en el domicilio <span class="field">__________________________________________</span> por medio del presente documento hago constar lo siguiente.</p>
        
        <div style="margin-left: 30px;">
            <p>• Que he acudido a la clínica Dental Diamond donde he sido atendido por <span class="field">_________________________</span>.</p>
            <p>• Que se me ha explicado que debo participar en la elaboración de un diagnostico odontológico el cual incluirá un exámen clínico, un examen radiográfico de ser necesario y un expediente clínico con mi información personal. Asi mismo, me ha sido advertido y se me ha explicado claramente los riesgos de salud que ocurrirían al no cumplir con las recomendaciones que el odontólogo me proporcione, liberándolo de toda responsabilidad.</p>
            <p>• Que entiendo que todos los tratamientos NO son gratuitos, ya que conllevan un costo el cual será comunicado previamente a realizar cualquier tratamiento y al llegar a un acuerdo se procederá luego de su cancelación.</p>
            <p>• Autorizo a la clínica antes dicha a la toma de fotografías publicación con fines demostrativos y educativos para posteriormente publicar en redes sociales.</p>
        </div>
        
        <p style="margin-top: 30px; text-align: center;">
            <strong>Fecha:</strong> ${date}
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
</html>`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="consentimiento_${patientName}_${date}.html"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
