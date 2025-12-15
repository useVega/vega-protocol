/**
 * x402 Payment Middleware for A2A Agents
 * Integrates x402 payment protocol with A2A agent execution
 */

import { x402ServerExecutor } from 'a2a-x402';
import type {
  AgentExecutor,
  Message,
  Task,
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  x402ExtensionConfig,
} from 'a2a-x402';
import { Logger } from '../utils/logger';
import type { AgentDefinition } from '../types/agent.types';

const logger = new Logger('x402Middleware');

/**
 * Configuration for x402 middleware
 */
export interface X402MiddlewareConfig {
  agent: AgentDefinition;
  merchantWallet?: string;
  network?: string;
  verifyOnChain?: boolean;
}

/**
 * x402 Payment Middleware - wraps agent executor with payment requirements
 */
export class X402PaymentMiddleware extends x402ServerExecutor {
  private agent: AgentDefinition;
  private merchantWallet: string;
  private network: string;
  private verifyOnChain: boolean;

  constructor(
    delegate: AgentExecutor,
    config: X402MiddlewareConfig
  ) {
    // Initialize x402ServerExecutor with config
    const x402Config: Partial<x402ExtensionConfig> = {
      enablePayments: config.agent.pricing.requiresPayment || false,
      defaultPrice: {
        amount: config.agent.pricing.amount,
        currency: config.agent.pricing.token,
      },
    };

    super(delegate, x402Config);

    this.agent = config.agent;
    this.merchantWallet = config.merchantWallet || process.env.MERCHANT_WALLET || '';
    this.network = config.network || config.agent.pricing.paymentNetwork || 'base-sepolia';
    this.verifyOnChain = config.verifyOnChain ?? false;

    if (config.agent.pricing.requiresPayment) {
      logger.info(`💳 Payment middleware enabled for ${config.agent.name}`);
      logger.info(`   Price: ${config.agent.pricing.amount} ${config.agent.pricing.token}`);
      logger.info(`   Network: ${this.network}`);
      logger.info(`   Merchant: ${this.merchantWallet}`);
    }
  }

  /**
   * Get payment requirements for this agent
   */
  getPaymentRequirements(): PaymentRequirements | null {
    if (!this.agent.pricing.requiresPayment) {
      return null;
    }

    const usdcAddresses: Record<string, string> = {
      'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    };

    const usdcAddress = usdcAddresses[this.network] || usdcAddresses['base-sepolia'];

    return {
      scheme: 'exact',
      network: this.network as any,
      asset: usdcAddress,
      payTo: this.merchantWallet,
      maxAmountRequired: this.agent.pricing.amount,
      resource: `/${this.agent.ref}`,
      description: `${this.agent.name} - ${this.agent.description}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: 1200,
    };
  }

  /**
   * Check if payment is provided and valid in message metadata
   */
  checkPaymentInMessage(message: Message): boolean {
    if (!message.metadata) {
      return false;
    }

    const metadata = message.metadata as any;

    // Check if payment proof is present
    if (!metadata.paymentProvided || !metadata.paymentProof) {
      return false;
    }

    // Optional: verify transaction hash if provided
    if (metadata.transactionHash) {
      logger.info(`   Payment transaction: ${metadata.transactionHash}`);
      logger.info(`   Payer: ${metadata.payer || 'unknown'}`);
      
      if (this.verifyOnChain) {
        // TODO: Implement on-chain verification by checking Transfer event
        logger.info('   ⚠️  On-chain verification not yet implemented');
      }
    }

    return true;
  }

  /**
   * Verify payment proof (signature and details)
   */
  async verifyPayment(
    payload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    logger.info('🔍 Verifying payment...');
    logger.info(`   Network: ${requirements.network}`);
    logger.info(`   Amount: ${requirements.maxAmountRequired}`);
    logger.info(`   PayTo: ${requirements.payTo}`);

    // Basic validation
    if (!payload || !payload.authorization) {
      return {
        isValid: false,
        invalidReason: 'Missing payment authorization',
      };
    }

    // Verify network matches
    if (payload.authorization.chainId.toString() !== this.getChainId(requirements.network)) {
      return {
        isValid: false,
        invalidReason: `Network mismatch: expected ${requirements.network}`,
      };
    }

    // Verify amount matches
    if (payload.authorization.value !== requirements.maxAmountRequired) {
      return {
        isValid: false,
        invalidReason: `Amount mismatch: expected ${requirements.maxAmountRequired}, got ${payload.authorization.value}`,
      };
    }

    // Verify recipient matches
    if (payload.authorization.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
      return {
        isValid: false,
        invalidReason: 'Recipient address mismatch',
      };
    }

    logger.info('   ✅ Payment verification passed');

    return {
      isValid: true,
      payer: payload.authorization.from,
    };
  }

  /**
   * Get chain ID for network
   */
  private getChainId(network: string): string {
    const chainIds: Record<string, string> = {
      'base': '8453',
      'base-sepolia': '84532',
    };
    return chainIds[network] || chainIds['base-sepolia'];
  }

  /**
   * Execute with payment check
   */
  async execute(input: Message): Promise<Message | Task> {
    // Check if payment is required
    if (this.agent.pricing.requiresPayment) {
      const hasPayment = this.checkPaymentInMessage(input);

      if (!hasPayment) {
        const requirements = this.getPaymentRequirements();
        if (requirements) {
          logger.info('⚠️  Payment required but not provided');
          const { x402PaymentRequiredException } = await import('a2a-x402');
          throw new x402PaymentRequiredException(
            `Payment required: ${this.agent.pricing.amount} ${this.agent.pricing.token}`,
            requirements
          );
        }
      }

      logger.info('✅ Payment verified, proceeding with execution');
    }

    // Execute the delegate (actual agent logic)
    return super.execute(input);
  }
}

/**
 * Factory function to create x402 middleware-wrapped executor
 */
export function createX402Middleware(
  executor: AgentExecutor,
  agent: AgentDefinition,
  config?: Partial<X402MiddlewareConfig>
): X402PaymentMiddleware {
  return new X402PaymentMiddleware(executor, {
    agent,
    merchantWallet: config?.merchantWallet,
    network: config?.network,
    verifyOnChain: config?.verifyOnChain,
  });
}
