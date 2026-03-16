import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, agent, project } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Construct the Claude Code command with full path
    const claudePath = '/home/dentaldiamondhn/.config/nvm/versions/node/v18.20.8/lib/node_modules/@anthropic-ai/claude-code/cli.js';
    const claudeCommand = `${claudePath} --settings claude-config.json --agent ${agent || 'tech-support'} --print "${message.replace(/"/g, '\\"')}"`;

    // Execute Claude Code command
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const child = exec(claudeCommand, {
        cwd: process.cwd(),
        timeout: 60000, // 30 seconds timeout
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
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
          resolve({
            response: stdout.trim(),
            success: true
          });
        } else {
          resolve({
            response: `Claude Code exited with code ${code}${stderr ? ': ' + stderr.trim() : ''}`,
            success: false
          });
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to execute Claude Code: ${error.message}`));
      });
    });
  } catch (error) {
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
    endpoints: {
      POST: '/api/claude-chat',
      usage: 'POST { message: string, agent?: string, project?: string }'
    }
  });
}
