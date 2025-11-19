/**
 * Workflow Execution Types
 * Defines runtime state, execution status, and run results
 */

import type { ChainType, TokenSymbol } from './chain.types';

export type WorkflowRunStatus = 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type NodeRunStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

export interface WorkflowRun {
  runId: string;
  workflowId: string;
  userId: string;
  userWallet: string;
  
  // Status
  status: WorkflowRunStatus;
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  
  // Budget
  chain: ChainType;
  token: TokenSymbol;
  reservedBudget: string;
  spentBudget: string;
  
  // Results
  error?: string;
  outputNodeId?: string;
  output?: any;
}

export interface NodeRun {
  nodeRunId: string;
  runId: string;
  nodeId: string;
  agentRef: string;
  
  // Status
  status: NodeRunStatus;
  
  // Timestamps
  startedAt?: Date;
  endedAt?: Date;
  
  // Execution details
  inputs: Record<string, any>;
  output?: any;
  cost: string; // BigNumber as string
  
  // Error handling
  error?: string;
  retryCount: number;
  
  // Logging
  logs: string[];
}
