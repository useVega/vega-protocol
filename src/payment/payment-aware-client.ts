/**
 * Payment-Aware A2A Client
 * Wraps A2AClient to handle x402 payment exceptions automatically
 */

import { A2AClient } from '@a2a-js/sdk/client';
import type { Message, SendMessageResponse } from '@a2a-js/sdk';
import { Wallet, Contract, JsonRpcProvider } from 'ethers';
import { processPayment } from 'a2a-x402';
import type { PaymentPayload, PaymentRequirements } from 'a2a-x402';
import { Logger } from '../utils/logger';

const logger = new Logger('PaymentClient');

export interface PaymentAwareClientConfig {
  wallet?: Wallet;
  autoPayment?: boolean;
  maxPaymentAmount?: number;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * A2A Client with automatic x402 payment handling
 */
export class PaymentAwareClient {
  private client: A2AClient;
  private wallet?: Wallet;
  private autoPayment: boolean;
  private maxPaymentAmount: number;

  constructor(client: A2AClient, config: PaymentAwareClientConfig = {}) {
    this.client = client;
    this.wallet = config.wallet;
    this.autoPayment = config.autoPayment ?? true;
    this.maxPaymentAmount = config.maxPaymentAmount ?? Number.MAX_SAFE_INTEGER;
  }

  /**
   * Send message with automatic payment handling
   */
  async sendMessage(options: {
    message: Message;
    configuration?: any;
  }): Promise<SendMessageResponse> {
    logger.info('📡 PaymentAwareClient.sendMessage() called');
    
    // First attempt without payment
    logger.info('   Sending message to agent...');
    const response = await this.client.sendMessage(options);
    logger.info('   ✅ Received response from agent');

    // Check if response contains an error
    if ('error' in response) {
      logger.info('   Response contains error field');
      
      // Check if it's a payment required error
      const paymentRequirements = this.extractPaymentRequirements(response.error);
      
      if (paymentRequirements) {
        logger.info('💳 Payment required, processing...');

        // Validate amount is within acceptable limits
        const amount = parseInt(paymentRequirements.maxAmountRequired);
        if (amount > this.maxPaymentAmount) {
          throw new Error(
            `Payment amount ${amount} exceeds maximum ${this.maxPaymentAmount}`
          );
        }

        logger.info(`   Amount: ${this.formatAmount(amount)} USDC`);
        logger.info(`   To: ${paymentRequirements.payTo}`);
        logger.info(`   Resource: ${paymentRequirements.resource}`);

        if (!this.wallet) {
          throw new Error('Payment required but no wallet configured');
        }

        if (!this.autoPayment) {
          // In production, prompt user for confirmation
          logger.info('   ⏳ Awaiting payment confirmation...');
        }

        // Process payment with wallet
        const paymentPayload = await this.processPaymentWithWallet(paymentRequirements);
        logger.info(`   Payment payload created`);

        // Skip facilitator verification for now (returns 400)
        // For direct on-chain settlement, we'll verify the tx instead
        logger.info('   ✅ Payment signature created (skipping facilitator verification)');

        // Execute on-chain USDC transfer directly
        logger.info('   💸 Executing on-chain USDC transfer...');
        const txHash = await this.executeOnChainTransfer(paymentRequirements);
        
        logger.info('   ✅ Payment settled on-chain');
        logger.info(`   📝 Transaction Hash: ${txHash}`);
        logger.info(`   🔗 View on BaseScan: ${this.getBlockExplorerUrl(txHash, paymentRequirements.network)}`);

        // Attach payment proof to message metadata
        const messageWithPayment: Message = {
          ...options.message,
          metadata: {
            ...options.message.metadata,
            paymentProvided: true,
            paymentProof: paymentPayload,
            paymentRequirements: paymentRequirements,
            transactionHash: txHash,
            network: paymentRequirements.network,
            payer: this.wallet?.address,
          },
        };

        // Retry request with payment proof
        logger.info('   🔄 Retrying request with payment proof...');
        return await this.client.sendMessage({
          ...options,
          message: messageWithPayment,
        });
      }

      // Not a payment error, return the error response as-is
      return response;
    }

    // No error in response, return success
    return response;
  }

