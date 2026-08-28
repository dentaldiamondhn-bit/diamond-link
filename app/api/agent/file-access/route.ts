import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { promises as fs } from 'fs';
import * as path from 'path';
import { isPathAllowed, normalizePath, FILE_ACCESS_CONFIG } from '@/config/file-access.config';
import { logOperation } from '@/lib/file-access-log-store';

export const dynamic = 'force-dynamic';

// GET /api/agent/file-access - List files or read file
export async function GET(request: NextRequest) {
  try {
    // Allow internal calls without authentication for testing
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    let userId;
    if (!isInternalCall) {
      const { userId: authUserId } = await auth();
      userId = authUserId;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      userId = 'internal-test-user';
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation') || 'read';
    const filePath = searchParams.get('path');
    const agentId = searchParams.get('agentId');

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const normalizedPath = normalizePath(filePath);
    const pathCheck = isPathAllowed(normalizedPath, operation);

    if (!pathCheck.allowed) {
      logOperation(userId, operation, normalizedPath, false, pathCheck.reason, agentId || undefined);
      return NextResponse.json({ error: pathCheck.reason }, { status: 403 });
    }

    if (operation === 'read') {
      try {
        const content = await fs.readFile(normalizedPath, 'utf-8');
        
        // Check file size
        const stats = await fs.stat(normalizedPath);
        if (pathCheck.config?.maxFileSize && stats.size > pathCheck.config.maxFileSize) {
          logOperation(userId, operation, normalizedPath, false, 'File size exceeds limit', agentId || undefined);
          return NextResponse.json({ error: 'File size exceeds limit' }, { status: 413 });
        }

        logOperation(userId, operation, normalizedPath, true, undefined, agentId || undefined);
        return NextResponse.json({ 
          success: true, 
          content,
          path: normalizedPath,
          size: stats.size
        });
      } catch {
        logOperation(userId, operation, normalizedPath, false, 'File not found or cannot be read', agentId || undefined);
        return NextResponse.json({ error: 'File not found or cannot be read' }, { status: 404 });
      }
    } else if (operation === 'list') {
      try {
        const dirPath = normalizedPath;
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        
        const fileList = await Promise.all(files.map(async (file) => {
          const fullPath = path.join(dirPath, file.name);
          const stats = await fs.stat(fullPath);
          return {
            name: file.name,
            path: fullPath,
            isDirectory: file.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        }));

        logOperation(userId, operation, dirPath, true, undefined, agentId || undefined);
        return NextResponse.json({ 
          success: true, 
          files: fileList,
          path: dirPath
        });
      } catch {
        logOperation(userId, operation, normalizedPath, false, 'Directory not found or cannot be listed', agentId || undefined);
        return NextResponse.json({ error: 'Directory not found or cannot be listed' }, { status: 404 });
      }
    } else {
      logOperation(userId, operation, normalizedPath, false, 'Invalid operation', agentId || undefined);
      return NextResponse.json({ error: 'Invalid operation for GET request' }, { status: 400 });
    }
  } catch (error) {
    console.error('File access GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agent/file-access - Write file
export async function POST(request: NextRequest) {
  try {
    // Allow internal calls without authentication for testing
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    let userId;
    if (!isInternalCall) {
      const { userId: authUserId } = await auth();
      userId = authUserId;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      userId = 'internal-test-user';
    }

    const body = await request.json();
    const { path: filePath, content, operation = 'write', agentId } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const normalizedPath = normalizePath(filePath);
    const pathCheck = isPathAllowed(normalizedPath, operation);

    if (!pathCheck.allowed) {
      logOperation(userId, operation, normalizedPath, false, pathCheck.reason, agentId);
      return NextResponse.json({ error: pathCheck.reason }, { status: 403 });
    }

    // Check if approval is required
    if (FILE_ACCESS_CONFIG.globalSettings.requireApprovalForWrite) {
      logOperation(userId, operation, normalizedPath, false, 'Approval required for write operation', agentId);
      return NextResponse.json({ 
        error: 'Approval required',
        requiresApproval: true,
        message: 'Write operations require explicit approval'
      }, { status: 403 });
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(normalizedPath);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(normalizedPath, content, 'utf-8');

      // Check file size
      const stats = await fs.stat(normalizedPath);
      if (pathCheck.config?.maxFileSize && stats.size > pathCheck.config.maxFileSize) {
        await fs.unlink(normalizedPath); // Remove oversized file
        logOperation(userId, operation, normalizedPath, false, 'File size exceeds limit', agentId);
        return NextResponse.json({ error: 'File size exceeds limit' }, { status: 413 });
      }

      logOperation(userId, operation, normalizedPath, true, undefined, agentId);
      return NextResponse.json({ 
        success: true, 
        path: normalizedPath,
        size: stats.size
      });
    } catch {
      logOperation(userId, operation, normalizedPath, false, 'Failed to write file', agentId);
      return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
    }
  } catch (error) {
    console.error('File access POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/agent/file-access - Delete file
export async function DELETE(request: NextRequest) {
  try {
    // Allow internal calls without authentication for testing
    const isInternalCall = request.headers.get('x-internal-call') === 'true';
    
    let userId;
    if (!isInternalCall) {
      const { userId: authUserId } = await auth();
      userId = authUserId;
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      userId = 'internal-test-user';
    }

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const agentId = searchParams.get('agentId');

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
    }

    const normalizedPath = normalizePath(filePath);
    const pathCheck = isPathAllowed(normalizedPath, 'delete');

    if (!pathCheck.allowed) {
      logOperation(userId, 'delete', normalizedPath, false, pathCheck.reason, agentId || undefined);
      return NextResponse.json({ error: pathCheck.reason }, { status: 403 });
    }

    // Check if approval is required
    if (FILE_ACCESS_CONFIG.globalSettings.requireApprovalForDelete) {
      logOperation(userId, 'delete', normalizedPath, false, 'Approval required for delete operation', agentId || undefined);
      return NextResponse.json({ 
        error: 'Approval required',
        requiresApproval: true,
        message: 'Delete operations require explicit approval'
      }, { status: 403 });
    }

    try {
      await fs.unlink(normalizedPath);
      logOperation(userId, 'delete', normalizedPath, true, undefined, agentId || undefined);
      return NextResponse.json({ 
        success: true, 
        path: normalizedPath
      });
    } catch {
      logOperation(userId, 'delete', normalizedPath, false, 'File not found or cannot be deleted', agentId || undefined);
      return NextResponse.json({ error: 'File not found or cannot be deleted' }, { status: 404 });
    }
  } catch (error) {
    console.error('File access DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
