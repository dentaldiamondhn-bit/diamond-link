import { supabase } from '../lib/supabase';
import { Odontogram, OdontogramData, DienteData } from '../types/odontogram';
import { OdontogramPilot, OdontogramPilotData, DientePilotData, CuadranteDientes } from './odontogramPilotService';

export interface MigrationResult {
  success: boolean;
  originalOdontogram?: Odontogram;
  pilotOdontogram?: OdontogramPilot;
  error?: string;
  patientId?: string;
}

export interface BatchMigrationResult {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
}

export class OdontogramMigrationService {
  /**
   * Transform original odontogram data to pilot format
   * - Applies whole tooth state to all quadrants + center
   * - Converts tooth numbers from string to number
   * - Copies individual notes and general notes
   */
  private static transformToPilotFormat(originalData: OdontogramData, originalFechaCreacion: string): OdontogramPilotData {
    const transformedDientes: Record<number, DientePilotData> = {};
    
    // Determine if it's adult or child based on tooth numbers present
    const toothNumbers = Object.keys(originalData.dientes);
    const hasChildTeeth = toothNumbers.some(num => 
      parseInt(num) >= 51 && parseInt(num) <= 85
    );
    const tipo: 'adulto' | 'nino' = hasChildTeeth ? 'nino' : 'adulto';
    
    // Transform each tooth
    Object.entries(originalData.dientes).forEach(([toothNum, diente]) => {
      const numericToothNum = parseInt(toothNum);
      const estado = diente.estado || 'sano';
      
      // Apply the same state to all quadrants and center
      const cuadrantes: CuadranteDientes = {
        mesial: estado,
        distal: estado,
        buccal: estado,
        lingual: estado
      };
      
      const transformedDiente: DientePilotData = {
        cuadrantes,
        central: estado,
        nota: diente.observaciones || undefined
      };
      
      transformedDientes[numericToothNum] = transformedDiente;
    });
    
    // Use the original odontogram's creation date, with fallback to informacion_general.fecha or current date
    let fecha = originalFechaCreacion;
    
    // Validate the date and provide fallbacks
    if (!fecha || fecha === 'Invalid Date') {
      fecha = originalData.informacion_general?.fecha || new Date().toISOString();
    }
    
    // Ensure the date is in a valid ISO format
    try {
      const dateObj = new Date(fecha);
      if (isNaN(dateObj.getTime())) {
        fecha = new Date().toISOString();
      } else {
        fecha = dateObj.toISOString();
      }
    } catch {
      fecha = new Date().toISOString();
    }
    
    return {
      tipo,
      dientes: transformedDientes,
      fecha
    };
  }

  /**
   * Migrate a single odontogram from original to pilot format
   */
  static async migrateSingleOdontogram(originalOdontogram: Odontogram): Promise<MigrationResult> {
    try {
      // Transform the data
      const pilotData = this.transformToPilotFormat(
        originalOdontogram.datos_odontograma,
        originalOdontogram.fecha_creacion
      );
      
      // Create the pilot odontogram
      const pilotOdontogram = await this.createPilotOdontogram(
        originalOdontogram.paciente_id,
        pilotData,
        originalOdontogram.notas,
        originalOdontogram.creado_por,
        originalOdontogram.version
      );
      
      return {
        success: true,
        originalOdontogram,
        pilotOdontogram,
        patientId: originalOdontogram.paciente_id
      };
    } catch (error) {
      return {
        success: false,
        originalOdontogram,
        error: error instanceof Error ? error.message : 'Unknown error',
        patientId: originalOdontogram.paciente_id
      };
    }
  }

  /**
   * Create pilot odontogram with specific version number
   */
  private static async createPilotOdontogram(
    pacienteId: string,
    datosOdontograma: OdontogramPilotData,
    notas?: string,
    creadoPor?: string,
    version?: number
  ): Promise<OdontogramPilot> {
    const odontogramData = {
      paciente_id: pacienteId,
      version: version || 1,
      datos_odontograma: datosOdontograma,
      notas,
      creado_por: creadoPor,
      activo: true,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('odontogram_pilots')
      .insert([odontogramData])
      .select()
      .single();

    if (error) {
      console.error('Error creating pilot odontogram:', error);
      throw error;
    }

    return data;
  }

  /**
   * Migrate odontograms for a specific patient
   */
  static async migratePatientOdontograms(pacienteId: string): Promise<MigrationResult[]> {
    // Get all odontograms for the patient
    const { data: odontograms, error } = await supabase
      .from('odontograms')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch odontograms for patient ${pacienteId}: ${error.message}`);
    }

    if (!odontograms || odontograms.length === 0) {
      return [{
        success: false,
        error: `No odontograms found for patient ${pacienteId}`,
        patientId: pacienteId
      }];
    }

    // Migrate each odontogram version
    const results: MigrationResult[] = [];
    for (const odontogram of odontograms) {
      const result = await this.migrateSingleOdontogram(odontogram);
      results.push(result);
    }

    return results;
  }

  /**
   * Migrate odontograms for multiple patients (batch)
   */
  static async migrateBatchOdontograms(limit: number = 10): Promise<BatchMigrationResult> {
    // Get patients with odontograms
    const { data: patientsWithOdontograms, error } = await supabase
      .from('odontograms')
      .select('paciente_id')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }

    if (!patientsWithOdontograms || patientsWithOdontograms.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    // Get unique patient IDs
    const uniquePatientIds = [...new Set(patientsWithOdontograms.map(o => o.paciente_id))];
    
    // Migrate odontograms for each patient
    const allResults: MigrationResult[] = [];
    for (const pacienteId of uniquePatientIds) {
      const patientResults = await this.migratePatientOdontograms(pacienteId);
      allResults.push(...patientResults);
    }

    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;

    return {
      total: allResults.length,
      successful,
      failed,
      results: allResults
    };
  }

  /**
   * Get count of odontograms available for migration
   */
  static async getMigrationStats(): Promise<{ totalOdontograms: number; uniquePatients: number }> {
    const { data: odontograms } = await supabase
      .from('odontograms')
      .select('paciente_id');

    if (!odontograms) {
      return { totalOdontograms: 0, uniquePatients: 0 };
    }

    const uniquePatients = new Set(odontograms.map(o => o.paciente_id)).size;

    return {
      totalOdontograms: odontograms.length,
      uniquePatients
    };
  }
}
