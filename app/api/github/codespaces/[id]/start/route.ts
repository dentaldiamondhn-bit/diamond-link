import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const codespaceId = params.id;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.' },
        { status: 400 }
      );
    }
    
    // Call GitHub's actual Codespaces API
    const response = await fetch(`https://api.github.com/user/codespaces/${codespaceId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start codespace');
    }
    
    return NextResponse.json({
      message: `Codespace ${codespaceId} started successfully`
    });
    
  } catch (error) {
    console.error('Start codespace error:', error);
    return NextResponse.json(
      { error: 'Failed to start codespace: ' + error },
      { status: 500 }
    );
  }
}
