/**
 * A2A Protocol Types
 * Type definitions for Agent-to-Agent communication using Google's A2A SDK
 */

import type { AgentCard, Message, Task, Artifact } from '@a2a-js/sdk';

// Re-export A2A SDK types for convenience
export type { AgentCard, Message, Task, Artifact } from '@a2a-js/sdk';

/**
 * Extended Agent Definition with A2A Card
 */
export interface A2AAgentDefinition {
  // Our internal agent reference
  ref: string;
  
  // A2A Agent Card - the standardized agent metadata
  card: AgentCard;
  
  // Our custom metadata (pricing, ownership, etc.)
  ownerId: string;
  ownerWallet: string;
  pricing: {
    type: 'per-call' | 'per-unit' | 'subscription';
    amount: string;
    token: string;
    chain: string;
  };
  
  // Agent status in our registry
  status: 'draft' | 'published' | 'deprecated' | 'suspended';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A2A Client Configuration
 */
export interface A2AClientConfig {
  cardUrl: string;
  fetchImpl?: typeof fetch;
  timeout?: number;
}

/**
 * A2A Execution Result
 */
export type A2AExecutionResult = Message | Task;

/**
 * A2A Stream Event
 */
export type A2AStreamEvent = 
  | Task
  | { kind: 'status-update'; taskId: string; status: { state: string; timestamp: string } }
  | { kind: 'artifact-update'; taskId: string; artifact: Artifact }
  | Message;
