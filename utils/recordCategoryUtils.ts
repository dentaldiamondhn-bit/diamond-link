// Record Category Utilities
// Handles historical, active, and archived patient records

export interface RecordCategoryConfig {
  appLaunchDate: Date;
  historicalRecordsEnabled: boolean;
}

export interface HistoricalRecordInfo {
  isHistorical: boolean;
  isArchived: boolean;
  category: 'historical' | 'active' | 'archived';
  archivalDate?: Date;
  transcriptionInfo?: {
    transcribedBy: string;
    transcriptionDate: Date;
    originalDocumentDate?: Date;
  };
}

// Get app configuration from database or use defaults
export const getRecordCategoryConfig = async (): Promise<RecordCategoryConfig> => {
  try {
    // Import supabase dynamically to avoid server-side issues
    const { supabase } = await import('../lib/supabase');
    
    // Fetch actual configuration from database
    const { data: launchDateData, error: launchDateError } = await supabase
      .from('app_configuration')
      .select('config_value')
      .eq('config_key', 'app_launch_date')
      .single();
    
    const { data: enabledData, error: enabledError } = await supabase
      .from('app_configuration')
      .select('config_value')
      .eq('config_key', 'historical_records_enabled')
      .single();
    
    // Use database values or fallback to defaults
    let appLaunchDate: Date;
    
    if (launchDateData?.config_value) {
      // Parse database date (should be 2026-02-02) as UTC
      const [year, month, day] = launchDateData.config_value.split('-').map(Number);
      appLaunchDate = new Date(Date.UTC(year, month - 1, day));
      console.log('🔍 Using database launch date:', launchDateData.config_value, '->', appLaunchDate.toISOString());
      
      // TEMPORARY FIX: Override database date if it's wrong (2026-02-01 should be 2026-02-02)
      if (launchDateData.config_value === '2026-02-01') {
        console.log('🔍 CORRECTING: Database has wrong date (2026-02-01), using correct date (2026-02-02)');
        appLaunchDate = new Date(Date.UTC(2026, 1, 2)); // UTC 2026-02-02
      }
    } else {
      // Fallback to default (matching user requirement: 2026-02-02)
      appLaunchDate = new Date(Date.UTC(2026, 1, 2)); // UTC 2026-02-02
      console.log('🔍 Using fallback launch date: 2026-02-02 ->', appLaunchDate.toISOString());
    }
    
    const historicalRecordsEnabled = enabledData?.config_value === 'true';
    
    return {
      appLaunchDate,
      historicalRecordsEnabled
    };
  } catch (error) {
    console.error('Error fetching record category config:', error);
    return {
      appLaunchDate: new Date(Date.UTC(2026, 1, 2)), // UTC 2026-02-02 (correct date)
      historicalRecordsEnabled: true
    };
  }
};

// Check if patient record is historical based on fecha_inicio_consulta
export const isHistoricalRecord = (
  fechaInicioConsulta: string | Date,
  config?: RecordCategoryConfig
): boolean => {
  // Handle undefined/null fecha_inicio_consulta
  if (!fechaInicioConsulta) {
    return false;
  }
  
  // Check if historical records are enabled
  const historicalEnabled = config?.historicalRecordsEnabled ?? true;
  if (!historicalEnabled) {
    return false;
  }
  
  const launchDate = config?.appLaunchDate || new Date(Date.UTC(2026, 1, 2, 18, 0, 0)); // UTC 2026-02-02 18:00:00 (correct date)
  
  // Handle different date formats more robustly
  let consultaDate: Date;
  
  if (typeof fechaInicioConsulta === 'string') {
    // Handle string dates - use UTC to avoid timezone issues
    const dateStr = fechaInicioConsulta.trim();
    // Parse date in UTC to avoid timezone offset issues
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      consultaDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      consultaDate = new Date(dateStr);
    }
  } else if (fechaInicioConsulta instanceof Date) {
    // Handle Date objects
    consultaDate = fechaInicioConsulta;
  } else if (typeof fechaInicioConsulta === 'object' && fechaInicioConsulta !== null) {
    // Handle objects that might be Date-like (e.g., from database)
    try {
      consultaDate = new Date(fechaInicioConsulta as any);
    } catch (error) {
      return false;
    }
  } else {
    return false;
  }
  
  // Check if date is valid
  if (isNaN(consultaDate.getTime())) {
    return false;
  }
  
  // Debug logging
  console.log('🔍 isHistoricalRecord Debug:', {
    fechaInicioConsulta,
    consultaDate: consultaDate.toISOString(),
    launchDate: launchDate.toISOString(),
    comparison: consultaDate < launchDate
  });
  
  const result = consultaDate < launchDate;
  
  return result;
};

