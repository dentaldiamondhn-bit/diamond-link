import { supabase } from '@/lib/supabase';

export interface OdontogramTest {
  id: string;
  test_name: string;
  teeth_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class OdontogramTestService {
  // Save a test odontogram
  static async saveTest(testName: string, teethData: Record<string, any>): Promise<OdontogramTest> {
    const { data, error } = await supabase
      .from('odontogram_test')
      .insert({
        test_name: testName,
        teeth_data: teethData
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving test odontogram:', error);
      throw error;
    }

    return data;
  }

  // Get all test odontograms
  static async getAllTests(): Promise<OdontogramTest[]> {
    const { data, error } = await supabase
      .from('odontogram_test')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching test odontograms:', error);
      throw error;
    }

    return data || [];
  }

  // Get a specific test odontogram
  static async getTestById(id: string): Promise<OdontogramTest | null> {
    const { data, error } = await supabase
      .from('odontogram_test')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching test odontogram:', error);
      return null;
    }

    return data;
  }

  // Update a test odontogram
  static async updateTest(id: string, testName: string, teethData: Record<string, any>): Promise<OdontogramTest> {
    const { data, error } = await supabase
      .from('odontogram_test')
      .update({
        test_name: testName,
        teeth_data: teethData
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating test odontogram:', error);
      throw error;
    }

    return data;
  }

  // Delete a test odontogram
  static async deleteTest(id: string): Promise<void> {
    const { error } = await supabase
      .from('odontogram_test')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting test odontogram:', error);
      throw error;
    }
  }
}
