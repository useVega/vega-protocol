/**
 * x402 Payment Service
 * Handles payment requests, verification, and settlement for A2A workflows
 * Includes client wallet for payments and merchant facilitator for receiving
 */

import { ethers } from 'ethers';
import { 
  x402PaymentRequiredException, 
  processPayment, 
  x402Utils,
  type PaymentRequirements,
  type PaymentPayload,
  type x402PaymentRequiredResponse
} from 'a2a-x402';
import type { AgentDefinition } from '../types/agent.types';
import { Logger } from '../utils/logger';

const logger = new Logger('PaymentService');

// ERC20 ABI for approve, allowance, transfer, and transferFrom functions
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
];

/**
 * Payment configuration for Base chain
 */
export interface PaymentConfig {
  network: 'base' | 'base-sepolia';
  rpcUrl: string;
  usdcAddress: string;
  merchantWallet: string;
  clientWallet?: ethers.Wallet;
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
 * Client Wallet for making payments
 * Handles payment signing and automatic ERC-20 approval
 */
export abstract class Wallet {
  abstract signPayment(requirements: x402PaymentRequiredResponse): Promise<PaymentPayload>;
}

export class LocalWallet extends Wallet {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(privateKey?: string, rpcUrl?: string) {
    super();

    const key = privateKey || process.env.WALLET_PRIVATE_KEY;
    if (!key) {
      throw new Error('WALLET_PRIVATE_KEY environment variable not set and no privateKey provided');
    }

    const url = rpcUrl ||
                process.env.BASE_SEPOLIA_RPC_URL ||
                'https://sepolia.base.org';

    this.provider = new ethers.JsonRpcProvider(url);
    this.wallet = new ethers.Wallet(key, this.provider);

    logger.info(`👛 Wallet initialized: ${this.wallet.address}`);
  }

  /**
   * Ensure the spender has approval to spend at least the specified amount.
   * Automatically approves if current allowance is insufficient.
   */
  private async ensureApproval(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint
  ): Promise<boolean> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.wallet
      );

      const currentAllowance = await (tokenContract.allowance as any)(
        this.wallet.address,
        spenderAddress
      );

      logger.info(`📋 Current allowance: ${currentAllowance.toString()}, Required: ${amount.toString()}`);

      if (currentAllowance >= amount) {
        logger.info('✅ Sufficient allowance already exists');
        return true;
      }

      logger.info(`🔓 Approving ${spenderAddress} to spend ${amount.toString()} tokens...`);

      const approvalAmount = (amount * BigInt(110)) / BigInt(100);

      const tx = await (tokenContract.approve as any)(spenderAddress, approvalAmount, {
        gasLimit: 100000,
      });

      logger.info(`⏳ Approval transaction sent: ${tx.hash}`);
      logger.info('   Waiting for confirmation...');

      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        logger.info(`✅ Approval successful! TX: ${tx.hash}`);
        return true;
      } else {
        logger.error(`❌ Approval transaction failed. TX: ${tx.hash}`);
        return false;
      }
    } catch (error) {
      logger.error('❌ Error during approval:', error);
      return false;
    }
  }

  /**
   * Signs a payment requirement, automatically handling approval if needed.
   */
  async signPayment(requirements: x402PaymentRequiredResponse): Promise<PaymentPayload> {
    const paymentOption = requirements.accepts[0];
    
    if (!paymentOption) {
      throw new Error('No payment options available in requirements');
    }

    const tokenAddress = paymentOption.asset;
    const merchantAddress = paymentOption.payTo;
    const amountRequired = BigInt(paymentOption.maxAmountRequired);

    logger.info(`\n💳 Payment requested: ${amountRequired.toString()} tokens to ${merchantAddress}`);

    const approved = await this.ensureApproval(tokenAddress, merchantAddress, amountRequired);
    if (!approved) {
      throw new Error('Failed to approve token spending. Payment cannot proceed.');
    }

    logger.info('✅ Token approval confirmed, proceeding with payment signature...');

    const messageToSign = `Chain ID: ${paymentOption.network}
Contract: ${paymentOption.asset}
User: ${this.wallet.address}
Receiver: ${paymentOption.payTo}
Amount: ${paymentOption.maxAmountRequired}
`;

    const signature = await this.wallet.signMessage(messageToSign);

    const authorizationPayload = {
      from: this.wallet.address,
      to: paymentOption.payTo,
      value: paymentOption.maxAmountRequired,
      validAfter: Math.floor(Date.now() / 1000),
      validBefore: Math.floor(Date.now() / 1000) + paymentOption.maxTimeoutSeconds,
      nonce: ethers.hexlify(ethers.randomBytes(32)),
      extra: { message: messageToSign },
    };

    const finalPayload: ExactPaymentPayloadData = {
      authorization: authorizationPayload,
      signature: signature,
    };

    return {
      x402Version: 1,
      scheme: paymentOption.scheme,
      network: paymentOption.network,
      payload: finalPayload,
    };
  }

  /**
   * Execute the actual token transfer after approval and signing.
   * This performs the on-chain USDC transfer from client to merchant.
   */
  async executePayment(
    tokenAddress: string,
    merchantAddress: string,
    amount: bigint
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        this.wallet
      );

      logger.info(`\n💸 Executing payment transfer...`);
      logger.info(`   Amount: ${amount.toString()} tokens`);
      logger.info(`   From: ${this.wallet.address}`);
      logger.info(`   To: ${merchantAddress}`);

      const balance = await (tokenContract.balanceOf as any)(this.wallet.address);
      logger.info(`📊 Current balance: ${balance.toString()} tokens`);

      if (balance < amount) {
        const error = `Insufficient balance. Have ${balance.toString()}, need ${amount.toString()}`;
        logger.error(`❌ ${error}`);
        return { success: false, error };
      }

      const tx = await (tokenContract.transfer as any)(merchantAddress, amount, {
        gasLimit: 100000,
      });

      logger.info(`⏳ Transfer transaction sent: ${tx.hash}`);
      logger.info('   Waiting for confirmation...');

      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        logger.info(`✅ Transfer successful! TX: ${tx.hash}`);
        logger.info(`🎉 Payment of ${amount.toString()} tokens completed!`);
        return { success: true, txHash: tx.hash };
      } else {
        logger.error(`❌ Transfer transaction failed. TX: ${tx.hash}`);
        return { success: false, txHash: tx.hash, error: 'Transaction failed' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Error during transfer:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  getAddress(): string {
    return this.wallet.address;
  }
}

/**
 * Type for the exact payment payload data
 */
interface ExactPaymentPayloadData {
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: number;
    validBefore: number;
    nonce: string;
    extra?: any;
  };
  signature: string;
}

