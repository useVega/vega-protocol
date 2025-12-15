/**
 * Agent Registry Types
 * Defines agent metadata, capabilities, and pricing models
 */

import type { ChainType, TokenSymbol } from './chain.types';

export type AgentStatus = 'draft' | 'published' | 'deprecated' | 'suspended';

export type AgentEndpointType = 'http' | 'native';

export type AgentCategory = 
  | 'data-collection' 
  | 'analysis' 
  | 'transformation'
  | 'summarization'
  | 'notification'
  | 'storage'
  | 'ml-inference'
  | 'validation'
  | 'other';

export interface PricingModel {
  type: 'per-call' | 'per-unit' | 'subscription';
  amount: string; // BigNumber as string
  token: TokenSymbol;
  chain: ChainType;
  unit?: string; // e.g., 'per-1000-tokens', 'per-MB'
  requiresPayment?: boolean; // Whether agent demands payment upfront
  paymentNetwork?: string; // e.g., 'base', 'base-sepolia'
}

export interface AgentInputSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface AgentOutputSchema {
  type: 'object';
  properties: Record<string, any>;
}

export interface AgentDefinition {
  ref: string; // Unique identifier (e.g., 'text-summarizer-v1')
  name: string;
  description: string;
  version: string;
  category: AgentCategory;
  status: AgentStatus;
  
  // Identity & Trust
  agentIdOnChain?: string; // ERC-8004 AgentID
  ownerId: string;
  ownerWallet: string;
  
  // Endpoint Configuration
  endpointType: AgentEndpointType;
  endpointUrl?: string; // For HTTP agents
  
  // Pricing
  pricing: PricingModel;
  
  // Schemas
  inputSchema: AgentInputSchema;
  outputSchema: AgentOutputSchema;
  
  // Metadata
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Capabilities
  supportedChains: ChainType[];
  supportedTokens: TokenSymbol[];
}
