import { supabase } from '../lib/supabase';

export class ReportsServiceDebug {
  static async getRevenueStatsWithDebug(startDate?: string, endDate?: string) {
    console.log('=== DEBUG: getRevenueStats called ===');
    console.log('startDate:', startDate);
    console.log('endDate:', endDate);
    
    try {
      // First, let's get the total count without any filtering
      const { data: allData, error: allError } = await supabase
        .from('tratamientos_completados')
        .select('id, fecha_cita, total_final');

      if (allError) throw allError;
      console.log('Total records in table:', allData?.length);

      // Now apply the same filtering as the original method
      const query = supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita');

      if (startDate) {
        console.log('Applying startDate filter:', startDate);
        query.gte('fecha_cita', startDate);
      } else {
        const defaultStart = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
        console.log('Using default startDate:', defaultStart);
        query.gte('fecha_cita', defaultStart);
      }

      if (endDate) {
        console.log('Applying endDate filter:', endDate);
        query.lte('fecha_cita', endDate);
      } else {
        const defaultEnd = new Date().toISOString();
        console.log('Using default endDate:', defaultEnd);
        query.lte('fecha_cita', defaultEnd);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      console.log('Filtered records count:', data?.length);
      
      // Show first few dates for debugging
      if (data && data.length > 0) {
        console.log('Sample dates from filtered data:');
        data.slice(0, 5).forEach(item => {
          console.log(`  ${item.fecha_cita}`);
        });
      }

      const totalRevenue = data?.reduce((sum, item) => sum + (item.total_final || 0), 0) || 0;
      const totalTreatments = data?.length || 0;

      console.log('Final results:', {
        totalRevenue,
        totalTreatments,
        averageRevenuePerTreatment: totalTreatments > 0 ? totalRevenue / totalTreatments : 0
      });
      console.log('=== END DEBUG ===');

      return {
        totalRevenue,
        totalTreatments,
        averageRevenuePerTreatment: totalTreatments > 0 ? totalRevenue / totalTreatments : 0
      };
    } catch (error) {
      console.error('Error in debug revenue stats:', error);
      throw error;
    }
  }
}