/**
 * Payment Facilitator for Merchant Agents
 * Handles payment verification and settlement
 */
export class PaymentFacilitator {
  private merchantWallet: string;
  private network: string;
  private usdcAddress: string;
  private provider: ethers.JsonRpcProvider;
  private utils: x402Utils;

  constructor(
    merchantWallet: string,
    network: 'base' | 'base-sepolia' = 'base-sepolia',
    rpcUrl?: string
  ) {
    this.merchantWallet = merchantWallet;
    this.network = network;
    
    const config = network === 'base' ? BASE_MAINNET : BASE_SEPOLIA;
    this.usdcAddress = config.usdcAddress;
    
    const url = rpcUrl || config.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(url);
    this.utils = new x402Utils();

    logger.info(`💼 Payment Facilitator initialized for ${merchantWallet}`);
    logger.info(`   Network: ${network}`);
    logger.info(`   USDC: ${this.usdcAddress}`);
  }

  /**
   * Create payment requirement for a service
   */
  createPaymentRequirement(
    amount: string,
    resource: string,
    description: string,
    timeoutSeconds: number = 1200
  ): PaymentRequirements {
    return {
      scheme: 'exact',
      network: this.network as any,
      asset: this.usdcAddress,
      payTo: this.merchantWallet,
      maxAmountRequired: amount,
      resource,
      description,
      mimeType: 'application/json',
      maxTimeoutSeconds: timeoutSeconds,
    };
  }

  /**
   * Throw payment required exception
   */
  requestPayment(
    amount: string,
    resource: string,
    description: string
  ): never {
    const requirements = this.createPaymentRequirement(amount, resource, description);
    
    logger.info(`💰 Payment required: ${this.formatUSDC(amount)} USDC`);
    logger.info(`   Resource: ${resource}`);
    
    throw new x402PaymentRequiredException(
      `Payment required: ${this.formatUSDC(amount)} USDC`,
      requirements
    );
  }

  /**
   * Verify payment signature and details
   */
  async verifyPayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const payload = paymentPayload.payload as ExactPaymentPayloadData;
      
      // Verify network matches
      if (paymentPayload.network !== requirements.network) {
        return { valid: false, error: 'Network mismatch' };
      }

      // Verify payment is to correct address
      if (payload.authorization.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
        return { valid: false, error: 'Recipient address mismatch' };
      }

      // Verify amount
      if (BigInt(payload.authorization.value) < BigInt(requirements.maxAmountRequired)) {
        return { valid: false, error: 'Insufficient payment amount' };
      }

      // Verify timestamp validity
      const now = Math.floor(Date.now() / 1000);
      if (now < payload.authorization.validAfter || now > payload.authorization.validBefore) {
        return { valid: false, error: 'Payment expired or not yet valid' };
      }

      // Verify signature
      const message = payload.authorization.extra?.message || '';
      const recoveredAddress = ethers.verifyMessage(message, payload.signature);
      