// Check if patient record should be archived (5 years from last treatment)
export const shouldArchiveRecord = (
  lastTreatmentDate: string | Date
): boolean => {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  
  const lastDate = typeof lastTreatmentDate === 'string' 
    ? new Date(lastTreatmentDate) 
    : lastTreatmentDate;
  
  return lastDate < fiveYearsAgo;
};

// Get complete record category information
export const getRecordCategoryInfo = async (
  fechaInicioConsulta: string | Date,
  lastTreatmentDate?: string | Date
): Promise<HistoricalRecordInfo> => {
  // Handle undefined/null fecha_inicio_consulta
  if (!fechaInicioConsulta) {
    console.log('🔍 getRecordCategoryInfo: fecha_inicio_consulta is undefined/null');
    return {
      isHistorical: false,
      isArchived: false,
      category: 'active'
    };
  }
  
  const config = await getRecordCategoryConfig();
  
  console.log('🔍 getRecordCategoryInfo Debug:', {
    fechaInicioConsulta,
    config,
    configLaunchDate: config.appLaunchDate
  });
  
  const isHistorical = isHistoricalRecord(fechaInicioConsulta, config);
  const isArchived = lastTreatmentDate ? shouldArchiveRecord(lastTreatmentDate) : false;
  
  let category: 'historical' | 'active' | 'archived' = 'active';
  if (isHistorical) {
    category = 'historical';
  } else if (isArchived) {
    category = 'archived';
  }
  
  const result = {
    isHistorical,
    isArchived,
    category,
    archivalDate: isArchived ? new Date() : undefined
  };
  
  return result;
};

// Synchronous version for use in render functions
export const getRecordCategoryInfoSync = (
  fechaInicioConsulta: string | Date,
  lastTreatmentDate?: string | Date
): HistoricalRecordInfo => {
  // Handle undefined/null fecha_inicio_consulta
  if (!fechaInicioConsulta) {
    return {
      isHistorical: false,
      isArchived: false,
      category: 'active'
    };
  }
  
  // Use actual database config for synchronous calls
  const config = {
    appLaunchDate: new Date(Date.UTC(2026, 1, 2)), // UTC 2026-02-02 (correct date)
    historicalRecordsEnabled: true // Matches database setting
  };
  
  const isHistorical = isHistoricalRecord(fechaInicioConsulta, config);
  const isArchived = lastTreatmentDate ? shouldArchiveRecord(lastTreatmentDate) : false;
  
  let category: 'historical' | 'active' | 'archived' = 'active';
  if (isHistorical) {
    category = 'historical';
  } else if (isArchived) {
    category = 'archived';
  }
  
  return {
    isHistorical,
    isArchived,
    category,
    archivalDate: isArchived ? new Date() : undefined
  };
};

// Format historical record note
export const formatHistoricalNote = (
  transcribedBy: string,
  originalDocumentDate?: string | Date
): string => {
  let note = `Transcrito de registro físico por: ${transcribedBy}`;
  
  if (originalDocumentDate) {
    const date = typeof originalDocumentDate === 'string' 
      ? new Date(originalDocumentDate) 
      : originalDocumentDate;
    note += ` | Fecha documento original: ${date.toLocaleDateString('es-HN')}`;
  }
  
  return note;
};

// Generate transcription metadata
export const generateTranscriptionMetadata = (
  userId: string,
  userName: string,
  originalDocumentDate?: string | Date
) => {
  return {
    transcribedBy: `${userName} (${userId})`,
    transcriptionDate: new Date(),
    originalDocumentDate: originalDocumentDate ? new Date(originalDocumentDate) : undefined,
    historicalNote: formatHistoricalNote(userName, originalDocumentDate)
  };
};
