import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const VALID_TIPOS: Record<string, boolean> = {
  limpieza: true,
  ortodoncia: true,
  otro: true,
};

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

async function getCurrentUser(): Promise<{ userId: string; role: string; name: string; image: string } | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    if (!process.env.CLERK_SECRET_KEY) return null;
    const user = await clerk.users.getUser(userId);
    const role = (user.publicMetadata?.role || user.privateMetadata?.role || 'staff') as string;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.emailAddresses[0]?.emailAddress || 'Usuario';
    const image = user.profileImageUrl || user.imageUrl || '';
    return { userId, role: role.toLowerCase(), name, image };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tipo = searchParams.get('tipo');

    // If tipo is specified, return history for that tipo
    if (tipo) {
      const { data, error } = await supabase
        .from('whatsapp_templates_history')
        .select('*')
        .eq('tipo', tipo)
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching whatsapp templates history:', error);
        // If table doesn't exist (PGRST116), return empty array instead of 500
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.code === '42P01') {
          return NextResponse.json([]);
        }
        // Return empty array for any other error to prevent 500 breaking the UI
        return NextResponse.json([]);
      }

      return NextResponse.json(data || []);
    }

    // Otherwise return current templates
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
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid templates payload' }, { status: 400 });
    }

    // Only accept known template types so saving one tab never touches others
    const templates: Record<string, string> = {};
    for (const [tipo, message_text] of Object.entries(body)) {
      if (VALID_TIPOS[tipo] && typeof message_text === 'string') {
        templates[tipo] = message_text;
      }
    }

    if (Object.keys(templates).length === 0) {
      return NextResponse.json({ error: 'No valid templates to save' }, { status: 400 });
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

    // Save history for all template updates
    const entriesToInsert = Object.entries(templates).map(([tipo, message_text]) => ({
      tipo,
      message_text,
      changed_by: user.userId,
      changed_by_name: user.name,
      changed_by_image: user.image,
    }));

    if (entriesToInsert.length > 0) {
      const { error: historyError } = await supabase
        .from('whatsapp_templates_history')
        .insert(entriesToInsert);

      if (historyError) {
        console.error('Error saving whatsapp templates history:', historyError);
      }
    }

    return NextResponse.json({ ok: true, templates: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('whatsapp_templates_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting whatsapp templates history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
