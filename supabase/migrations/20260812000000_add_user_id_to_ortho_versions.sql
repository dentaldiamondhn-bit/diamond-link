-- Add user tracking to orthodontic versions
ALTER TABLE historia_clinica_ortodoncia_versions 
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS created_by_image TEXT;

CREATE INDEX IF NOT EXISTS idx_orthodoncia_versions_user_id 
ON historia_clinica_ortodoncia_versions(user_id);