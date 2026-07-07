// File access configuration for AI agents
// This defines which directories agents can access and what operations are allowed

export interface DirectoryConfig {
  path: string;
  allowedOperations: ('read' | 'write' | 'list' | 'delete')[];
  description: string;
  maxFileSize?: number; // in bytes
  allowedExtensions?: string[];
}

export const FILE_ACCESS_CONFIG: {
  allowedDirectories: DirectoryConfig[];
  globalSettings: {
    enableLogging: boolean;
    requireApprovalForDelete: boolean;
    requireApprovalForWrite: boolean;
    maxTotalFileSize: number; // in bytes
  };
} = {
  allowedDirectories: [
    {
      path: '/home/dentaldiamondhn/diamond-link-original',
      allowedOperations: ['read', 'list'],
      description: 'Main application directory - read only access',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/components',
      allowedOperations: ['read', 'write', 'list'],
      description: 'React components directory - full access',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/app',
      allowedOperations: ['read', 'write', 'list'],
      description: 'Next.js app directory - full access',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/services',
      allowedOperations: ['read', 'write', 'list'],
      description: 'Service layer - full access',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['.ts', '.js']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/types',
      allowedOperations: ['read', 'write', 'list'],
      description: 'TypeScript type definitions - full access',
      maxFileSize: 1 * 1024 * 1024, // 1MB
      allowedExtensions: ['.ts']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/scripts',
      allowedOperations: ['read', 'write', 'list'],
      description: 'Utility scripts - full access',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedExtensions: ['.ts', '.js', '.sh']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/public',
      allowedOperations: ['read', 'write', 'list'],
      description: 'Public assets - full access',
      maxFileSize: 20 * 1024 * 1024, // 20MB
      allowedExtensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json']
    },
    {
      path: '/home/dentaldiamondhn/diamond-link-original/docs',
      allowedOperations: ['read', 'write', 'list'],
      description: 'Documentation - full access',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.md', '.txt']
    }
  ],
  globalSettings: {
    enableLogging: true,
    requireApprovalForDelete: true,
    requireApprovalForWrite: false,
    maxTotalFileSize: 50 * 1024 * 1024 // 50MB total
  }
};

// Helper function to check if a path is allowed
export function isPathAllowed(filePath: string, operation: string): { allowed: boolean; config?: DirectoryConfig; reason?: string } {
  const normalizedPath = normalizePath(filePath);
  
  console.log(`[DEBUG] Checking path: ${normalizedPath}`);
  console.log(`[DEBUG] Operation: ${operation}`);
  
  for (const dir of FILE_ACCESS_CONFIG.allowedDirectories) {
    const normalizedDir = normalizePath(dir.path);
    
    console.log(`[DEBUG] Checking against dir: ${normalizedDir}`);
    
    // Check if the file is within this directory
    // Handle both exact matches and subdirectory matches
    const isExactMatch = normalizedPath === normalizedDir;
    const isSubdirectory = normalizedPath.startsWith(normalizedDir + '/');
    
    console.log(`[DEBUG] Exact match: ${isExactMatch}, Subdirectory: ${isSubdirectory}`);
    
    if (isExactMatch || isSubdirectory) {
      // Check if operation is allowed
      if (!dir.allowedOperations.includes(operation as any)) {
        return {
          allowed: false,
          config: dir,
          reason: `Operation '${operation}' not allowed in ${dir.description}`
        };
      }
      
      // Check file extension if specified (only for files, not directories)
      if (dir.allowedExtensions && !normalizedPath.endsWith('/') && !isExactMatch) {
        const ext = normalizedPath.split('.').pop()?.toLowerCase();
        if (!ext || !dir.allowedExtensions.map(e => e.toLowerCase()).includes('.' + ext)) {
          return {
            allowed: false,
            config: dir,
            reason: `File extension not allowed in ${dir.description}. Allowed: ${dir.allowedExtensions.join(', ')}`
          };
        }
      }
      
      console.log(`[DEBUG] Path allowed!`);
      return { allowed: true, config: dir };
    }
  }
  
  console.log(`[DEBUG] Path not allowed`);
  return { allowed: false, reason: 'Path not in any allowed directory' };
}

// Helper function to normalize and validate paths
export function normalizePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  // Remove any attempts to go up directories
  const parts = normalized.split('/').filter(part => part !== '..' && part !== '.');
  return '/' + parts.join('/');
}
