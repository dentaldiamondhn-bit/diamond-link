import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, agent, project } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isServerless) {
      return NextResponse.json({
        response: `🤖 Claude Code (${agent || 'tech-support'} agent) response:\n\nI understand you're asking about: "${message}"\n\nThis is a simulated response because we're running in a serverless environment. For full Claude Code functionality, run this locally:\n\nclaude-code --settings claude-config.json --agent ${agent || 'tech-support'} --print "${message.replace(/"/g, '\\"')}"`,
        success: true,
        mock: true
      });
    }

    // Quick auth check
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const authCheck = spawn('/home/dentaldiamondhn/.config/nvm/versions/node/v18.20.8/lib/node_modules/@anthropic-ai/claude-code/cli.js', ['--version'], {
        cwd: process.cwd(),
        env: { ...process.env },
        timeout: 5000
      });

      let authOutput = '';
      authCheck.stdout?.on('data', (data) => {
        authOutput += data.toString();
      });

      authCheck.on('close', (code) => {
        if (code !== 0 && !authOutput.includes('version')) {
          resolve(NextResponse.json({
            response: '🔐 Claude Code Authentication Required\n\n**Claude Code requires an Anthropic subscription or API key to work.**\n\n**To set up Claude Code:**\n\n1. **Get Anthropic API Key:**\n   - Visit https://console.anthropic.com/\n   - Create an account or sign in\n   - Go to API Keys section\n   - Generate a new API key\n\n2. **Set up Claude Code:**\n   ```bash\n   claude-code auth login\n   ```\n   Or use your API key directly:\n   ```bash\n   export ANTHROPIC_API_KEY=your_key_here\n   claude-code\n   ```\n\n3. **For Development:**\n   - Use Claude Code web interface: https://claude.ai/code\n   - Or use our tech-support chat interface (limited)\n\n**Current Status:** Not authenticated\n\n**Next Steps:**\n- Get API key from Anthropic console\n- Run authentication command\n- Refresh this page to use full Claude Code features',
            success: false,
            requiresAuth: true,
            authSteps: [
              '1. Get API key from https://console.anthropic.com/',
              '2. Run: claude-code auth login',
              '3. Or set: export ANTHROPIC_API_KEY=your_key',
              '4. Refresh this page'
            ]
          }));
          return;
        }

        // If we get here, Claude Code is available, try to run the actual command
        const claudePath = '/home/dentaldiamondhn/.config/nvm/versions/node/v18.20.8/lib/node_modules/@anthropic-ai/claude-code/cli.js';
        const child = spawn(claudePath, [
          '--settings', 'claude-config.json',
          '--agent', agent || 'tech-support',
          '--print',
          message.replace(/"/g, '\\"')
        ], {
          cwd: process.cwd(),
          env: { ...process.env },
          timeout: 30000
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          if (code === 0) {
            resolve(NextResponse.json({
              response: stdout.trim(),
              success: true
            }));
          } else {
            resolve(NextResponse.json({
              response: `Claude Code exited with code ${code}${stderr ? ': ' + stderr.trim() : ''}`,
              success: false
            }));
          }
        });

        child.on('error', (error) => {
          resolve(NextResponse.json({
            response: `Failed to execute Claude Code: ${error.message}`,
            success: false
          }));
        });

        // Timeout handling
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGTERM');
            resolve(NextResponse.json({
              response: 'Claude Code request timed out after 30 seconds',
              success: false
            }));
          }
        }, 30000);
      });
    });

  } catch (error: any) {
    console.error('Claude chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Claude Code Chat API for Diamond Link',
    status: 'operational',
    authentication: 'required',
    endpoints: {
      POST: '/api/claude-chat',
      usage: 'POST { message: string, agent?: string, project?: string }'
    },
    setup: {
      authentication: 'claude-code --login',
      test: 'curl -X POST /api/claude-chat -d \'{"message":"test"}\''
    }
  });
}
