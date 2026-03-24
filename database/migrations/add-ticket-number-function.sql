-- Create function to generate next ticket number
CREATE OR REPLACE FUNCTION get_next_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_number TEXT;
BEGIN
    -- Get the next number from the sequence
    next_number := 'REQ-' || LPAD(nextval('ticket_number_seq')::text, 5, '0');
    
    RETURN next_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_ticket_number() TO authenticated;
