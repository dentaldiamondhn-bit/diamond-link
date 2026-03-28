import { supabase } from '../lib/supabase';
import { DentalStudy, DentalImage, DentalAnnotation, DentalReport, PatientXraySummary, XrayFilterOptions } from '../types/dental';

class DentalStudyService {
  // Get all patients with xray studies summary
  async getPatientsWithXraySummary(
    page: number = 1,
    limit: number = 25,
    searchTerm: string = '',
    sortBy: string = 'nombre',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<{ patients: PatientXraySummary[]; total: number }> {
    try {
      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('dental_studies')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting dental studies:', countError);
        throw countError;
      }

      // Now try the actual query - use new table structure with patient info included
      let query = supabase
        .from('dental_studies')
        .select(`
          id,
          paciente_id,
          patient_uuid,
          study_date,
          notes,
          study_number,
          patient_name,
          patient_first_name,
          patient_last_name,
          actual_study_date,
          directory_name,
          dental_images(id)
        `);

      // Apply search filter on studies and patient names
      if (searchTerm) {
        query = query.or(`notes.ilike.%${searchTerm}%,patient_name.ilike.%${searchTerm}%,patient_first_name.ilike.%${searchTerm}%,patient_last_name.ilike.%${searchTerm}%,paciente_id.ilike.%${searchTerm}%`);
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      console.log('Executing query with offset:', offset, 'limit:', limit);
      
      const { data, error } = await query;

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error fetching dental studies:', error);
        // If dental_studies table doesn't exist, return empty result
        if (error.code === 'PGRST116') {
          return {
            patients: [],
            total: 0
          };
        }
        throw error;
      }

      console.log('Found studies:', data?.length || 0, 'studies');

      // Process data to create patient summaries using patient info from dental_studies
      const patientMap = new Map<string, PatientXraySummary>();

      data?.forEach((study: any) => {
        const patientId = study.paciente_id;
        if (!patientId) return; // Skip studies without patient ID
        
        // Use patient info directly from dental_studies table
        if (!patientMap.has(patientId)) {
          const initialStudyDate = study.actual_study_date || study.study_date;
          patientMap.set(patientId, {
            patient_id: patientId,
            nombre_completo: study.patient_name || 'Paciente Desconocido',
            numero_identidad: patientId,
            telefono: '', // Not available in dental_studies
            fecha_nacimiento: '', // Not available in dental_studies
            sexo: '', // Not available in dental_studies
            doctor: '', // Not available in dental_studies
            study_count: 0,
            latest_study_date: initialStudyDate,
            latest_study_type: 'Estudio Dental',
            total_images: 0,
            thumbnail_url: null
          });
        }

        const patient = patientMap.get(patientId)!;
        patient.study_count++;
        
        // Add images count from this study
        if (study.dental_images && Array.isArray(study.dental_images)) {
          patient.total_images += study.dental_images.length;
        }
        
        // Update latest study date if this study is more recent
        // Use actual_study_date if available, otherwise fall back to study_date
        const studyDate = study.actual_study_date || study.study_date;
        console.log(`Study ${study.id}: actual_study_date=${study.actual_study_date}, study_date=${study.study_date}, using=${studyDate}, images=${study.dental_images?.length || 0}`);
        if (studyDate > patient.latest_study_date) {
          patient.latest_study_date = studyDate;
          console.log(`Updated patient ${patientId} latest_study_date to ${studyDate}`);
        }
      });

      const patients = Array.from(patientMap.values());
      console.log('Final patient summaries:', patients.length, 'patients');
      patients.forEach(p => {
        console.log(`Patient ${p.patient_id}: ${p.study_count} studies, ${p.total_images} images`);
      });

      // Apply sorting in JavaScript to avoid Supabase ordering issues
      patients.sort((a, b) => {
        if (sortBy === 'nombre') {
          const comparison = (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
          return sortOrder === 'asc' ? comparison : -comparison;
        } else if (sortBy === 'fecha') {
          // Sort by latest study date
          const comparison = new Date(a.latest_study_date).getTime() - new Date(b.latest_study_date).getTime();
          return sortOrder === 'asc' ? comparison : -comparison;
        } else if (sortBy === 'estudios') {
          const comparison = a.study_count - b.study_count;
          return sortOrder === 'asc' ? comparison : -comparison;
        }
        return 0;
      });

      return {
        patients,
        total: totalCount || 0
      };

    } catch (error) {
      console.error('Error fetching patients with xray summary:', error);
      throw error;
    }
  }

  // Get detailed studies for a specific patient
  async getPatientStudies(patientId: string): Promise<DentalStudy[]> {
    try {
      const { data, error } = await supabase
        .from('dental_studies')
        .select(`
          *,
          dental_images(*),
          dental_reports(*)
        `)
        .eq('paciente_id', patientId)
        .order('study_date', { ascending: false });

      if (error) {
        console.error('Supabase error in getPatientStudies:', error);
        throw error;
      }

      return data?.map((study: any) => ({
        ...study,
        patient: {
          nombre_completo: study.patient_name || 'Paciente Desconocido',
          numero_identidad: study.paciente_id,
          telefono: '',
          fecha_nacimiento: '',
          sexo: '',
          doctor: ''
        },
        image_count: study.dental_images?.length || 0,
        images: study.dental_images || [],
        reports: study.dental_reports || []
      })) || [];

    } catch (error) {
      console.error('Error fetching patient studies:', error);
      throw error;
    }
  }

  // Get single study with all related data
  async getStudyById(studyId: string): Promise<DentalStudy | null> {
    try {
      const { data, error } = await supabase
        .from('dental_studies')
        .select(`
          *,
          dental_images(*),
          dental_annotations(*),
          dental_reports(*)
        `)
        .eq('id', studyId)
        .single();

      if (error) throw error;

      return data ? {
        ...data,
        patient: {
          nombre_completo: data.patient_name || 'Paciente Desconocido',
          numero_identidad: data.paciente_id,
          telefono: '',
          fecha_nacimiento: '',
          sexo: '',
          doctor: ''
        },
        image_count: data.dental_images?.length || 0,
        images: data.dental_images || [],
        annotations: data.dental_annotations || [],
        reports: data.dental_reports || []
      } : null;

    } catch (error) {
      console.error('Error fetching study:', error);
      throw error;
    }
  }

  // Get image with annotations
  async getImageWithAnnotations(imageId: string): Promise<{ image: DentalImage | null; annotations: DentalAnnotation[] }> {
    try {
      const { data: imageData, error: imageError } = await supabase
        .from('dental_images')
        .select(`
          *,
          dental_studies!inner(
            paciente_id,
            patient_name,
            study_date,
            notes
          )
        `)
        .eq('id', imageId)
        .single();

      if (imageError) throw imageError;

      const { data: annotationsData, error: annotationsError } = await supabase
        .from('dental_annotations')
        .select('*')
        .eq('image_id', imageId)
        .order('created_at', { ascending: true });

      if (annotationsError) throw annotationsError;

      return {
        image: imageData ? {
          ...imageData,
          patient: {
            nombre_completo: imageData.dental_studies.patient_name || 'Paciente Desconocido',
            numero_identidad: imageData.dental_studies.paciente_id
          },
          study: imageData.dental_studies
        } : null,
        annotations: annotationsData || []
      };

    } catch (error) {
      console.error('Error fetching image with annotations:', error);
      throw error;
    }
  }

  // Create new study
  async createStudy(study: Partial<DentalStudy>): Promise<DentalStudy> {
    try {
      const { data, error } = await supabase
        .from('dental_studies')
        .insert(study)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error creating study:', error);
      throw error;
    }
  }

  // Upload image to diamond_xrays bucket
  async uploadImage(file: File, studyId: string, patientId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studyId}/${Date.now()}.${fileExt}`;
      const filePath = `${patientId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('diamond_xrays')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('diamond_xrays')
        .getPublicUrl(filePath);

      return publicUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  // Create image record
  async createImage(image: Partial<DentalImage>): Promise<DentalImage> {
    try {
      const { data, error } = await supabase
        .from('dental_images')
        .insert(image)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error creating image record:', error);
      throw error;
    }
  }

  // Create annotation
  async createAnnotation(annotation: Partial<DentalAnnotation>): Promise<DentalAnnotation> {
    try {
      const { data, error } = await supabase
        .from('dental_annotations')
        .insert(annotation)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error creating annotation:', error);
      throw error;
    }
  }

  // Create report
  async createReport(report: Partial<DentalReport>): Promise<DentalReport> {
    try {
      const { data, error } = await supabase
        .from('dental_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  // Delete image
  async deleteImage(imageId: string): Promise<void> {
    try {
      // Get image info first
      const { data: imageData } = await supabase
        .from('dental_images')
        .select('image_url')
        .eq('id', imageId)
        .single();

      if (imageData?.image_url) {
        // Extract file path from URL
        const urlParts = imageData.image_url.split('/');
        const filePath = urlParts[urlParts.length - 2] + '/' + urlParts[urlParts.length - 1];
        
        // Delete from storage
        await supabase.storage
          .from('diamond_xrays')
          .remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('dental_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  // Get public URL for image
  getImagePublicUrl(imagePath: string): string {
    const { data } = supabase.storage
      .from('diamond_xrays')
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  }
}

export const dentalStudyService = new DentalStudyService();
