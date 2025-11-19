/**
 * Workflow Definition Types
 * Defines workflow structure, nodes, edges, and specifications
 */

import type { ChainType, TokenSymbol } from './chain.types';

export type WorkflowNodeType = 'agent' | 'condition' | 'parallel' | 'loop';

export interface WorkflowNode {
  id: string; // Unique within workflow
  type: WorkflowNodeType;
  agentRef?: string; // Reference to agent in registry
  name: string;
  
  // Input mapping: template strings like "{{crawler.output}}"
  inputs: Record<string, string | any>;
  
  // Conditions (for conditional nodes)
  condition?: string;
  
  // Retry configuration
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface WorkflowEdge {
  from: string; // Node ID
  to: string; // Node ID
  condition?: string; // Optional condition for conditional flow
}

export interface WorkflowSpec {
  id: string;
  name: string;
  description: string;
  version: string;
  
  // Ownership
  userId: string;
  
  // Payment configuration
  chain: ChainType;
  token: TokenSymbol;
  maxBudget: string; // BigNumber as string
  
  // Graph definition
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Entry point
  entryNodeId: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}
