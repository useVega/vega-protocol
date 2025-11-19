/**
 * Blockchain and Token Types
 * Defines multi-chain and token abstractions
 */

export type ChainType = 'base' | 'arbitrum' | 'solana' | 'ethereum';

export type TokenSymbol = 'USDC' | 'USDT' | 'ETH' | 'SOL';

export interface ChainConfig {
  chainId: string;
  name: string;
  type: ChainType;
  rpcEndpoint: string;
  explorerUrl: string;
  supportedTokens: TokenSymbol[];
  gasToken: TokenSymbol;
}

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  decimals: number;
  contractAddress?: string; // For ERC20 tokens
  chainId: string;
  isStablecoin: boolean;
}
