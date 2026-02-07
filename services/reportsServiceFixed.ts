import { supabase } from '../lib/supabase';

export class ReportsServiceFixed {
  static async getRevenueStatsFixed(startDate?: string, endDate?: string) {
    try {
      // For debugging: Get ALL records first to verify the count
      console.log('Getting ALL records first...');
      const { data: allRecords, error: allError } = await supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita');

      if (allError) throw allError;
      console.log('Total records in table:', allRecords?.length);

      // If no dates provided, return all records
      if (!startDate && !endDate) {
        console.log('No date filters provided, returning all records');
        const totalRevenue = allRecords?.reduce((sum, item) => sum + (item.total_final || 0), 0) || 0;
        const totalTreatments = allRecords?.length || 0;
        
        return {
          totalRevenue,
          totalTreatments,
          averageRevenuePerTreatment: totalTreatments > 0 ? totalRevenue / totalTreatments : 0
        };
      }

      // If dates are provided, apply them but be more lenient
      console.log('Applying date filters:', { startDate, endDate });
      
      let query = supabase
        .from('tratamientos_completados')
        .select('total_final, fecha_cita');

      // Only apply filters if they're provided and valid
      if (startDate && startDate.trim() !== '') {
        query = query.gte('fecha_cita', startDate);
      }
      
      if (endDate && endDate.trim() !== '') {
        query = query.lte('fecha_cita', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      console.log('Filtered records count:', data?.length);

      const totalRevenue = data?.reduce((sum, item) => sum + (item.total_final || 0), 0) || 0;
      const totalTreatments = data?.length || 0;

      return {
        totalRevenue,
        totalTreatments,
        averageRevenuePerTreatment: totalTreatments > 0 ? totalRevenue / totalTreatments : 0
      };
    } catch (error) {
      console.error('Error in fixed revenue stats:', error);
      throw error;
    }
  }
}
