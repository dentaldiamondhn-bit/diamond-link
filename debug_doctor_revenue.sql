-- Check what doctor field exists in tratamientos_completados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tratamientos_completados' 
AND column_name LIKE '%doctor%';

-- Check some sample data to see doctor field names
SELECT 
  doctor,
  doctor_name,
  doctor_id,
  COUNT(*) as count
FROM tratamientos_completados 
GROUP BY doctor, doctor_name, doctor_id
LIMIT 10;

-- Check for current doctor's treatments (replace with actual doctor name)
SELECT 
  doctor,
  doctor_name,
  doctor_id,
  total_final,
  estado,
  COUNT(*) as treatment_count,
  SUM(total_final) as total_revenue
FROM tratamientos_completados 
WHERE estado = 'pagado'
GROUP BY doctor, doctor_name, doctor_id
ORDER BY total_revenue DESC
LIMIT 10;
