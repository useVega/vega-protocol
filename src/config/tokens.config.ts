/**
 * Token Configuration
 * Defines supported tokens across chains
 */

import type { TokenConfig, TokenSymbol, ChainType } from '../types/chain.types';

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Base Chain Tokens
  'USDC-base': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: '8453',
    isStablecoin: true,
  },
  'USDT-base': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    contractAddress: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    chainId: '8453',
    isStablecoin: true,
  },
  'ETH-base': {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: '8453',
    isStablecoin: false,
  },

  // Arbitrum Tokens
  'USDC-arbitrum': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    chainId: '42161',
    isStablecoin: true,
  },
  'USDT-arbitrum': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    chainId: '42161',
    isStablecoin: true,
  },
  'ETH-arbitrum': {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: '42161',
    isStablecoin: false,
  },

  // Ethereum Mainnet Tokens
  'USDC-ethereum': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '1',
    isStablecoin: true,
  },
  'USDT-ethereum': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: '1',
    isStablecoin: true,
  },
  'ETH-ethereum': {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: '1',
    isStablecoin: false,
  },

  // Solana Tokens
  'USDC-solana': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: 'mainnet-beta',
    isStablecoin: true,
  },
  'SOL-solana': {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    chainId: 'mainnet-beta',
    isStablecoin: false,
  },
};

export function getTokenConfig(token: TokenSymbol, chain: ChainType): TokenConfig | undefined {
  const key = `${token}-${chain}`;
  return TOKEN_CONFIGS[key];
}

export function getSupportedTokens(chain: ChainType): TokenSymbol[] {
  return Object.values(TOKEN_CONFIGS)
    .filter(config => config.chainId === getChainId(chain))
    .map(config => config.symbol);
}

function getChainId(chain: ChainType): string {
  const chainIds: Record<ChainType, string> = {
    base: '8453',
    arbitrum: '42161',
    ethereum: '1',
    solana: 'mainnet-beta',
  };
  return chainIds[chain];
}
