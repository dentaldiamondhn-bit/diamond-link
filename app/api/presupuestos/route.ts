import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');

    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Check for expired quotes and update their status
    const now = new Date().toISOString();
    await supabase
      .from('presupuestos')
      .update({ status: 'expired' })
      .eq('patient_id', patient_id)
      .eq('status', 'pending')
      .lt('expires_at', now);

    // Fetch quotes for the patient
    const { data: quotes, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('patient_id', patient_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }

    return NextResponse.json({ quotes: quotes || [] });
  } catch (error) {
    console.error('Error in GET /api/presupuestos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      patient_id,
      patient_name,
      treatment_description,
      notes,
      items,
      total_amount,
      doctor_name,
      expires_at
    } = body;

    // Validate required fields
    if (!patient_id || !patient_name || !treatment_description || !items || !total_amount || !doctor_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the quote
    const { data: quote, error } = await supabase
      .from('presupuestos')
      .insert([{
        patient_id,
        patient_name,
        treatment_description,
        notes: notes || null,
        items,
        total_amount,
        doctor_name,
        status: 'pending',
        expires_at,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Quote created successfully',
      quote 
    });
  } catch (error) {
    console.error('Error in POST /api/presupuestos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { quote_id, status } = body;

    if (!quote_id || !status) {
      return NextResponse.json({ error: 'Quote ID and status are required' }, { status: 400 });
    }

    const updateData: any = { status };

    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    }

    const { data: quote, error } = await supabase
      .from('presupuestos')
      .update(updateData)
      .eq('id', quote_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote:', error);
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Quote updated successfully',
      quote 
    });
  } catch (error) {
    console.error('Error in PUT /api/presupuestos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
