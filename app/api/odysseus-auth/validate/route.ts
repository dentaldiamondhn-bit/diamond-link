import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ODYSSEUS_BASE_URL = process.env.ODYSSEUS_BASE_URL || 'http://localhost:7000';

// POST /api/odysseus-auth/validate - Validate Odysseus credentials
export async function POST(request: NextRequest) {
  try {
    // Allow internal calls without authentication
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    if (!isInternalCall) {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { baseUrl, username, password, chatEndpoint } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Username and password are required' 
      }, { status: 400 });
    }

    const targetBaseUrl = baseUrl || ODYSSEUS_BASE_URL;
    
    // First check if Odysseus server is running
    try {
      const healthResponse = await fetch(targetBaseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        redirect: 'follow'
      });
      
      if (!healthResponse.ok && healthResponse.status !== 401) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Odysseus server not accessible',
          details: `Server returned ${healthResponse.status} - ensure Odysseus is running at ${targetBaseUrl}`
        }, { status: 400 });
      }
      
      // If we get redirected to /login, the server is running but requires auth
      if (healthResponse.redirected && healthResponse.url.includes('/login')) {
        console.log('Odysseus server is running and requires authentication');
      }
    } catch (e) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Odysseus server not reachable',
        details: `Could not connect to ${targetBaseUrl} - ensure Odysseus server is running`
      }, { status: 400 });
    }
    
    // Test authentication with a simple request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };

    // Try different endpoints to test authentication
    const testEndpoints = [
      `${targetBaseUrl}/api/chat`,
      `${targetBaseUrl}/api/v1/chat/completions`,
      `${targetBaseUrl}/v1/chat/completions`,
    ];

    let lastError: string | null = null;
    let workingEndpoint: string | null = null;

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: 'test',
            context: {},
          }),
        });

        if (response.ok) {
          workingEndpoint = endpoint;
          break;
        }

        const errorText = await response.text();
        lastError = `${response.status}: ${errorText}`;
        
        // If we get a 401, the credentials are definitely wrong
        if (response.status === 401) {
          return NextResponse.json({ 
            valid: false, 
            error: 'Invalid credentials - authentication failed',
            details: 'The username or password is incorrect. Check your Odysseus server credentials.',
            hint: 'Odysseus uses Basic Auth. Make sure you have the correct username and password from your Odysseus server configuration.',
            testedEndpoint: endpoint,
            serverUrl: targetBaseUrl
          }, { status: 401 });
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    if (workingEndpoint) {
      return NextResponse.json({ 
        valid: true, 
        message: 'Credentials validated successfully',
        workingEndpoint,
        baseUrl: targetBaseUrl
      });
    }

    return NextResponse.json({ 
      valid: false, 
      error: 'Could not validate credentials',
      details: lastError || 'No working endpoint found',
      hint: 'Ensure Odysseus server is running and accessible'
    }, { status: 400 });

  } catch (error) {
    console.error('Credential validation error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
