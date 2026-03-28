-- Fix missing documents in orthodontic history
-- This script updates the database to include all documents from the bucket

-- Update the specific patient's orthodontic history with both documents
UPDATE historia_clinica_ortodoncia 
SET documentos_ortodoncia = ARRAY[
  'https://hmtkayufelqyfytpmdtl.supabase.co/storage/v1/object/public/orthodontic-documents/5887b85e-a706-45bc-b2e8-2b4e4416b4da/5887b85e-a706-45bc-b2e8-2b4e4416b4da_1771639765565_Screenshot%202026-02-17%2012.04.47%20PM.png',
  'https://hmtkayufelqyfytpmdtl.supabase.co/storage/v1/object/public/orthodontic-documents/5887b85e-a706-45bc-b2e8-2b4e4416b4da/5887b85e-a706-45bc-b2e8-2b4e4416b4da_1771639822820_Screenshot%202026-02-20%207.01.56%20PM.png'
]::text[]
WHERE paciente_id = '5887b85e-a706-45bc-b2e8-2b4e4416b4da';

-- Verify the update
SELECT paciente_id, documentos_ortodoncia 
FROM historia_clinica_ortodoncia 
WHERE paciente_id = '5887b85e-a706-45bc-b2e8-2b4e4416b4da';
