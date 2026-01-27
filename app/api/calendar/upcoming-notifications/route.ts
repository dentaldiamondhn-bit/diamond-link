import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    // Fetch events from database instead of Google Calendar API
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .gte('start', now.toISOString())
      .lte('start', twoHoursFromNow.toISOString())
      .order('start', { ascending: true });
    
    if (error) {
      console.error('Database error fetching events:', error);
      return NextResponse.json([], { status: 500 });
    }
    
    // Format events for notifications
    const upcomingEvents = (events || []).map(event => {
      const eventStart = new Date(event.start);
      const timeDiff = eventStart.getTime() - now.getTime();
      const timeUntil = Math.floor(timeDiff / (1000 * 60)); // minutes
      
      let timeUntilText = '';
      if (timeUntil <= 5) {
        timeUntilText = 'menos de 5 minutos';
      } else if (timeUntil <= 15) {
        timeUntilText = 'menos de 15 minutos';
      } else if (timeUntil <= 30) {
        timeUntilText = 'menos de 30 minutos';
      } else if (timeUntil <= 60) {
        timeUntilText = 'menos de 1 hora';
      } else {
        timeUntilText = 'menos de 2 horas';
      }
      
      return {
        id: event.id,
        title: event.title || 'Evento programado',
        start: event.start,
        timeUntil: timeUntilText,
        minutesUntil: timeUntil
      };
    });

    console.log('Upcoming events found:', upcomingEvents.length);
    return NextResponse.json(upcomingEvents);
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return NextResponse.json([], { status: 500 });
  }
}
