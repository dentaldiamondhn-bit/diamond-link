import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const codespaceId = id;
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.' },
        { status: 400 }
      );
    }
    
    // Call GitHub's actual Codespaces API
    const response = await fetch(`https://api.github.com/user/codespaces/${codespaceId}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to stop codespace');
    }
    
    return NextResponse.json({
      message: `Codespace ${codespaceId} stopped successfully`
    });
    
  } catch (error) {
    console.error('Stop codespace error:', error);
    return NextResponse.json(
      { error: 'Failed to stop codespace: ' + error },
      { status: 500 }
    );
  }
}
