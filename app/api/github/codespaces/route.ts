import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if GitHub token is available
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json({
        codespaces: [],
        total_count: 0,
        message: 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.',
        setup_required: true
      });
    }

    // Call GitHub's actual Codespaces API
    const response = await fetch('https://api.github.com/user/codespaces', {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch codespaces');
    }

    const data = await response.json();
    
    return NextResponse.json({
      codespaces: data.codespaces || [],
      total_count: data.total_count || 0
    });
    
  } catch (error) {
    console.error('GitHub Codespaces API error:', error);
    return NextResponse.json({
      codespaces: [],
      total_count: 0,
      error: 'Failed to load codespaces: ' + error,
      setup_required: true
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, repository, branch = 'main', machine = 'standardLinux_x64' } = body;
    
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured. Please set GITHUB_TOKEN environment variable.' },
        { status: 400 }
      );
    }

    // First, check if repository exists
    const repoCheck = await fetch(`https://api.github.com/repos/${repository}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!repoCheck.ok) {
      return NextResponse.json(
        { error: `Repository ${repository} not found or not accessible. Please check the repository name and your permissions.` },
        { status: 404 }
      );
    }

    // Create the codespace using GitHub's API
    const codespaceResponse = await fetch('https://api.github.com/user/codespaces', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({
        name: name || `${repository.split('/')[1]}-codespace`,
        repository: repository,
        ref: branch,
        machine: machine,
        idle_timeout_minutes: 30,
        devcontainer_path: '.devcontainer/devcontainer.json'
      })
    });

    if (!codespaceResponse.ok) {
      const errorData = await codespaceResponse.json();
      throw new Error(errorData.message || 'Failed to create codespace');
    }

    const newCodespace = await codespaceResponse.json();
    
    return NextResponse.json({
      codespace: newCodespace,
      message: 'Codespace created successfully'
    });
    
  } catch (error) {
    console.error('Create codespace error:', error);
    return NextResponse.json(
      { error: 'Failed to create codespace: ' + error },
      { status: 500 }
    );
  }
}
