import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url || '', 'http://localhost');
    const project = searchParams.get('project');
    
    // If no project specified, try to find any available APK
    let apkPath = null;
    let apkName = 'diamond-calendar.apk';
    
    if (project) {
      // Look for APK in specific project
      const projectPath = `/home/dentaldiamondhn/${project}`;
      
      // Try release APK first
      const releaseApkPath = path.join(projectPath, 'android/app/build/outputs/apk/release/app-release.apk');
      if (existsSync(releaseApkPath)) {
        apkPath = releaseApkPath;
        apkName = `${project}.apk`;
      } else {
        // Try debug APK
        const debugApkPath = path.join(projectPath, 'android/app/build/outputs/apk/debug/app-debug.apk');
        if (existsSync(debugApkPath)) {
          apkPath = debugApkPath;
          apkName = `${project}-debug.apk`;
        }
      }
    } else {
      // Search for any APK in all projects
      const rootPath = '/home/dentaldiamondhn';
      const projects = ['diamond-calendar', 'diamond-widget-original'];
      
      for (const projectName of projects) {
        const projectPath = path.join(rootPath, projectName);
        
        // Try release APK first
        const releaseApkPath = path.join(projectPath, 'android/app/build/outputs/apk/release/app-release.apk');
        if (existsSync(releaseApkPath)) {
          apkPath = releaseApkPath;
          apkName = `${projectName}.apk`;
          break;
        } else {
          // Try debug APK
          const debugApkPath = path.join(projectPath, 'android/app/build/outputs/apk/debug/app-debug.apk');
          if (existsSync(debugApkPath)) {
            apkPath = debugApkPath;
            apkName = `${projectName}-debug.apk`;
            break;
          }
        }
      }
    }
    
    if (!apkPath) {
      return NextResponse.json(
        { error: 'APK not found. Please build a project first.' },
        { status: 404 }
      );
    }
    
    const apkBuffer = readFileSync(apkPath);
    
    return new NextResponse(apkBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${apkName}"`
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to download APK: ' + error },
      { status: 500 }
    );
  }
}
