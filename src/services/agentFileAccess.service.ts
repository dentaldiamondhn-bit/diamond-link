// Service for AI agents to access local files through the controlled API
// This provides a clean interface for agents to work with files

export interface FileReadResult {
  success: boolean;
  content?: string;
  path?: string;
  size?: number;
  error?: string;
  requiresApproval?: boolean;
}

export interface FileListResult {
  success: boolean;
  files?: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modified: Date;
  }>;
  path?: string;
  error?: string;
}

export interface FileWriteResult {
  success: boolean;
  path?: string;
  size?: number;
  error?: string;
  requiresApproval?: boolean;
}

export interface FileDeleteResult {
  success: boolean;
  path?: string;
  error?: string;
  requiresApproval?: boolean;
}

export class AgentFileAccessService {
  private baseUrl: string;
  private agentId?: string;

  constructor(agentId?: string) {
    this.baseUrl = '/api/agent/file-access';
    this.agentId = agentId;
  }

  /**
   * Read a file's contents
   * @param filePath - Path to the file to read
   * @returns File contents with metadata
   */
  async readFile(filePath: string): Promise<FileReadResult> {
    try {
      const url = `${this.baseUrl}?operation=read&path=${encodeURIComponent(filePath)}${this.agentId ? `&agentId=${this.agentId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to read file',
          requiresApproval: data.requiresApproval
        };
      }

      return {
        success: true,
        content: data.content,
        path: data.path,
        size: data.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List files in a directory
   * @param dirPath - Path to the directory to list
   * @returns List of files and directories
   */
  async listDirectory(dirPath: string): Promise<FileListResult> {
    try {
      const url = `${this.baseUrl}?operation=list&path=${encodeURIComponent(dirPath)}${this.agentId ? `&agentId=${this.agentId}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to list directory'
        };
      }

      return {
        success: true,
        files: data.files,
        path: data.path
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Write content to a file
   * @param filePath - Path to the file to write
   * @param content - Content to write
   * @returns Write result with file metadata
   */
  async writeFile(filePath: string, content: string): Promise<FileWriteResult> {
    try {
      const url = `${this.baseUrl}${this.agentId ? `?agentId=${this.agentId}` : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          path: filePath,
          content,
          operation: 'write',
          agentId: this.agentId
        })
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to write file',
          requiresApproval: data.requiresApproval
        };
      }

      return {
        success: true,
        path: data.path,
        size: data.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a file
   * @param filePath - Path to the file to delete
   * @returns Delete result
   */
  async deleteFile(filePath: string): Promise<FileDeleteResult> {
    try {
      const url = `${this.baseUrl}?path=${encodeURIComponent(filePath)}${this.agentId ? `&agentId=${this.agentId}` : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to delete file',
          requiresApproval: data.requiresApproval
        };
      }

      return {
        success: true,
        path: data.path
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read multiple files in batch
   * @param filePaths - Array of file paths to read
   * @returns Array of file read results
   */
  async readFilesBatch(filePaths: string[]): Promise<FileReadResult[]> {
    const results = await Promise.all(
      filePaths.map(path => this.readFile(path))
    );
    return results;
  }

  /**
   * Search for files by pattern in a directory
   * @param dirPath - Directory to search
   * @param pattern - File pattern (e.g., "*.ts", "component*.tsx")
   * @returns List of matching files
   */
  async searchFiles(dirPath: string, pattern: string): Promise<FileListResult> {
    try {
      const listResult = await this.listDirectory(dirPath);
      
      if (!listResult.success || !listResult.files) {
        return listResult;
      }

      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(regexPattern, 'i');

      const matchingFiles = listResult.files.filter(file => 
        regex.test(file.name) && !file.isDirectory
      );

      return {
        success: true,
        files: matchingFiles,
        path: dirPath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get operation logs (admin only)
   * @returns Recent operation logs
   */
  async getLogs(): Promise<{ success: boolean; logs?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/logs`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch logs'
        };
      }

      return {
        success: true,
        logs: data.logs
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Factory function to create a file access service for a specific agent
export function createFileAccessService(agentId?: string): AgentFileAccessService {
  return new AgentFileAccessService(agentId);
}
