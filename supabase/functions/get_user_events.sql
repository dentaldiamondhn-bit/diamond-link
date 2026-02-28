create or replace function get_user_events(
  user_id_param text,
  start_date_param timestamp with time zone,
  end_date_param timestamp with time zone
)
returns table (
  id uuid,
  title text,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  all_day boolean,
  location text,
  event_type text,
  status text,
  priority text,
  patient_id uuid,
  notes text,
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
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.all_day,
    e.location,
    e.event_type,
    e.status,
    e.priority,
    e.patient_id,
    e.notes,
    e.created_by,
    e.created_at,
    e.updated_at,
    p.paciente_id,
    p.nombre_completo,
    p.telefono,
    p.email
  from calendar_events e
  left join patients p on e.patient_id = p.paciente_id
  where e.created_by::text = user_id_param
    and e.start_date >= start_date_param
    and e.end_date <= end_date_param
  
  union all
  
  select 
    e.id,
    e.title,
    e.description,
    e.start_date,
    e.end_date,
    e.all_day,
    e.location,
    e.event_type,
    e.status,
    e.priority,
    e.patient_id,
    e.notes,
    e.created_by,
    e.created_at,
    e.updated_at,
    p.paciente_id,
    p.nombre_completo,
    p.telefono,
    p.email
  from calendar_events e
  inner join calendar_invitees ci on e.id = ci.item_id and ci.item_type = 'event'
  left join patients p on e.patient_id = p.paciente_id
  where ci.user_id = user_id_param
    and e.start_date >= start_date_param
    and e.end_date <= end_date_param;
$$;
