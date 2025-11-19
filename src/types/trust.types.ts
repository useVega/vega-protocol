/**
 * Trust & Reputation Types (ERC-8004)
 * Defines agent identity, reputation scoring, and validation
 */

import type { ChainType } from './chain.types';

export interface AgentIdentity {
  agentId: string; // On-chain AgentID (ERC-721 token ID)
  agentRef: string; // Link to AgentDefinition
  ownerWallet: string;
  
  // Metadata (AgentCard)
  name: string;
  description: string;
  endpoints: string[];
  supportedChains: ChainType[];
  
  // On-chain data
  mintedAt: Date;
  tokenUri: string;
  contractAddress: string;
  chain: ChainType;
}

export interface ReputationScore {
  agentRef: string;
  score: number; // 0-5
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalEarnings: string; // BigNumber as string
  
  // Computed metrics
  successRate: number; // percentage
  averageCost: string;
  
  // Time-based
  lastUpdated: Date;
}

export interface FeedbackEvent {
  feedbackId: string;
  runId: string;
  nodeId: string;
  agentRef: string;
  
  // User feedback
  userId: string;
  rating: number; // 1-5
  comment?: string;
  tags: string[];
  
  // Evidence
  evidenceUri?: string;
  
  // Timestamp
  timestamp: Date;
}

export interface ValidationRecord {
  validationId: string;
  agentRef: string;
  validatorId: string; // Third-party validator
  
  // Validation details
  validationType: 'output-quality' | 'security-audit' | 'tee-attestation' | 'compliance';
  result: 'passed' | 'failed' | 'warning';
  evidenceUri: string;
  
  // Timestamp
  timestamp: Date;
  expiresAt?: Date;
}
