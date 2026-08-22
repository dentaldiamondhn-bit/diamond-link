import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Custom tool bridge for Odysseus to interact with diamond-link operations
export async function POST(request: NextRequest) {
  try {
    // Skip auth for internal calls from odysseus-chat
    // The odysseus-chat route already handles authentication
    const { userId } = await auth();

    // Only require auth if not called internally (check for special header)
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    if (!userId && !isInternalCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tool, params } = await request.json();

    if (!tool) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
    }

    const supabase = createClient();

    let result;

    switch (tool) {
      case 'get_doctors':
        result = await getDoctors(supabase, params);
        break;
      case 'get_users':
        result = await getUsers(params);
        break;
      case 'get_periodontal_studies':
        result = await getPeriodontalStudies(supabase, params);
        break;
      case 'get_notifications':
        result = await getNotifications(userId);
        break;
      case 'get_odontogram':
        result = await getOdontogram(supabase, params);
        break;
      case 'execute_sql':
        result = await executeSQL(supabase, params);
        break;
      case 'get_payments_by_treatment':
        result = await getPaymentsByTreatment(supabase, params);
        break;
      case 'get_treatments':
        result = await getTreatments(supabase, params);
        break;
      case 'get_reports_data':
        result = await getReportsData(supabase, params);
        break;
      case 'get_doctor_performance':
        result = await getDoctorPerformance(supabase, params);
        break;
      case 'get_treatment_types':
        result = await getTreatmentTypes(supabase, params);
        break;
      case 'search_patients':
        result = await searchPatients(supabase, params);
        break;
      case 'create_treatment':
        result = await createTreatment(supabase, params);
        break;
      case 'search_treatments':
        result = await searchTreatments(supabase, params);
        break;
      case 'get_quotes':
        result = await getQuotes(supabase, params);
        break;
      case 'create_quote':
        result = await createQuote(supabase, params);
        break;
      case 'update_quote':
        result = await updateQuote(supabase, params);
        break;
      case 'get_timeline_notes':
        result = await getTimelineNotes(supabase, params);
        break;
      case 'create_timeline_note':
        result = await createTimelineNote(supabase, params);
        break;
      case 'get_tickets':
        result = await getTickets(supabase, params);
        break;
      case 'create_ticket':
        result = await createTicket(supabase, params);
        break;
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error executing custom tool:', error);
    return NextResponse.json(
      { error: 'Failed to execute tool', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getDoctors(supabase: any, params: any) {
  const { search, specialty } = params || {};
  
  let query = supabase.from('doctors').select('*');
  
  if (search) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,especialidad.ilike.%${search}%`);
  }
  
  if (specialty) {
    query = query.eq('especialidad', specialty);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { doctors: data };
}

async function getUsers(params: any) {
  // This would require Clerk API integration
  // For now, return a placeholder
  return { 
    message: 'User management requires Clerk API integration',
    available: false 
  };
}

async function getPeriodontalStudies(supabase: any, params: any) {
  const { pacienteId, search, dateFilter } = params || {};
  
  let query = supabase
    .from('estudios_periodontales')
    .select('*')
    .order('fecha_estudio', { ascending: false });
  
  if (pacienteId) {
    query = query.eq('paciente_id', pacienteId);
  }
  
  if (search) {
    query = query.or(`observaciones_generales.ilike.%${search}%,fecha_estudio.ilike.%${search}%`);
  }
  
  if (dateFilter) {
    query = query.eq('fecha_estudio', dateFilter);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { studies: data };
}

async function getNotifications(userId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const notifications = await response.json();
      return { notifications };
    }
    
    return { notifications: [] };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { notifications: [] };
  }
}

async function getOdontogram(supabase: any, params: any) {
  const { patientId } = params || {};
  
  if (!patientId) {
    throw new Error('Patient ID is required');
  }
  
  const { data: odontogram, error } = await supabase
    .from('odontogram_pilots')
    .select('*')
    .eq('paciente_id', patientId)
    .eq('activo', true)
    .order('version', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return { odontogram: odontogram || null };
}

async function executeSQL(supabase: any, params: any) {
  const { sql } = params || {};
  
  if (!sql) {
    throw new Error('SQL query is required');
  }
  
  // Security check - only allow SELECT queries for safety
  if (!sql.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed for security');
  }
  
  const { data, error } = await supabase.rpc('exec', { sql });
  
  if (error) throw error;
  
  return { data };
}

async function getPaymentsByTreatment(supabase: any, params: any) {
  const { tratamientoCompletadoId } = params || {};
  
  if (!tratamientoCompletadoId) {
    throw new Error('Treatment completed ID is required');
  }
  
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tratamiento_completado_id', tratamientoCompletadoId)
    .order('fecha_pago', { ascending: false });
  
  if (error) throw error;
  
  return { payments: data };
}

async function getTreatments(supabase: any, params: any) {
  const { pacienteId, doctorId, estado, dateFrom, dateTo, limit = 50 } = params || {};
  
  let query = supabase
    .from('tratamientos_completados')
    .select('*')
    .order('fecha_cita', { ascending: false });
  
  if (pacienteId) {
    query = query.eq('paciente_id', pacienteId);
  }
  
  if (doctorId) {
    query = query.eq('doctor_id', doctorId);
  }
  
  if (estado) {
    query = query.eq('estado', estado);
  }
  
  if (dateFrom) {
    query = query.gte('fecha_cita', dateFrom);
  }
  
  if (dateTo) {
    query = query.lte('fecha_cita', dateTo);
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { treatments: data };
}

async function getReportsData(supabase: any, params: any) {
  const { timeRange = 'monthly', startDate, endDate, doctorEmail, doctorUserId } = params || {};
  
  // Get completed treatments grouped by date
  let query = supabase
    .from('tratamientos_completados')
    .select(`
      fecha_cita, 
      total_final, 
      paciente_id,
      doctor_name
    `);
  
  if (doctorEmail || doctorUserId) {
    query = query.eq('doctor_email', doctorEmail).or(`doctor_id.eq.${doctorUserId}`);
  }
  
  if (startDate) {
    query = query.gte('fecha_cita', startDate);
  }
  
  if (endDate) {
    query = query.lte('fecha_cita', endDate);
  }
  
  const { data, error } = await query.order('fecha_cita', { ascending: true });
  
  if (error) throw error;
  
  // Group by date
  const grouped = data.reduce((acc: any, item: any) => {
    const date = item.fecha_cita?.split('T')[0] || 'unknown';
    if (!acc[date]) {
      acc[date] = {
        date,
        patients: new Set(),
        treatments: 0,
        revenue: 0,
        doctors: new Set()
      };
    }
    acc[date].patients.add(item.paciente_id);
    acc[date].treatments += 1;
    acc[date].revenue += item.total_final || 0;
    acc[date].doctors.add(item.doctor_name);
    return acc;
  }, {});
  
  const reportData = Object.values(grouped).map((item: any) => ({
    date: item.date,
    patients: item.patients.size,
    treatments: item.treatments,
    revenue: item.revenue,
    doctors: item.doctors.size
  }));
  
  return { reportData };
}

async function getDoctorPerformance(supabase: any, params: any) {
  const { timeRange = 'monthly', startDate, endDate } = params || {};
  
  let query = supabase
    .from('tratamientos_completados')
    .select(`
      doctor_name,
      especialidad,
      total_final,
      paciente_id,
      fecha_cita
    `);
  
  if (startDate) {
    query = query.gte('fecha_cita', startDate);
  }
  
  if (endDate) {
    query = query.lte('fecha_cita', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Group by doctor
  const grouped = data.reduce((acc: any, item: any) => {
    const doctor = item.doctor_name || 'unknown';
    if (!acc[doctor]) {
      acc[doctor] = {
        name: doctor,
        specialty: item.especialidad,
        patients: new Set(),
        treatments: 0,
        revenue: 0
      };
    }
    acc[doctor].patients.add(item.paciente_id);
    acc[doctor].treatments += 1;
    acc[doctor].revenue += item.total_final || 0;
    return acc;
  }, {});
  
  const performance = Object.values(grouped).map((item: any) => ({
    name: item.name,
    specialty: item.specialty,
    patients: item.patients.size,
    treatments: item.treatments,
    revenue: item.revenue,
    satisfaction: 0 // Would need to calculate from feedback data
  }));
  
  return { performance };
}

async function getTreatmentTypes(supabase: any, params: any) {
  const { startDate, endDate } = params || {};

  let query = supabase
    .from('tratamientos_completados')
    .select(`
      total_final,
      especialidad
    `);

  if (startDate) {
    query = query.gte('fecha_cita', startDate);
  }

  if (endDate) {
    query = query.lte('fecha_cita', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by specialty/treatment type
  const grouped = data.reduce((acc: any, item: any) => {
    const type = item.especialidad || 'general';
    if (!acc[type]) {
      acc[type] = {
        name: type,
        count: 0,
        revenue: 0
      };
    }
    acc[type].count += 1;
    acc[type].revenue += item.total_final || 0;
    return acc;
  }, {});

  const totalRevenue = Object.values(grouped).reduce((sum: number, item: any) => {
    const revenue = Number(item.revenue) || 0;
    return sum + revenue;
  }, 0) as number;

  const treatmentTypes = Object.values(grouped).map((item: any) => {
    const itemRevenue = Number(item.revenue) || 0;
    const percentage = (totalRevenue as number) > 0 ? (itemRevenue / (totalRevenue as number) * 100) : 0;
    return {
      name: item.name,
      count: item.count,
      revenue: item.revenue,
      percentage: parseFloat(percentage.toFixed(1))
    };
  });

  return { treatmentTypes };
}

async function searchPatients(supabase: any, params: any) {
  const { name, limit = 10 } = params || {};
  
  if (!name) {
    throw new Error('Patient name is required for search');
  }
  
  // Search in patients table - assuming there's a patients table with name fields
  // This is a placeholder - adjust based on actual schema
  let query = supabase
    .from('pacientes')
    .select('*')
    .ilike('nombre_completo', `%${name}%`)
    .limit(limit);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { patients: data || [] };
}

async function createTreatment(supabase: any, params: any) {
  const { treatmentData } = params || {};
  
  if (!treatmentData) {
    throw new Error('Treatment data is required');
  }
  
  // Generate code if not provided
  if (!treatmentData.codigo) {
    const timestamp = Date.now().toString().slice(-3);
    treatmentData.codigo = `T${timestamp}`;
  }
  
  const { data, error } = await supabase
    .from('tratamientos')
    .insert([treatmentData])
    .select()
    .single();
  
  if (error) throw error;
  
  return { treatment: data };
}

async function searchTreatments(supabase: any, params: any) {
  const { search, limit = 20 } = params || {};
  
  let query = supabase
    .from('tratamientos')
    .select('*')
    .limit(limit);
  
  if (search) {
    query = query.ilike('nombre', `%${search}%`);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { treatments: data || [] };
}

async function getQuotes(supabase: any, params: any) {
  const { patient_id } = params || {};
  
  if (!patient_id) {
    throw new Error('Patient ID is required');
  }
  
  // Check for expired quotes and update their status
  const now = new Date().toISOString();
  await supabase
    .from('presupuestos')
    .update({ status: 'expired' })
    .eq('patient_id', patient_id)
    .eq('status', 'pending')
    .lt('expires_at', now);
  
  // Fetch quotes for patient
  const { data: quotes, error } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('patient_id', patient_id)
    .order('quote_date', { ascending: false });
  
  if (error) throw error;
  
  return { quotes: quotes || [] };
}

async function createQuote(supabase: any, params: any) {
  const {
    patient_id,
    patient_name,
    treatment_description,
    notes,
    quote_date,
    items,
    total_amount,
    doctor_name
  } = params || {};
  
  // Validate required fields
  if (!patient_id || !patient_name || !items || !total_amount || !doctor_name) {
    throw new Error('Missing required fields: patient_id, patient_name, items, total_amount, doctor_name');
  }
  
  // Calculate expiration date
  const quoteDate = quote_date ? new Date(quote_date) : new Date();
  const expires_at = new Date(quoteDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const created_at = quote_date ? new Date(quote_date).toISOString() : new Date().toISOString();
  
  const { data: quote, error } = await supabase
    .from('presupuestos')
    .insert([{
      patient_id,
      patient_name,
      treatment_description: treatment_description && treatment_description.trim() ? treatment_description : null,
      notes: notes || null,
      quote_date: quote_date ? new Date(quote_date).toISOString() : new Date().toISOString(),
      items,
      total_amount,
      doctor_name,
      status: 'pending',
      expires_at,
      created_at,
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return { quote };
}

async function updateQuote(supabase: any, params: any) {
  const { quote_id, status } = params || {};
  
  if (!quote_id || !status) {
    throw new Error('Quote ID and status are required');
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
  
  if (error) throw error;
  
  return { quote };
}

async function getTimelineNotes(supabase: any, params: any) {
  const { patient_id, limit = 20 } = params || {};
  
  let query = supabase
    .from('timeline_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (patient_id) {
    query = query.eq('patient_id', patient_id);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { notes: data || [] };
}

async function createTimelineNote(supabase: any, params: any) {
  const { patient_id, content, note_type = 'general' } = params || {};
  
  if (!patient_id || !content) {
    throw new Error('Patient ID and content are required');
  }
  
  const { data, error } = await supabase
    .from('timeline_notes')
    .insert([{
      patient_id,
      content,
      note_type,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return { note: data };
}

async function getTickets(supabase: any, params: any) {
  const { status, limit = 20 } = params || {};
  
  let query = supabase
    .from('tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return { tickets: data || [] };
}

async function createTicket(supabase: any, params: any) {
  const { title, description, priority = 'medium', patient_id } = params || {};
  
  if (!title || !description) {
    throw new Error('Title and description are required');
  }
  
  const { data, error } = await supabase
    .from('tickets')
    .insert([{
      title,
      description,
      priority,
      patient_id,
      status: 'open',
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return { ticket: data };
}
