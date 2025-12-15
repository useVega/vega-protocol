/**
 * Agent Configuration Loader
 * Fetches agent configuration from registry and provides runtime settings
 */

import { registry } from '../../register-agents';
import type { AgentDefinition } from '../types/agent.types';
import type { PaymentRequirements } from 'a2a-x402';
import { Logger } from '../utils/logger';

const logger = new Logger('AgentConfig');

/**
 * Runtime agent configuration
 */
export interface AgentRuntimeConfig {
  agent: AgentDefinition;
  requiresPayment: boolean;
  paymentRequirements: PaymentRequirements | null;
}

/**
 * Load agent configuration from registry
 */
export async function loadAgentConfig(agentRef: string): Promise<AgentRuntimeConfig> {
  try {
    const agent = await registry.getAgent(agentRef);

    const requiresPayment = agent.pricing.requiresPayment || false;
    
    let paymentRequirements: PaymentRequirements | null = null;
    
    if (requiresPayment) {
      const merchantWallet = process.env.MERCHANT_WALLET || agent.ownerWallet;
      const network = agent.pricing.paymentNetwork || 'base-sepolia';
      
      // Get USDC address for network
      const usdcAddresses: Record<string, string> = {
        'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };
      
      const usdcAddress = usdcAddresses[network] || usdcAddresses['base-sepolia'];

      paymentRequirements = {
        scheme: 'exact',
        network: network as any,
        asset: usdcAddress,
        payTo: merchantWallet,
        maxAmountRequired: agent.pricing.amount,
        resource: `/${agent.ref}`,
        description: `${agent.name} - ${agent.description}`,
        mimeType: 'application/json',
        maxTimeoutSeconds: 1200,
      };

      logger.info(`💰 Payment config loaded for ${agent.name}:`);
      logger.info(`   Price: ${agent.pricing.amount} ${agent.pricing.token}`);
      logger.info(`   Network: ${network}`);
      logger.info(`   Merchant: ${merchantWallet}`);
    } else {
      logger.info(`🆓 ${agent.name} does not require payment`);
    }

    return {
      agent,
      requiresPayment,
      paymentRequirements,
    };
  } catch (error) {
    logger.error(`Failed to load config for ${agentRef}: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get payment requirements from agent definition
 */
export function createPaymentRequirements(
  agent: AgentDefinition,
  merchantWallet?: string
): PaymentRequirements | null {
  if (!agent.pricing.requiresPayment) {
    return null;
  }

  const wallet = merchantWallet || process.env.MERCHANT_WALLET || agent.ownerWallet;
  const network = agent.pricing.paymentNetwork || 'base-sepolia';
  
  const usdcAddresses: Record<string, string> = {
    'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  };
  
  const usdcAddress = usdcAddresses[network] || usdcAddresses['base-sepolia'];

  return {
    scheme: 'exact',
    network: network as any,
    asset: usdcAddress,
    payTo: wallet,
    maxAmountRequired: agent.pricing.amount,
    resource: `/${agent.ref}`,
    description: `${agent.name} - ${agent.description}`,
    mimeType: 'application/json',
    maxTimeoutSeconds: 1200,
  };
}
