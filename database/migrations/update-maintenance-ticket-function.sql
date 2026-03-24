-- Create or replace function for creating maintenance tickets with ticket number
CREATE OR REPLACE FUNCTION create_maintenance_ticket_direct(
    p_title TEXT,
    p_description TEXT,
    p_type TEXT,
    p_priority TEXT,
    p_creator_id UUID,
    p_maintenance_start TIMESTAMP WITH TIME ZONE,
    p_maintenance_end TIMESTAMP WITH TIME ZONE,
    p_is_reminder BOOLEAN DEFAULT FALSE,
    p_ticket_number TEXT
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    type TEXT,
    priority TEXT,
    status TEXT,
    creator_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_reminder BOOLEAN,
    maintenance_start TIMESTAMP WITH TIME ZONE,
    maintenance_end TIMESTAMP WITH TIME ZONE,
    ticket_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert maintenance ticket with all fields including ticket_number (no due_date)
    RETURN QUERY
    INSERT INTO tickets (
        title,
        description,
        type,
        priority,
        status,
        creator_id,
        created_at,
        updated_at,
        is_reminder,
        maintenance_start,
        maintenance_end,
        ticket_number
    ) VALUES (
        p_title,
        p_description,
        p_type,
        p_priority,
        'OPEN'::TEXT,
        p_creator_id,
        NOW(),
        NOW(),
        p_is_reminder,
        p_maintenance_start,
        p_maintenance_end,
        p_ticket_number
    )
    RETURNING *;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_maintenance_ticket_direct TO authenticated;
