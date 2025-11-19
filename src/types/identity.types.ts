/**
 * Identity & Wallet Types
 * Defines user profiles, developer accounts, and wallet mappings
 */

import type { ChainType, TokenSymbol } from './chain.types';

export interface UserProfile {
  userId: string;
  email?: string;
  walletAddress: string;
  defaultChain: ChainType;
  defaultToken: TokenSymbol;
  
  // Metadata
  createdAt: Date;
  lastLogin: Date;
}

export interface DeveloperProfile extends UserProfile {
  payoutWallet: string;
  payoutChain: ChainType;
  payoutToken: TokenSymbol;
  
  // Stats
  publishedAgents: string[]; // Array of agentRefs
  totalEarnings: string;
}

export interface WalletMapping {
  userId: string;
  walletAddress: string;
  chain: ChainType;
  isPrimary: boolean;
  addedAt: Date;
}
