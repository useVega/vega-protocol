/**
 * Chain Configuration
 * Defines supported blockchain networks
 */

import type { ChainConfig, ChainType } from '../types/chain.types';

export const CHAIN_CONFIGS: Record<ChainType, ChainConfig> = {
  base: {
    chainId: '8453',
    name: 'Base',
    type: 'base',
    rpcEndpoint: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    supportedTokens: ['USDC', 'USDT', 'ETH'],
    gasToken: 'ETH',
  },
  arbitrum: {
    chainId: '42161',
    name: 'Arbitrum One',
    type: 'arbitrum',
    rpcEndpoint: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    supportedTokens: ['USDC', 'USDT', 'ETH'],
    gasToken: 'ETH',
  },
  ethereum: {
    chainId: '1',
    name: 'Ethereum Mainnet',
    type: 'ethereum',
    rpcEndpoint: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    supportedTokens: ['USDC', 'USDT', 'ETH'],
    gasToken: 'ETH',
  },
  solana: {
    chainId: 'mainnet-beta',
    name: 'Solana',
    type: 'solana',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    supportedTokens: ['USDC', 'SOL'],
    gasToken: 'SOL',
  },
};

export function getChainConfig(chain: ChainType): ChainConfig {
  return CHAIN_CONFIGS[chain];
}

export function getSupportedChains(): ChainType[] {
  return Object.keys(CHAIN_CONFIGS) as ChainType[];
}
