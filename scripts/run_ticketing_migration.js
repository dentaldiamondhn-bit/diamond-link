import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTicketingMigration() {
  try {
    console.log('🎫 Running ticketing system migration...');
    
    // Create user_roles enum type if it doesn't exist
    console.log('Creating user_roles enum...');
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('STAFF', 'DOCTOR', 'ADMIN', 'TECH_SUPPORT');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });

    // Create ticket_types enum type
    console.log('Creating ticket_types enum...');
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE ticket_type AS ENUM ('SYSTEM_ISSUE', 'IMPLEMENTATION', 'TASK', 'REMINDER');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });

    // Create ticket_priority enum type
    console.log('Creating ticket_priority enum...');
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });

    // Create ticket_status enum type
    console.log('Creating ticket_status enum...');
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESOLVED', 'CLOSED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });

    // Create activity_type enum type
    console.log('Creating activity_type enum...');
    await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE activity_type AS ENUM ('STATUS_CHANGE', 'COMMENT', 'ASSIGNMENT', 'EDIT', 'CREATION');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });

    // Create tickets table
    console.log('Creating tickets table...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type ticket_type DEFAULT 'TASK',
          priority ticket_priority DEFAULT 'MEDIUM',
          status ticket_status DEFAULT 'OPEN',
          due_date TIMESTAMPTZ,
          is_reminder BOOLEAN DEFAULT false,
          system_impact TEXT,
          module_affected VARCHAR(100),
          creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
          assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
          department VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    // Create ticket_activities table
    console.log('Creating ticket_activities table...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ticket_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type activity_type NOT NULL,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    // Create indexes for performance
    console.log('Creating indexes...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
        CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
        CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
        CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON tickets(due_date);
        CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket_id ON ticket_activities(ticket_id);
        CREATE INDEX IF NOT EXISTS idx_ticket_activities_user_id ON ticket_activities(user_id);
      `
    });

    // Create updated_at trigger
    console.log('Creating updated_at trigger...');
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
        CREATE TRIGGER update_tickets_updated_at 
          BEFORE UPDATE ON tickets 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `
    });

    // Enable RLS (Row Level Security)
    console.log('Enabling RLS...');
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ticket_activities ENABLE ROW LEVEL SECURITY;
      `
    });

    // Create RLS policies
    console.log('Creating RLS policies...');
    await supabase.rpc('exec_sql', {
      sql: `
        -- Tickets policies
        CREATE POLICY "Users can view all tickets" ON tickets
          FOR SELECT USING (true);

        CREATE POLICY "Users can create tickets" ON tickets
          FOR INSERT WITH CHECK (true);

        CREATE POLICY "Users can update tickets" ON tickets
          FOR UPDATE USING (true);

        CREATE POLICY "Users can delete tickets" ON tickets
          FOR DELETE USING (auth.jwt() ->> 'role' = 'ADMIN' OR auth.jwt() ->> 'role' = 'TECH_SUPPORT');

        -- Ticket activities policies
        CREATE POLICY "Users can view all ticket activities" ON ticket_activities
          FOR SELECT USING (true);

        CREATE POLICY "Users can create ticket activities" ON ticket_activities
          FOR INSERT WITH CHECK (true);
      `
    });

    console.log('✅ Ticketing system migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runTicketingMigration();
