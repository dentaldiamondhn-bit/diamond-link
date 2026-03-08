import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const rootPath = '/home/dentaldiamondhn';
    
    // Check for Android projects
    const androidProjects = [];
    try {
      const dirs = execSync(`find "${rootPath}" -maxdepth 2 -name "android" -type d`, { encoding: 'utf8' });
      const projectDirs = dirs.trim().split('\n').filter(dir => dir.trim());
      
      for (const androidDir of projectDirs) {
        const projectPath = path.dirname(androidDir);
        const projectName = path.basename(projectPath);
        
        // Check if this is a valid Android project
        const gradlewPath = path.join(androidDir, 'gradlew');
        const hasGradlew = existsSync(gradlewPath);
        
        if (hasGradlew) {
          androidProjects.push({
            name: projectName,
            path: projectPath,
            androidPath: androidDir
          });
        }
      }
    } catch (error) {
      // If find fails, continue with empty array
    }
    
    // Check Android SDK
    let androidSdkInstalled = false;
    try {
      execSync('which adb', { stdio: 'ignore' });
      androidSdkInstalled = true;
    } catch {
      androidSdkInstalled = false;
    }
    
    // Check Gradle
    let gradleInstalled = false;
    try {
      execSync('which gradle', { stdio: 'ignore' });
      gradleInstalled = true;
    } catch {
      gradleInstalled = false;
    }
    
    // Check for existing APKs in all projects
    const apks = [];
    for (const project of androidProjects) {
      const apkDir = path.join(project.androidPath, 'app/build/outputs/apk/release');
      const debugApkDir = path.join(project.androidPath, 'app/build/outputs/apk/debug');
      
      // Check release APK
      if (existsSync(apkDir)) {
        const releaseApk = path.join(apkDir, 'app-release.apk');
        if (existsSync(releaseApk)) {
          const stats = statSync(releaseApk);
          apks.push({
            project: project.name,
            type: 'release',
            path: releaseApk,
            lastBuild: stats.mtime.toISOString()
          });
        }
      }
      
      // Check debug APK
      if (existsSync(debugApkDir)) {
        const debugApk = path.join(debugApkDir, 'app-debug.apk');
        if (existsSync(debugApk)) {
          const stats = statSync(debugApk);
          apks.push({
            project: project.name,
            type: 'debug',
            path: debugApk,
            lastBuild: stats.mtime.toISOString()
          });
        }
      }
    }
    
    const androidReady = androidProjects.length > 0 && androidSdkInstalled && gradleInstalled;
    
    return NextResponse.json({
      androidReady,
      androidProjects,
      androidSdkInstalled,
      gradleInstalled,
      apks
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment: ' + error },
      { status: 500 }
    );
  }
}
