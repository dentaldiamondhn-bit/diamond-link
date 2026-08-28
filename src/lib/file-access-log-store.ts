import { FILE_ACCESS_CONFIG } from '@/config/file-access.config';

export interface FileAccessOperationLog {
  timestamp: Date;
  userId: string;
  agentId?: string;
  operation: string;
  filePath: string;
  success: boolean;
  reason?: string;
}

// In-memory operation log (in production, use a database)
const operationLogs: FileAccessOperationLog[] = [];

export function getOperationLogs() {
  return operationLogs.slice(-100);
}

export function logOperation(
  userId: string,
  operation: string,
  filePath: string,
  success: boolean,
  reason?: string,
  agentId?: string
) {
  if (!FILE_ACCESS_CONFIG.globalSettings.enableLogging) return;
  operationLogs.push({
    timestamp: new Date(),
    userId,
    agentId,
    operation,
    filePath,
    success,
    reason,
  });
}