export interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  category: 'database' | 'auth' | 'storage' | 'external' | 'internal';
}

export interface ApiHealthStatus {
  endpoint: string;
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'offline';
  latency: number;
  uptime: number;
  lastCheck: string;
  errorMessage?: string;
}

export interface ApiMonitorConfig {
  checkInterval: number;
  timeout: number;
  endpoints: ApiEndpoint[];
}

const DEFAULT_ENDPOINTS: ApiEndpoint[] = [
  { name: 'Supabase DB', url: '/api/health/supabase', method: 'GET', category: 'database' },
  { name: 'Clerk Auth', url: '/api/health/auth', method: 'GET', category: 'auth' },
  { name: 'Storage', url: '/api/health/storage', method: 'GET', category: 'storage' },
  { name: 'Next.js API', url: '/api/health/nextjs', method: 'GET', category: 'internal' },
];

class ApiMonitorService {
  private config: ApiMonitorConfig;
  private listeners: Set<(status: ApiHealthStatus[]) => void> = new Set();
  private alertListeners: Set<(alert: { endpoint: string; message: string; severity: 'warning' | 'error' }) => void> = new Set();
  private previousStatus: Map<string, ApiHealthStatus> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    this.config = {
      checkInterval: 30000,
      timeout: 10000,
      endpoints: DEFAULT_ENDPOINTS,
    };
  }

  setEndpoints(endpoints: ApiEndpoint[]) {
    this.config.endpoints = endpoints;
  }

  setCheckInterval(interval: number) {
    this.config.checkInterval = interval;
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  subscribe(callback: (status: ApiHealthStatus[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribeToAlerts(callback: (alert: { endpoint: string; message: string; severity: 'warning' | 'error' }) => void) {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  private notifyListeners(statuses: ApiHealthStatus[]) {
    this.listeners.forEach(callback => callback(statuses));
  }

  private notifyAlerts(endpoint: string, message: string, severity: 'warning' | 'error') {
    this.alertListeners.forEach(callback => callback({ endpoint, message, severity }));
  }

  private async checkEndpoint(endpoint: ApiEndpoint): Promise<ApiHealthStatus> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      let status: 'operational' | 'degraded' | 'offline' = 'operational';
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          status = errorData.status === 'degraded' ? 'degraded' : 'offline';
        } catch {
          status = 'offline';
        }
      }

      const previousStatus = this.previousStatus.get(endpoint.name);
      const uptime = previousStatus ? this.calculateUptime(previousStatus, status) : (status === 'operational' ? 100 : 0);

      return {
        endpoint: endpoint.url,
        name: endpoint.name,
        category: endpoint.category,
        status,
        latency,
        uptime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      
      return {
        endpoint: endpoint.url,
        name: endpoint.name,
        category: endpoint.category,
        status: isTimeout ? 'degraded' : 'offline',
        latency,
        uptime: 0,
        lastCheck: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private calculateUptime(previousStatus: ApiHealthStatus, newStatus: string): number {
    const lastCheck = new Date(previousStatus.lastCheck);
    const now = new Date();
    const timeDiff = now.getTime() - lastCheck.getTime();
    const hours = timeDiff / 3600000;
    
    if (newStatus === 'operational') {
      if (previousStatus.status === 'operational') {
        return Math.min(100, previousStatus.uptime + (hours * 100));
      }
      return 0;
    }
    if (previousStatus.status === 'operational') {
      return Math.max(0, 100 - (hours * 100));
    }
    return previousStatus.uptime;
  }

  async checkAllEndpoints(): Promise<ApiHealthStatus[]> {
    const results = await Promise.all(
      this.config.endpoints.map(endpoint => this.checkEndpoint(endpoint))
    );

    results.forEach(result => {
      const previous = this.previousStatus.get(result.name);
      if (previous && previous.status !== result.status) {
        if (result.status === 'offline') {
          this.notifyAlerts(result.name, `API offline: ${result.errorMessage || 'Connection failed'}`, 'error');
        } else if (result.status === 'degraded') {
          this.notifyAlerts(result.name, `API degraded: ${result.errorMessage || 'High latency detected'}`, 'warning');
        }
      }
      this.previousStatus.set(result.name, result);
    });

    this.notifyListeners(results);
    return results;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.checkAllEndpoints();
    
    this.intervalId = setInterval(() => {
      this.checkAllEndpoints();
    }, this.config.checkInterval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  getStatus(): ApiHealthStatus[] {
    return Array.from(this.previousStatus.values());
  }
}

export const apiMonitor = new ApiMonitorService();
export default apiMonitor;