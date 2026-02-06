import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const especialidad = searchParams.get('especialidad');

    let query = supabase
      .from('tratamientos')
      .select('*')
      .eq('activo', true); // Only get active treatments

    // Apply filters if provided
    if (search) {
      query = query.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%,especialidad.ilike.%${search}%`);
    }

    if (especialidad) {
      query = query.eq('especialidad', especialidad);
    }

    const { data: treatments, error } = await query.order('especialidad, nombre', { ascending: true });

    if (error) {
      console.error('Error fetching treatments for quotes:', error);
      // Check if it's a "relation does not exist" error
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('tratamientos table does not exist, returning empty array');
        return NextResponse.json({ treatments: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 });
    }

    // Get unique specialties for filtering
    const { data: specialtiesData, error: specialtiesError } = await supabase
      .from('tratamientos')
      .select('especialidad')
      .eq('activo', true);

    let specialties: string[] = [];
    if (!specialtiesError && specialtiesData) {
      specialties = [...new Set(specialtiesData.map(t => t.especialidad))].sort();
    }

    return NextResponse.json({ 
      treatments: treatments || [],
      specialties: specialties
    });
  } catch (error) {
    console.error('Error in GET /api/tratamientos/quotes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
