import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const supabase = createClient();

// Seed initial skills for dental practice
export async function POST(request: NextRequest) {
  try {
    // Allow internal calls without authentication for seeding
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    let userId;
    if (!isInternalCall) {
      const { auth } = await import('@clerk/nextjs/server');
      const authResult = await auth();
      userId = authResult.userId;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // Use a valid UUID for internal calls
      userId = '00000000-0000-0000-0000-000000000000';
    }

    const dentalSkills = [
      {
        name: 'Patient Intake Assistant',
        description: 'Helps with collecting and organizing patient information during initial visits',
        prompt: `You are a dental practice assistant helping with patient intake. Your role is to:

1. Guide the user through collecting essential patient information:
   - Personal details (name, contact info, date of birth)
   - Medical history
   - Dental history
   - Insurance information
   - Chief complaints

2. Organize the information in a structured format
3. Identify any red flags or important medical conditions
4. Suggest appropriate next steps or additional information needed

Use the custom tools available to search for existing patients, check for allergies, and access relevant medical records. Be thorough but efficient in your information gathering.`,
        category: 'patient-care',
        tags: ['intake', 'new-patient', 'assessment'],
        is_public: true
      },
      {
        name: 'Treatment Planning Assistant',
        description: 'Assists in creating comprehensive treatment plans based on patient needs',
        prompt: `You are a dental treatment planning assistant. Your role is to:

1. Analyze patient dental records and odontogram data
2. Identify treatment needs based on dental conditions
3. Suggest appropriate treatment options with priorities
4. Consider patient preferences and constraints
5. Generate cost estimates using available quote tools
6. Create timeline for recommended treatments

Use the custom tools to:
- Access patient odontograms
- Search for treatment options
- Generate quotes for treatment plans
- Check doctor availability

Provide clear, prioritized treatment recommendations with justifications.`,
        category: 'clinical',
        tags: ['treatment', 'planning', 'clinical'],
        is_public: true
      },
      {
        name: 'Appointment Scheduling Assistant',
        description: 'Helps schedule and manage patient appointments efficiently',
        prompt: `You are a dental appointment scheduling assistant. Your role is to:

1. Find available appointment slots
2. Schedule patient appointments
3. Send appointment reminders
4. Reschedule appointments when needed
5. Optimize schedule to minimize gaps and conflicts

Use the custom tools to:
- Check doctor availability
- Schedule appointments
- Send notifications
- Access patient treatment plans

Consider treatment urgency, patient preferences, and doctor availability when scheduling.`,
        category: 'administrative',
        tags: ['scheduling', 'appointments', 'calendar'],
        is_public: true
      },
      {
        name: 'Billing and Payment Assistant',
        description: 'Assists with billing, payment processing, and financial inquiries',
        prompt: `You are a dental billing and payment assistant. Your role is to:

1. Process payments for completed treatments
2. Generate invoices and receipts
3. Handle payment inquiries
4. Check payment status
5. Assist with insurance claims

Use the custom tools to:
- Access payment records
- Process payments
- Generate financial reports
- Check treatment costs

Provide clear financial information and assist with payment-related questions.`,
        category: 'financial',
        tags: ['billing', 'payments', 'financial'],
        is_public: true
      },
      {
        name: 'Clinical Documentation Assistant',
        description: 'Helps create and maintain accurate clinical documentation',
        prompt: `You are a dental clinical documentation assistant. Your role is to:

1. Help create accurate clinical notes
2. Document treatment procedures
3. Record patient responses and outcomes
4. Maintain timeline notes for patient care
5. Ensure documentation meets clinical standards

Use the custom tools to:
- Access patient records
- Create timeline notes
- Retrieve treatment information
- Check odontogram data

Create clear, professional clinical documentation that supports quality patient care.`,
        category: 'clinical',
        tags: ['documentation', 'clinical', 'notes'],
        is_public: true
      },
      {
        name: 'Report Generation Assistant',
        description: 'Generates various practice reports and analytics',
        prompt: `You are a dental practice reporting assistant. Your role is to:

1. Generate practice performance reports
2. Create financial summaries
3. Analyze treatment trends
4. Track doctor performance
5. Identify areas for improvement

Use the custom tools to:
- Access treatment data
- Generate financial reports
- Analyze doctor performance
- Track payment patterns

Provide clear, actionable insights from the data with recommendations for practice improvement.`,
        category: 'analytics',
        tags: ['reporting', 'analytics', 'performance'],
        is_public: true
      }
    ];

    const results = [];
    
    for (const skill of dentalSkills) {
      // Check if skill already exists
      const { data: existing } = await supabase
        .from('skills')
        .select('id')
        .eq('name', skill.name)
        .single();

      if (existing) {
        results.push({ name: skill.name, status: 'already exists', id: existing.id });
        continue;
      }

      // Create skill
      const { data, error } = await supabase
        .from('skills')
        .insert([{
          ...skill,
          created_by: userId,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) {
        results.push({ name: skill.name, status: 'failed', error: error.message });
      } else {
        results.push({ name: skill.name, status: 'created', id: data.id });
      }
    }

    return NextResponse.json({ 
      message: 'Skills seeding completed',
      results 
    });
  } catch (error) {
    console.error('Error seeding skills:', error);
    return NextResponse.json(
      { error: 'Failed to seed skills', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
