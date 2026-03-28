-- Create presupuestos table
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  treatment_description TEXT NOT NULL,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(12,2) NOT NULL,
  doctor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0),
  CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_presupuestos_patient_id ON presupuestos(patient_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_status ON presupuestos(status);
CREATE INDEX IF NOT EXISTS idx_presupuestos_expires_at ON presupuestos(expires_at);
CREATE INDEX IF NOT EXISTS idx_presupuestos_created_at ON presupuestos(created_at);

-- Row Level Security (RLS)
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read their own patient quotes
CREATE POLICY "Users can view quotes for their patients" ON presupuestos
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Create policy for authenticated users to insert quotes
CREATE POLICY "Users can create quotes" ON presupuestos
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Create policy for authenticated users to update quotes
CREATE POLICY "Users can update quotes" ON presupuestos
  FOR UPDATE USING (
    auth.role() = 'authenticated'
  );

-- Create policy for authenticated users to delete quotes
CREATE POLICY "Users can delete quotes" ON presupuestos
  FOR DELETE USING (
    auth.role() = 'authenticated'
  );

-- Function to automatically update expired quotes
CREATE OR REPLACE FUNCTION update_expired_quotes()
RETURNS void AS $$
BEGIN
  UPDATE presupuestos 
  SET status = 'expired' 
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update expired quotes (optional)
-- This would need to be run periodically, not as a real-time trigger
-- You can set up a cron job or use Supabase's scheduled functions
