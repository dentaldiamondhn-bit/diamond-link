import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_TEMPLATES: Record<string, string> = {
  limpieza: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Solo queríamos recordarte que ya toca tu limpieza dental 😉
Hacerla cada 6 meses ayuda a mantener tu sonrisa sana y brillante 😁✨

💎 También aprovecha tu 14vo con las siguientes promociones 💎😁✨:
*Limpieza mas 3 tapones en molares a 1,599lps*
*Limpieza al 2x1 a 900lps*
*3 tapones en molares a 999lps*

Agenda tu cita con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto y cuidar tu sonrisa! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,

  ortodoncia: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Es hora de tu revisión de ortodoncia 📋
Mantener tus aparatos o alineadores en óptimas condiciones es clave para una sonrisa perfecta 😁✨

Agenda tu cita de control con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,

  otro: `💎 ¡Hola! Somos Clínica Dental Diamond 🦷

¡Esperamos que estés muy bien! 🌞
Solo queríamos recordarte que es importante mantener tus controles al día 😁✨

Agenda tu cita con nosotros:
📞 9498-5346 o en nuestra pagina *dentaldiamondhn.com*
📍 Barrio Guamilito 6ta calle entre 9y10 avenida, Plaza Insolh local A3

¡Nos encantará verte pronto! 💙
Clínica Dental Diamond – Tu sonrisa, nuestra prioridad 😍`,
};

async function getCurrentUserRole(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    if (!process.env.CLERK_SECRET_KEY) return null;
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(userId);
    const role = (user.publicMetadata?.role || user.privateMetadata?.role || 'staff') as string;
    return role.toLowerCase();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const role = await getCurrentUserRole();
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .select('tipo, message_text')
      .order('tipo', { ascending: true });

    if (error) {
      console.error('Error fetching whatsapp templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const templates: Record<string, string> = {};
    if (data && data.length > 0) {
      for (const row of data) {
        templates[row.tipo] = row.message_text;
      }
    } else {
      Object.assign(templates, DEFAULT_TEMPLATES);
    }

    return NextResponse.json(templates);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const role = await getCurrentUserRole();
    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (role !== 'admin' && role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const templates: Record<string, string> = body;

    if (!templates || typeof templates !== 'object') {
      return NextResponse.json({ error: 'Invalid templates payload' }, { status: 400 });
    }

    const updates = Object.entries(templates).map(([tipo, message_text]) => ({
      tipo,
      message_text,
    }));

    const { data, error } = await supabase
      .from('whatsapp_templates')
      .upsert(updates, { onConflict: ['tipo'] })
      .select();

    if (error) {
      console.error('Error updating whatsapp templates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, templates: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
