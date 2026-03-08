import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = request.json ? await request.json() : {};
    const { project } = body;
    
    const rootPath = '/home/dentaldiamondhn';
    const buildScript = path.join(rootPath, 'build-android-apk-enhanced.sh');
    
    // Build command
    const args = project ? ['-b', project] : [];
    
    // Execute build command
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const process = spawn(buildScript, args, {
        cwd: rootPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout: output, stderr: errorOutput });
        } else {
          reject(new Error(`Build failed with code ${code}: ${errorOutput}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
    
    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr,
      message: project ? `Build completed for ${project}` : 'Build completed successfully'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process build request'
    }, { status: 500 });
  }
}
