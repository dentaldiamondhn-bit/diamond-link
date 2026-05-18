
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const odontogramId = params.id;

    const { data: odontogram, error } = await supabase
      .from('odontogram_pilots')
      .select('*')
      .eq('id', odontogramId)
      .single();

    if (error) {
      console.error('Error fetching odontogram-pilot:', error);
      return NextResponse.json({ error: 'Failed to fetch odontogram-pilot' }, { status: 500 });
    }

    if (!odontogram) {
      return NextResponse.json({ error: 'Odontogram-pilot not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Odontogram-pilot found',
      odontogram 
    });
  } catch (error) {
    console.error('Error in GET /api/odontogram-pilot/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const odontogramId = params.id;
    const body = await request.json();
    const { datos_odontograma, notas, activo } = body;

    console.log('PUT odontogram-pilot:', { odontogramId, hasDatos: !!datos_odontograma, hasNotas: !!notas, activo });

    const updatePayload: Record<string, any> = {
      datos_odontograma,
      fecha_actualizacion: new Date().toISOString()
    };

    if (notas !== undefined) {
      updatePayload.notas = notas;
    }
    if (activo !== undefined) {
      updatePayload.activo = activo;
    }

    const { data: updatedOdontogram, error } = await supabase
      .from('odontogram_pilots')
      .update(updatePayload)
      .eq('id', odontogramId)
      .select()
      .single();

    if (error) {
      console.error('Error updating odontogram-pilot:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: 'Failed to update odontogram-pilot', details: error.message }, { status: 500 });
    }

    if (!updatedOdontogram) {
      return NextResponse.json({ error: 'Odontogram-pilot not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Odontogram-pilot updated successfully',
      odontogram: updatedOdontogram
    });
  } catch (error) {
    console.error('Error in PUT /api/odontogram-pilot/[id]:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const odontogramId = params.id;

    const { error } = await supabase
      .from('odontogram_pilots')
      .delete()
      .eq('id', odontogramId);

    if (error) {
      console.error('Error deleting odontogram-pilot:', error);
      return NextResponse.json({ error: 'Failed to delete odontogram-pilot' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Odontogram-pilot deleted successfully'
    });
  } catch (error) {
    console.error('Error in DELETE /api/odontogram-pilot/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
