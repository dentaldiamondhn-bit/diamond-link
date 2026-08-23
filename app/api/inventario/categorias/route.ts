import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*, subcategorias(*)')
      .order('nombre');

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching categorias:', error);
    return NextResponse.json({ error: 'Error al obtener categorías' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, subcategorias } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
    }

    const { data: categoria, error: catError } = await supabase
      .from('categorias')
      .insert({ nombre: nombre.trim() })
      .select()
      .single();

    if (catError) throw catError;

    if (subcategorias && subcategorias.length > 0) {
      const subRows = subcategorias
        .filter((s: string) => s?.trim())
        .map((s: string) => ({ categoria_id: categoria.id, nombre: s.trim() }));

      if (subRows.length > 0) {
        const { error: subError } = await supabase
          .from('subcategorias')
          .insert(subRows);

        if (subError) throw subError;
      }
    }

    const { data: result } = await supabase
      .from('categorias')
      .select('*, subcategorias(*)')
      .eq('id', categoria.id)
      .single();

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating categoria:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const body = await request.json();
    const { nombre, subcategorias } = body;

    if (nombre?.trim()) {
      const { error } = await supabase
        .from('categorias')
        .update({ nombre: nombre.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    }

    if (subcategorias !== undefined) {
      await supabase.from('subcategorias').delete().eq('categoria_id', id);
      const subRows = subcategorias
        .filter((s: string) => s?.trim())
        .map((s: string) => ({ categoria_id: id, nombre: s.trim() }));
      if (subRows.length > 0) {
        const { error } = await supabase.from('subcategorias').insert(subRows);
        if (error) throw error;
      }
    }

    const { data: result } = await supabase
      .from('categorias')
      .select('*, subcategorias(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error updating categoria:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting categoria:', error);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
