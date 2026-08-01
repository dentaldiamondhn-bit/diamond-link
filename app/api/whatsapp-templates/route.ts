import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        return NextResponse.json({ error: error.message }, { status: 500 });
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const templates: Record<string, string> = body;

    if (!templates || typeof templates !== 'object') {
      return NextResponse.json({ error: 'Invalid templates payload' }, { status: 400 });
    }

    // Get current templates to compare
    const { data: currentTemplates } = await supabase
      .from('whatsapp_templates')
      .select('tipo, message_text');

    const currentMap = new Map(currentTemplates?.map(t => [t.tipo, t.message_text]) || []);

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

    // Save history for changed templates
    const historyEntries = Object.entries(templates)
      .filter(([tipo, message_text]) => currentMap.get(tipo) !== message_text)
      .map(([tipo, message_text]) => ({
        tipo,
        message_text,
        changed_by: user.userId,
        changed_by_name: user.name,
        changed_by_image: user.image,
      }));

    if (historyEntries.length > 0) {
      const { error: historyError } = await supabase
        .from('whatsapp_templates_history')
        .insert(historyEntries);

      if (historyError) {
        console.error('Error saving whatsapp templates history:', historyError);
        // Don't fail the request, just log
      }
    }

    return NextResponse.json({ ok: true, templates: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'doctor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify the history entry belongs to the current user (or user is admin)
    const { data: historyEntry } = await supabase
      .from('whatsapp_templates_history')
      .select('changed_by')
      .eq('id', id)
      .single();

    if (!historyEntry) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    if (historyEntry.changed_by !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
