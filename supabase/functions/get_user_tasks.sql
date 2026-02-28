create or replace function get_user_tasks(
  user_id_param text,
  start_date_param timestamp with time zone,
  end_date_param timestamp with time zone
)
returns table (
  id uuid,
  title text,
  description text,
  due_date timestamp with time zone,
  priority text,
  status text,
  patient_id uuid,
  completion_notes text,
  created_by text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  paciente_id uuid,
  nombre_completo text,
  telefono text,
  email text
)
language sql
as $$
  select 
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.priority,
    t.status,
    t.patient_id,
    t.completion_notes,
    t.created_by,
    t.created_at,
    t.updated_at,
    p.paciente_id,
    p.nombre_completo,
    p.telefono,
    p.email
  from calendar_tasks t
  left join patients p on t.patient_id = p.paciente_id
  where t.created_by::text = user_id_param
    and t.due_date >= start_date_param
    and t.due_date <= end_date_param
  
  union all
  
  select 
    t.id,
    t.title,
    t.description,
    t.due_date,
    t.priority,
    t.status,
    t.patient_id,
    t.completion_notes,
    t.created_by,
    t.created_at,
    t.updated_at,
    p.paciente_id,
    p.nombre_completo,
    p.telefono,
    p.email
  from calendar_tasks t
  inner join calendar_invitees ci on t.id = ci.item_id and ci.item_type = 'task'
  left join patients p on t.patient_id = p.paciente_id
  where ci.user_id = user_id_param
    and t.due_date >= start_date_param
    and t.due_date <= end_date_param;
$$;