      if (recoveredAddress.toLowerCase() !== payload.authorization.from.toLowerCase()) {
        return { valid: false, error: 'Invalid signature' };
      }

      logger.info('✅ Payment verification successful');
      logger.info(`   From: ${payload.authorization.from}`);
      logger.info(`   Amount: ${this.formatUSDC(payload.authorization.value)} USDC`);
      
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Payment verification failed: ${errorMessage}`);
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Check if payment has been received on-chain
   */
  async checkPaymentReceived(
    fromAddress: string,
    amount: bigint,
    blockNumber?: number
  ): Promise<{ received: boolean; txHash?: string }> {
    try {
      const tokenContract = new ethers.Contract(
        this.usdcAddress,
        ['event Transfer(address indexed from, address indexed to, uint256 value)'],
        this.provider
      );

      // Get transfer events
      const filter = (tokenContract.filters as any).Transfer(fromAddress, this.merchantWallet);
      const events = await tokenContract.queryFilter(filter, blockNumber || -1000);

      // Check for matching amount
      for (const event of events) {
        const eventLog = event as any;
        if (eventLog.args && BigInt(eventLog.args[2]) >= amount) {
          logger.info(`✅ Payment received on-chain: ${eventLog.transactionHash}`);
          return { received: true, txHash: eventLog.transactionHash };
        }
      }

      return { received: false };
    } catch (error) {
      logger.error('Error checking payment:', error);
      return { received: false };
    }
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

  getMerchantAddress(): string {
    return this.merchantWallet;
  }
}

/**
 * x402 Payment Service
 * Main service coordinating client wallet and merchant facilitator
 */
export class x402PaymentService {
  private config: PaymentConfig;
  private utils: x402Utils;
  private clientWallet?: LocalWallet;
  private facilitator?: PaymentFacilitator;

  constructor(
    network: 'base' | 'base-sepolia' = 'base-sepolia',
    privateKey?: string,
    merchantWallet?: string
  ) {
    this.config = network === 'base' ? BASE_MAINNET : BASE_SEPOLIA;
    
    if (merchantWallet) {
      this.config.merchantWallet = merchantWallet;
    }

    // Initialize client wallet if private key provided
    if (privateKey) {
      this.clientWallet = new LocalWallet(privateKey, this.config.rpcUrl);
    }

    // Initialize payment facilitator if merchant wallet provided
    if (merchantWallet) {
      this.facilitator = new PaymentFacilitator(merchantWallet, network, this.config.rpcUrl);
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
   * Process payment with client wallet
   */
  async processPayment(requirements: PaymentRequirements): Promise<PaymentPayload> {
    if (!this.clientWallet) {
      throw new Error('Wallet not configured. Provide private key to constructor.');
    }

    logger.info(`Processing payment: ${this.formatUSDC(requirements.maxAmountRequired)} USDC`);
    logger.info(`  To: ${requirements.payTo}`);
    logger.info(`  Network: ${requirements.network}`);

    const paymentPayload = await this.clientWallet.signPayment(requirements as any);
    
    logger.info(`✓ Payment signed by ${this.clientWallet.getAddress()}`);
    
    return paymentPayload;
  }

  /**
   * Execute payment on-chain (actual USDC transfer)
   */
  async executePayment(
    requirements: PaymentRequirements
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.clientWallet) {
      throw new Error('Wallet not configured. Provide private key to constructor.');
    }

    return this.clientWallet.executePayment(
      requirements.asset,
      requirements.payTo,
      BigInt(requirements.maxAmountRequired)
    );
  }

  /**
   * Verify payment signature (merchant side)
   */
  async verifyPayment(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): Promise<boolean> {
    if (!this.facilitator) {
      throw new Error('Payment facilitator not configured. Provide merchant wallet to constructor.');
    }

    const result = await this.facilitator.verifyPayment(paymentPayload, requirements);
    return result.valid;
  }

  /**
   * Record payment for tracking
   */
  createPaymentReceipt(
    paymentPayload: PaymentPayload,
    requirements: PaymentRequirements
  ): PaymentReceipt {
    const payload = paymentPayload.payload as ExactPaymentPayloadData;
    return {
      transactionHash: 'pending',
      from: payload.authorization.from,
      to: requirements.payTo,
      amount: requirements.maxAmountRequired,
      asset: requirements.asset,
      network: requirements.network,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
    };
  }

  /**
   * Get client wallet
   */
  getClientWallet(): LocalWallet | undefined {
    return this.clientWallet;
  }

  /**
   * Get payment facilitator
   */
  getPaymentFacilitator(): PaymentFacilitator | undefined {
    return this.facilitator;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.clientWallet?.getAddress() || null;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): PaymentConfig {
    return { ...this.config };
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
}
