
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to format currency
const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};

// Helper function to get treatments for currency detection
const getTreatments = async () => {
  const { data, error } = await supabase
    .from('tratamientos')
    .select('codigo, nombre, moneda');
  
  if (error) {
    console.error('Error fetching treatments:', error);
    return [];
  }
  
  return data || [];
};

// Helper function to determine currency from treatment description
const getCurrencyFromDescription = (description: string, treatments: any[]) => {
  const treatment = treatments.find(t => 
    description.includes(`${t.codigo} - ${t.nombre}`)
  );
  return treatment?.moneda || 'HNL'; // Default to HNL if not found
};

// Helper function to calculate totals by currency
const calculateTotalsByCurrency = (presupuestos: any[], status: string, treatments: any[]) => {
  const filteredPresupuestos = presupuestos.filter(p => p.status === status);
  
  const totals = {
    HNL: 0,
    USD: 0
  };
  
  filteredPresupuestos.forEach(presupuesto => {
    if (presupuesto.items && Array.isArray(presupuesto.items)) {
      presupuesto.items.forEach((item: any) => {
        const currency = getCurrencyFromDescription(item.description, treatments);
        totals[currency as keyof typeof totals] += item.total_price || 0;
      });
    }
  });
  
  return totals;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');

    if (!patient_id) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get treatments for currency detection
    const treatments = await getTreatments();

    // Fetch presupuestos for patient
    const { data: presupuestos, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('patient_id', patient_id)
      .order('quote_date', { ascending: false });

    if (error) {
      console.error('Error fetching presupuesto statistics:', error);
      return NextResponse.json({ error: 'Failed to fetch presupuesto statistics' }, { status: 500 });
    }

    const presupuestosList = presupuestos || [];
    
    // Calculate statistics
    const totalPresupuestos = presupuestosList.length;
    const pendientes = presupuestosList.filter(p => p.status === 'pending').length;
    const aceptados = presupuestosList.filter(p => p.status === 'accepted').length;
    const rechazados = presupuestosList.filter(p => p.status === 'rejected').length;
    const expirados = presupuestosList.filter(p => p.status === 'expired').length;
    
    // Calculate totals by currency for each status
    const totalsPendientes = calculateTotalsByCurrency(presupuestosList, 'pending', treatments);
    const totalsAceptados = calculateTotalsByCurrency(presupuestosList, 'accepted', treatments);
    const totalsRechazados = calculateTotalsByCurrency(presupuestosList, 'rejected', treatments);
    
    // Get latest presupuesto
    const latestPresupuesto = presupuestosList.length > 0 ? {
      treatment_description: presupuestosList[0].treatment_description || 'Tratamiento general',
      total_amount: presupuestosList[0].total_amount,
      quote_date: presupuestosList[0].quote_date,
      status: presupuestosList[0].status,
      doctor_name: presupuestosList[0].doctor_name
    } : undefined;
    
    // Calculate average value (convert all to HNL for simplicity)
    const valorPromedio = totalPresupuestos > 0 
      ? presupuestosList.reduce((sum, p) => sum + (p.total_amount || 0), 0) / totalPresupuestos
      : 0;

    const statistics = {
      total_presupuestos: totalPresupuestos,
      pendientes: pendientes,
      aceptados: aceptados,
      rechazados: rechazados,
      expirados: expirados,
      totals_by_currency: {
        pendientes: totalsPendientes,
        aceptados: totalsAceptados,
        rechazados: totalsRechazados
      },
      total_valor_pendiente: totalsPendientes.HNL + totalsPendientes.USD,
      total_valor_aceptado: totalsAceptados.HNL + totalsAceptados.USD,
      total_valor_rechazado: totalsRechazados.HNL + totalsRechazados.USD,
      latest_presupuesto: latestPresupuesto,
      valor_promedio: valorPromedio
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Unexpected error in presupuesto statistics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
