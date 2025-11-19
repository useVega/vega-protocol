/**
 * Monitoring & Logging Types
 * Defines metrics, audit logs, and observability data structures
 */

export interface SystemMetrics {
  timestamp: Date;
  
  // Workflow metrics
  totalWorkflowRuns: number;
  activeRuns: number;
  completedRuns: number;
  failedRuns: number;
  
  // Financial metrics
  totalVolume: string; // Total payments processed
  platformFees: string;
  averageCostPerRun: string;
  
  // Agent metrics
  totalAgents: number;
  publishedAgents: number;
  activeAgents: number; // Agents called in last 24h
  
  // Performance
  averageRunDurationMs: number;
  averageNodeExecutionMs: number;
}

export interface AuditLogEntry {
  logId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  component: string;
  action: string;
  userId?: string;
  agentRef?: string;
  runId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  component: string;
  operation: string;
  durationMs: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}
