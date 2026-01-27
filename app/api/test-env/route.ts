// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envVars = {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'Set' : 'Not set',
      CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not set',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not set',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set',
    };

    return Response.json({
      message: 'Environment variables check',
      envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
