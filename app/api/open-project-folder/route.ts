import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

export async function GET() {
  try {
    const rootPath = '/home/dentaldiamondhn';
    
    if (!existsSync(rootPath)) {
      return NextResponse.json(
        { error: 'Root directory not found' },
        { status: 404 }
      );
    }
    
    // Try to open the root folder in file manager
    try {
      execSync(`xdg-open "${rootPath}"`, { stdio: 'ignore' });
    } catch (error) {
      // Fallback to returning the path
      return NextResponse.json({
        message: 'Could not open file manager automatically',
        path: rootPath
      });
    }
    
    return NextResponse.json({
      message: 'Root folder opened - you can now navigate to any Android project',
      path: rootPath
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to open project folder: ' + error },
      { status: 500 }
    );
  }
}
