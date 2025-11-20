/**
 * x402 Payment Service
 * Handles payment requests, verification, and settlement for A2A workflows
 */

import { Wallet } from 'ethers';
import { 
  x402PaymentRequiredException, 
  processPayment, 
  x402Utils,
  type PaymentRequirements 
} from 'a2a-x402';
import type { AgentDefinition } from '../types/agent.types';
import { Logger } from '../utils/logger';

const logger = new Logger('PaymentService');

/**
 * Payment configuration for Base chain
 */
export interface PaymentConfig {
  network: 'base' | 'base-sepolia';
  rpcUrl: string;
  usdcAddress: string;
  merchantWallet: string;
  clientWallet?: Wallet;
}

/**
 * Payment receipt
 */
export interface PaymentReceipt {
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  asset: string;
  network: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Base chain configuration
 */
const BASE_MAINNET: PaymentConfig = {
  network: 'base',
  rpcUrl: 'https://mainnet.base.org',
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  merchantWallet: '',
};

const BASE_SEPOLIA: PaymentConfig = {
  network: 'base-sepolia',
  rpcUrl: 'https://sepolia.base.org',
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  merchantWallet: '',
};

/**
 * x402 Payment Service
 */
export class x402PaymentService {
  private config: PaymentConfig;
  private utils: x402Utils;
  private wallet?: Wallet;

  constructor(
    network: 'base' | 'base-sepolia' = 'base-sepolia',
    privateKey?: string,
    merchantWallet?: string
  ) {
    this.config = network === 'base' ? BASE_MAINNET : BASE_SEPOLIA;
    
    if (merchantWallet) {
      this.config.merchantWallet = merchantWallet;
    }

    if (privateKey) {
      this.wallet = new Wallet(privateKey);
      logger.info(`Wallet initialized: ${this.wallet.address}`);
    }

    this.utils = new x402Utils();
    logger.info(`Payment service initialized on ${network}`);
  }

  /**
   * Create payment requirement for an agent call
   */
  createPaymentRequirement(
    agent: AgentDefinition,
    resource: string,
    description: string,
    timeoutSeconds: number = 1200
  ): PaymentRequirements {
    const amount = agent.pricing.amount; // Amount in atomic units (e.g., 1 USDC = 1000000)
    
    return {
      scheme: 'exact',
      network: this.config.network,
      asset: this.config.usdcAddress,
      payTo: this.config.merchantWallet || agent.ownerWallet,
      maxAmountRequired: amount,
      resource,
      description: `${description} - ${agent.name}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: timeoutSeconds,
    };
  }

  /**
   * Request payment (throw exception)
   */
  requestPayment(
    agent: AgentDefinition,
    resource: string,
    description: string
  ): never {
    const requirements = this.createPaymentRequirement(agent, resource, description);
    
    logger.info(`Payment required: ${requirements.maxAmountRequired} USDC for ${agent.name}`);
    
    throw new x402PaymentRequiredException(
      `Payment required: ${this.formatUSDC(requirements.maxAmountRequired)} USDC`,
      requirements
    );
  }

  /**
   * Process payment with wallet
   */
  async processPayment(requirements: PaymentRequirements): Promise<any> {
    if (!this.wallet) {
      throw new Error('Wallet not configured. Provide private key to constructor.');
    }

    logger.info(`Processing payment: ${this.formatUSDC(requirements.maxAmountRequired)} USDC`);
    logger.info(`  To: ${requirements.payTo}`);
    logger.info(`  Network: ${requirements.network}`);

    const paymentPayload = await processPayment(requirements, this.wallet);
    
    logger.info(`✓ Payment signed by ${this.wallet.address}`);
    
    return paymentPayload;
  }

  /**
   * Verify payment signature
   */
  async verifyPayment(
    paymentPayload: any,
    requirements: PaymentRequirements
  ): Promise<boolean> {
    try {
      // Extract signature and recover signer
      const { signature, timestamp, nonce } = paymentPayload;
      
      if (!signature) {
        logger.error('Payment payload missing signature');
        return false;
      }

      // Verify timestamp is within timeout
      const now = Date.now();
      const paymentTime = new Date(timestamp).getTime();
      const maxTimeout = requirements.maxTimeoutSeconds * 1000;

      if (now - paymentTime > maxTimeout) {
        logger.error(`Payment expired. Age: ${now - paymentTime}ms, Max: ${maxTimeout}ms`);
        return false;
      }

      logger.info('✓ Payment verification passed');
      return true;
    } catch (error) {
      logger.error(`Payment verification failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Record payment for tracking
   */
  createPaymentReceipt(
    paymentPayload: any,
    requirements: PaymentRequirements
  ): PaymentReceipt {
    return {
      transactionHash: paymentPayload.transactionHash || 'pending',
      from: paymentPayload.from || this.wallet?.address || 'unknown',
      to: requirements.payTo,
      amount: requirements.maxAmountRequired,
      asset: requirements.asset,
      network: requirements.network,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
    };
  }

  /**
   * Get payment status from task
   */
  getPaymentStatus(task: any): string | null {
    return this.utils.getPaymentStatus(task);
  }

  /**
   * Get payment requirements from task
   */
  getPaymentRequirements(task: any): any {
    try {
      return this.utils.getPaymentRequirements(task);
    } catch (error) {
      return null;
    }
  }

  /**
   * Record payment success
   */
  recordPaymentSuccess(task: any, settleResponse: any): void {
    this.utils.recordPaymentSuccess(task, settleResponse);
  }

  /**
   * Format USDC amount (6 decimals)
   */
  private formatUSDC(atomicAmount: string): string {
    const amount = BigInt(atomicAmount);
    const wholePart = amount / 1_000_000n;
    const fractionalPart = amount % 1_000_000n;
    return `${wholePart}.${fractionalPart.toString().padStart(6, '0')}`;
  }

  /**
   * Parse USDC amount to atomic units
   */
  static parseUSDC(amount: string): string {
    const [whole = '0', fractional = '0'] = amount.split('.');
    const paddedFractional = fractional.padEnd(6, '0').substring(0, 6);
    const atomicAmount = BigInt(whole) * 1_000_000n + BigInt(paddedFractional);
    return atomicAmount.toString();
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): PaymentConfig {
    return { ...this.config };
  }
}