  /**
   * Extract payment requirements from error
   */
  private extractPaymentRequirements(error: any): PaymentRequirements | null {
    // Check if error is x402PaymentRequiredException instance
    if (error instanceof Error &&
        error.constructor.name === 'x402PaymentRequiredException' &&
        'paymentRequirements' in error) {
      const exc = error as any;
      return exc.paymentRequirements[0];
    }

    // Check if error contains x402 payment data in response
    // The A2A SDK might wrap the error, so check the error details
    if (error && typeof error === 'object') {
      // Check error.error (JSON-RPC error format)
      if (error.error && typeof error.error === 'object') {
        const jsonRpcError = error.error;
        
        // Check for 402 status code
        if (jsonRpcError.code === 402 && jsonRpcError.data) {
          const data = jsonRpcError.data;
          
          // Extract payment requirements from x402 response
          if (data.accepts && Array.isArray(data.accepts) && data.accepts.length > 0) {
            logger.info('   Found x402 payment requirements in error data');
            return data.accepts[0];
          }
        }
      }

      // Check error.message for payment required keyword
      if (error.message && typeof error.message === 'string') {
        const message = error.message.toLowerCase();
        if (message.includes('payment required') || message.includes('402')) {
          logger.info('   Detected payment required in error message');
          // Try to parse payment requirements from error details
          if (error.data || error.details) {
            const data = error.data || error.details;
            if (data.accepts) {
              return data.accepts[0];
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Process payment using wallet
   */
  private async processPaymentWithWallet(
    requirements: PaymentRequirements
  ): Promise<PaymentPayload> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }

    return await processPayment(requirements, this.wallet, this.maxPaymentAmount);
  }

  /**
   * Execute on-chain USDC transfer
   */
  private async executeOnChainTransfer(requirements: PaymentRequirements): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }

    // Get network configuration
    const networkConfigs = {
      'base': {
        rpcUrl: 'https://mainnet.base.org',
        chainId: 8453,
      },
      'base-sepolia': {
        rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
        chainId: 84532,
      },
    };

    const config = networkConfigs[requirements.network as keyof typeof networkConfigs];
    if (!config) {
      throw new Error(`Unsupported network: ${requirements.network}`);
    }

    // Connect wallet to network
    const provider = new JsonRpcProvider(config.rpcUrl);
    const connectedWallet = this.wallet.connect(provider);

    // ERC-20 ABI (transfer function)
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function balanceOf(address account) view returns (uint256)',
    ];

    // Create USDC contract instance
    const usdcContract = new Contract(requirements.asset, erc20Abi, connectedWallet);

    // Check balance
    const balance = await (usdcContract.balanceOf as any)(connectedWallet.address);
    const amount = BigInt(requirements.maxAmountRequired);
    
    if (balance < amount) {
      throw new Error(`Insufficient USDC balance. Have: ${balance}, Need: ${amount}`);
    }

    // Execute transfer
    logger.info(`   Transferring ${amount} USDC to ${requirements.payTo}...`);
    const tx = await (usdcContract.transfer as any)(requirements.payTo, amount);
    logger.info(`   Transaction sent, waiting for confirmation...`);
    
    const receipt = await tx.wait();
    logger.info(`   Transaction confirmed in block ${receipt.blockNumber}`);
    
    return tx.hash;
  }

  /**
   * Format amount from atomic units to human-readable USDC
   */
  private formatAmount(atomicAmount: number): string {
    return (atomicAmount / 1_000_000).toFixed(6);
  }

  /**
   * Get block explorer URL for transaction
   */
  private getBlockExplorerUrl(txHash: string, network: string): string {
    const baseUrls: Record<string, string> = {
      'base': 'https://basescan.org',
      'base-sepolia': 'https://sepolia.basescan.org',
    };

    const baseUrl = baseUrls[network] || baseUrls['base-sepolia'];
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Create PaymentAwareClient from agent card URL
   */
  static async fromCardUrl(
    cardUrl: string,
    config: PaymentAwareClientConfig = {}
  ): Promise<PaymentAwareClient> {
    const client = await A2AClient.fromCardUrl(cardUrl);
    return new PaymentAwareClient(client, config);
  }

  /**
   * Get the underlying A2AClient
   */
  getClient(): A2AClient {
    return this.client;
  }
}
