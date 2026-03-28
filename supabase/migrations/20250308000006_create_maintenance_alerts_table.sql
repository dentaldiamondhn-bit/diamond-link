-- Create maintenance_alerts table for system-wide maintenance notifications
CREATE TABLE maintenance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  maintenance_start TIMESTAMPTZ NOT NULL,
  maintenance_end TIMESTAMPTZ NOT NULL,
  alert_type VARCHAR(50) DEFAULT 'MAINTENANCE' CHECK (alert_type IN ('MAINTENANCE', 'SYSTEM_UPDATE', 'EMERGENCY')),
  severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  affected_systems TEXT[], -- Array of affected systems (e.g., ['database', 'api', 'frontend'])
  contact_person VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_maintenance_alerts_time_range ON maintenance_alerts(maintenance_start, maintenance_end);
CREATE INDEX idx_maintenance_alerts_status ON maintenance_alerts(status);
CREATE INDEX idx_maintenance_alerts_active ON maintenance_alerts(maintenance_start, maintenance_end) 
  WHERE status IN ('SCHEDULED', 'ACTIVE');

-- Enable RLS
ALTER TABLE maintenance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_alerts
CREATE POLICY "Anyone can view active maintenance alerts" ON maintenance_alerts
  FOR SELECT USING (
    status IN ('SCHEDULED', 'ACTIVE') AND
    (maintenance_start <= NOW() AND maintenance_end >= NOW())
  );

CREATE POLICY "Anyone can view scheduled maintenance alerts" ON maintenance_alerts
  FOR SELECT USING (
    status = 'SCHEDULED' AND 
    maintenance_start > NOW() AND 
    maintenance_start <= NOW() + INTERVAL '24 hours'
  );

CREATE POLICY "Tech support and admin can manage maintenance alerts" ON maintenance_alerts
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('ADMIN', 'TECH_SUPPORT') OR
    created_by = auth.uid()
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_maintenance_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER maintenance_alerts_updated_at
  BEFORE UPDATE ON maintenance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_alerts_updated_at();

-- Grant permissions
GRANT ALL ON maintenance_alerts TO authenticated;

-- Create view for active maintenance alerts
CREATE VIEW active_maintenance_alerts AS
SELECT 
  id,
  ticket_id,
  title,
  description,
  maintenance_start,
  maintenance_end,
  alert_type,
  severity,
  status,
  affected_systems,
  contact_person,
  created_at,
  updated_at,
  created_by
FROM maintenance_alerts
WHERE status IN ('SCHEDULED', 'ACTIVE')
  AND (
    (maintenance_start <= NOW() AND maintenance_end >= NOW()) OR -- Currently active
    (maintenance_start > NOW() AND maintenance_start <= NOW() + INTERVAL '24 hours') -- Upcoming within 24h
  )
ORDER BY 
  CASE 
    WHEN maintenance_start <= NOW() AND maintenance_end >= NOW() THEN 1 -- Active first
    ELSE 2 -- Scheduled next
  END,
  maintenance_start ASC;

-- Grant access to the view
GRANT SELECT ON active_maintenance_alerts TO authenticated;
