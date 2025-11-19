/**
 * Payment & Settlement Types
 * Defines payment events, budget management, and x402 protocol support
 */

import type { ChainType, TokenSymbol } from './chain.types';

export type PaymentEventType = 
  | 'budget-reserved'
  | 'payment-to-agent'
  | 'platform-fee'
  | 'refund';

export interface PaymentEvent {
  eventId: string;
  runId: string;
  nodeId?: string;
  
  // Payment details
  type: PaymentEventType;
  fromWallet: string;
  toWallet: string;
  amount: string; // BigNumber as string
  token: TokenSymbol;
  chain: ChainType;
  
  // Transaction
  txHash?: string;
  
  // Timestamp
  timestamp: Date;
  
  // Metadata
  agentRef?: string;
  description: string;
}

export interface BudgetReservation {
  reservationId: string;
  runId: string;
  userWallet: string;
  amount: string;
  token: TokenSymbol;
  chain: ChainType;
  status: 'reserved' | 'released' | 'settled';
  createdAt: Date;
}

export interface X402PaymentChallenge {
  amount: string;
  token: TokenSymbol;
  chain: ChainType;
  recipientWallet: string;
  paymentId: string;
  expiresAt: Date;
}

export interface X402PaymentProof {
  paymentId: string;
  txHash: string;
  amount: string;
  token: TokenSymbol;
  chain: ChainType;
  timestamp: Date;
}
